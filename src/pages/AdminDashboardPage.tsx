import { useState } from "react";
import { toast } from "sonner";
import { BarChart3, ClipboardCheck, Download, Loader2, MapPin, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useSubdivisions } from "@/lib/queries/masterData";
import { supabase } from "@/lib/supabaseClient";
import { buildMachineReport } from "@/lib/excel/buildMachineReport";
import { buildGpsReport } from "@/lib/excel/buildGpsReport";
import { buildAttendanceReport } from "@/lib/excel/buildAttendanceReport";
import { buildPendingReport } from "@/lib/excel/buildPendingReport";
import type { Attendance, GpsLog, PendingPayment, WorkLog } from "@/types/database";

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

type ReportType = "machine" | "gps" | "attendance" | "pending";

const reportCards: { type: ReportType; label: string; icon: typeof BarChart3 }[] = [
  { type: "machine", label: "सयंत्राच्या तास / किमी चा अहवाल", icon: BarChart3 },
  { type: "gps", label: "GPS अहवाल", icon: MapPin },
  { type: "attendance", label: "हजेरी अहवाल", icon: ClipboardCheck },
  { type: "pending", label: "प्रलंबित रकमेचा अहवाल", icon: Wallet },
];

export function AdminDashboardPage() {
  const { profile } = useAuth();
  const { data: subdivisions = [] } = useSubdivisions();
  const [ranges, setRanges] = useState<Record<ReportType, { from: string; to: string }>>({
    machine: { from: monthStart(), to: todayIso() },
    gps: { from: monthStart(), to: todayIso() },
    attendance: { from: monthStart(), to: todayIso() },
    pending: { from: monthStart(), to: todayIso() },
  });
  const [downloading, setDownloading] = useState<ReportType | null>(null);

  const subdivisionId = profile?.subdivision_id ?? null;
  const subdivisionName = subdivisions.find((s) => s.id === subdivisionId)?.name ?? "All";

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

    setDownloading(type);
    try {
      if (type === "machine") {
        const { data, error } = await supabase
          .from("work_logs")
          .select("*, machines(machine_name, machine_type, category), staff(name), projects(project_name, work_type)")
          .eq("subdivision_id", subdivisionId)
          .gte("work_date", from)
          .lte("work_date", to)
          .order("work_date");
        if (error) throw error;
        await buildMachineReport(
          data as (WorkLog & {
            machines: { machine_name: string; machine_type: string; category: string } | null;
            staff: { name: string } | null;
            projects: { project_name: string; work_type: string } | null;
          })[],
          subdivisionName
        );
      } else if (type === "gps") {
        const { data, error } = await supabase
          .from("gps_logs")
          .select("*, machines(machine_name)")
          .eq("subdivision_id", subdivisionId)
          .gte("recorded_at", from)
          .lte("recorded_at", to)
          .order("recorded_at");
        if (error) throw error;
        await buildGpsReport(data as (GpsLog & { machines: { machine_name: string } | null })[], subdivisionName);
      } else if (type === "attendance") {
        const { data, error } = await supabase
          .from("attendance")
          .select("*, staff(name, role)")
          .eq("subdivision_id", subdivisionId)
          .gte("attendance_date", from)
          .lte("attendance_date", to)
          .order("attendance_date");
        if (error) throw error;
        await buildAttendanceReport(
          data as (Attendance & { staff: { name: string; role: string } | null })[],
          subdivisionName
        );
      } else {
        const { data, error } = await supabase
          .from("pending_payments")
          .select("*")
          .eq("subdivision_id", subdivisionId)
          .gte("due_date", from)
          .lte("due_date", to)
          .order("due_date");
        if (error) throw error;
        await buildPendingReport(data as PendingPayment[], subdivisionName);
      }
      toast.success("अहवाल डाउनलोड झाला!");
    } catch {
      toast.error("Report generate करताना समस्या आली.");
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
