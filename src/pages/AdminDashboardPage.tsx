import { useState } from "react";
import { toast } from "sonner";
import { BarChart3, ClipboardCheck, Download, Fuel, Loader2, MapPin, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useMachines, useSubdivisions } from "@/lib/queries/masterData";
import { supabase } from "@/lib/supabaseClient";
import { buildMachineReport } from "@/lib/excel/buildMachineReport";
import { buildGpsReport } from "@/lib/excel/buildGpsReport";
import { buildAttendanceReport } from "@/lib/excel/buildAttendanceReport";
import { buildPendingReport } from "@/lib/excel/buildPendingReport";
import { buildFuelReport } from "@/lib/excel/buildFuelReport";
import { buildProgressReport } from "@/lib/excel/buildProgressReport";
import { buildGpsDiffMap } from "@/lib/gpsSeries";
import type { GpsReading, WorkLog } from "@/types/database";

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

// Earthwork seasons are tracked from 1 July of a given year through the
// following June, matching the subdivision's own manual progress-report
// convention — the "from" date picks which season's 1 July counts as start.
function seasonStartFor(fromIso: string) {
  const [y, m] = fromIso.split("-").map(Number);
  const seasonYear = m >= 7 ? y : y - 1;
  return `${seasonYear}-07-01`;
}

const PAGE_SIZE = 1000;

// A season can span thousands of work logs, well past PostgREST's default
// 1000-row cap — page through with .range() so nothing past row 1000 gets
// silently dropped.
async function fetchAllWorkLogs(select: string, subdivisionId: string, from: string, to: string) {
  const all: ProgressRow[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("work_logs")
      .select(select)
      .eq("subdivision_id", subdivisionId)
      .eq("status", "approved")
      .gte("work_date", from)
      .lte("work_date", to)
      .order("work_date")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as unknown as ProgressRow[];
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

type ReportType = "machine" | "gps" | "attendance" | "pending" | "fuel" | "progress";

type WorkLogRow = WorkLog & {
  machines: { machine_name: string; machine_type: string; category: string } | null;
  staff: { name: string } | null;
  projects: { project_name: string; work_type: string } | null;
};

type ProgressRow = WorkLog & {
  machines: {
    machine_name: string;
    machine_type: string;
    category: string;
    capacity: number | null;
    rate: number | null;
  } | null;
  projects: { project_name: string } | null;
};

const reportCards: { type: ReportType; label: string; icon: typeof BarChart3 }[] = [
  { type: "machine", label: "सयंत्राच्या तास / किमी चा अहवाल", icon: BarChart3 },
  { type: "gps", label: "GPS अहवाल", icon: MapPin },
  { type: "attendance", label: "हजेरी अहवाल", icon: ClipboardCheck },
  { type: "pending", label: "प्रलंबित रकमेचा अहवाल", icon: Wallet },
  { type: "fuel", label: "इंधन वापर अहवाल", icon: Fuel },
  { type: "progress", label: "प्रगती अहवाल", icon: TrendingUp },
];

export function AdminDashboardPage() {
  const { profile } = useAuth();
  const { data: subdivisions = [] } = useSubdivisions();
  const { data: machines = [] } = useMachines();
  const [ranges, setRanges] = useState<Record<ReportType, { from: string; to: string }>>({
    machine: { from: monthStart(), to: todayIso() },
    gps: { from: monthStart(), to: todayIso() },
    attendance: { from: monthStart(), to: todayIso() },
    pending: { from: monthStart(), to: todayIso() },
    fuel: { from: monthStart(), to: todayIso() },
    progress: { from: monthStart(), to: todayIso() },
  });
  const [downloading, setDownloading] = useState<ReportType | null>(null);

  const subdivisionId = profile?.subdivision_id ?? null;
  const subdivisionName = subdivisions.find((s) => s.id === subdivisionId)?.name ?? "All";
  const subdivisionMachines = machines.filter((m) => m.subdivision_id === subdivisionId);

  function updateRange(type: ReportType, field: "from" | "to", value: string) {
    setRanges((r) => ({ ...r, [type]: { ...r[type], [field]: value } }));
  }

  async function downloadReport(type: ReportType) {
    if (!subdivisionId) {
      toast.error("उपविभाग सापडला नाही");
      return;
    }
    const { from, to } = ranges[type];
    if (!from || !to) {
      toast.error("कृपया दिनांक निवडा.");
      return;
    }
    if (subdivisionMachines.length === 0) {
      toast.error("सयंत्र माहिती अजून लोड होत आहे, कृपया थोड्या वेळाने प्रयत्न करा.");
      return;
    }

    setDownloading(type);
    try {
      if (type === "progress") {
        const seasonStart = seasonStartFor(from);
        const progressRows = await fetchAllWorkLogs(
          "*, machines(machine_name, machine_type, category, capacity, rate), projects(project_name)",
          subdivisionId,
          seasonStart,
          to
        );
        await buildProgressReport(progressRows, subdivisionName, seasonStart, from, to);
        toast.success("अहवाल डाउनलोड झाला!");
        return;
      }

      const { data: workLogData, error } = await supabase
        .from("work_logs")
        .select("*, machines(machine_name, machine_type, category), staff(name), projects(project_name, work_type)")
        .eq("subdivision_id", subdivisionId)
        .eq("status", "approved")
        .gte("work_date", from)
        .lte("work_date", to)
        .order("work_date");
      if (error) throw error;
      const rows = workLogData as WorkLogRow[];

      if (type === "machine" || type === "gps") {
        const { data: gpsData, error: gpsError } = await supabase
          .from("gps_readings")
          .select("*")
          .eq("subdivision_id", subdivisionId);
        if (gpsError) throw gpsError;
        const gpsDiffMap = buildGpsDiffMap(gpsData as GpsReading[]);

        if (type === "machine") {
          await buildMachineReport(rows, subdivisionMachines, gpsDiffMap, subdivisionName, from, to);
        } else {
          await buildGpsReport(rows, subdivisionMachines, gpsDiffMap, subdivisionName, from, to);
        }
      } else if (type === "attendance") {
        await buildAttendanceReport(rows, subdivisionMachines, subdivisionName, from, to);
      } else if (type === "pending") {
        await buildPendingReport(rows, subdivisionMachines, subdivisionName, from, to);
      } else {
        await buildFuelReport(rows, subdivisionMachines, subdivisionName, from, to);
      }
      toast.success("अहवाल डाउनलोड झाला!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.startsWith("No")) {
        toast.error("या कालावधीसाठी नोंदी आढळल्या नाहीत.");
      } else {
        toast.error("Report generate करताना समस्या आली.");
      }
    } finally {
      setDownloading(null);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {reportCards.map((card) => (
          <Card key={card.type}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <card.icon className="size-4.5" />
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">पासून</Label>
                  <Input
                    type="date"
                    value={ranges[card.type].from}
                    onChange={(e) => updateRange(card.type, "from", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">पर्यंत</Label>
                  <Input
                    type="date"
                    value={ranges[card.type].to}
                    onChange={(e) => updateRange(card.type, "to", e.target.value)}
                  />
                </div>
              </div>
              <Button
                className="w-full"
                disabled={downloading === card.type}
                onClick={() => downloadReport(card.type)}
              >
                {downloading === card.type ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                {downloading === card.type ? "तयार होत आहे..." : "डाउनलोड करा"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
