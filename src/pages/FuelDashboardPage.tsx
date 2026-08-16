import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Fuel,
  Gauge,
  SearchX,
  SlidersHorizontal,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { GovHeader } from "@/components/layout/GovHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useSubdivisions, useMachines } from "@/lib/queries/masterData";
import { useFuelPerformance } from "@/lib/queries/fuelPerformance";
import type { MachineCategory } from "@/types/database";

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

export function FuelDashboardPage() {
  const { data: subdivisions = [] } = useSubdivisions();
  const { data: machines = [] } = useMachines();

  const [subdivisionId, setSubdivisionId] = useState("");
  const [category, setCategory] = useState<MachineCategory | "">("");
  const [machineId, setMachineId] = useState("");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayIso());
  const [queryEnabled, setQueryEnabled] = useState(false);

  const machineOptions = useMemo(
    () => machines.filter((m) => m.subdivision_id === subdivisionId && m.category === category),
    [machines, subdivisionId, category]
  );

  const { data: rows, isFetching } = useFuelPerformance({
    subdivisionId,
    category: category || null,
    machineId: machineId || null,
    from,
    to,
    enabled: queryEnabled,
  });

  const row = rows?.find((r) => r.machine_id === machineId);

  function handleAnalyze() {
    if (!subdivisionId || !machineId) {
      toast.error("कृपया उपविभाग व सयंत्र निवडा");
      return;
    }
    setQueryEnabled(true);
  }

  let status: "good" | "warn" | "bad" = "good";
  let statusText = "-";

  if (row) {
    if (row.category === "Machine") {
      if (row.actual > row.expected * 1.1) {
        status = "bad";
        statusText = "जास्त";
      } else if (row.actual > row.expected) {
        status = "warn";
        statusText = "किंचित जास्त";
      } else {
        statusText = "चांगले";
      }
    } else {
      if (row.actual < row.expected * 0.9) {
        status = "bad";
        statusText = "खूप कमी";
      } else if (row.actual < row.expected) {
        status = "warn";
        statusText = "कमी";
      } else {
        statusText = "चांगले";
      }
    }
  }

  const statusColor =
    status === "good" ? "text-success" : status === "warn" ? "text-warning" : "text-destructive";
  const StatusIcon = !row ? Gauge : status === "good" ? CheckCircle2 : status === "warn" ? AlertTriangle : XCircle;

  const chartData = row
    ? [
        { name: "अपेक्षित", value: row.expected },
        { name: "प्रत्यक्ष", value: row.actual },
      ]
    : [];

  const hasSearched = queryEnabled && !isFetching;
  const noDataFound = hasSearched && !row;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10">
      <GovHeader title="इंधन कार्यक्षमता डॅशबोर्ड" showSubtitle={false} />

      <div className="mb-5 flex items-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-primary">
        <Filter className="size-4 shrink-0" />
        उपविभाग, सयंत्र व दिनांक निवडून इंधन कार्यक्षमता विश्लेषण पहा.
      </div>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <SlidersHorizontal className="size-4.5" />
            फिल्टर
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:items-end">
          <div className="space-y-1.5">
            <Label>उपविभाग</Label>
            <Select
              value={subdivisionId}
              onValueChange={(v) => {
                setSubdivisionId(v);
                setMachineId("");
                setQueryEnabled(false);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="उपविभाग निवडा" />
              </SelectTrigger>
              <SelectContent>
                {subdivisions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>प्रकार</Label>
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v as MachineCategory);
                setMachineId("");
                setQueryEnabled(false);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="प्रकार निवडा" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Machine">मशीन</SelectItem>
                <SelectItem value="Vehicle">वाहन</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>सयंत्र</Label>
            <Select
              value={machineId}
              onValueChange={(v) => {
                setMachineId(v);
                setQueryEnabled(false);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="सयंत्र निवडा" />
              </SelectTrigger>
              <SelectContent>
                {machineOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.machine_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:contents">
            <div className="space-y-1.5">
              <Label>पासून दिनांक</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>पर्यंत दिनांक</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <Button size="lg" className="w-full" onClick={handleAnalyze} disabled={isFetching}>
            {isFetching ? "लोड होत आहे..." : "विश्लेषण पहा"}
          </Button>
        </CardContent>
      </Card>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card>
          <CardContent className="text-center">
            <Gauge className="mx-auto mb-1 size-4 text-muted-foreground" />
            <h3 className="text-xs font-medium text-muted-foreground">अपेक्षित सरासरी</h3>
            <p className="mt-1 text-2xl font-bold">{row ? row.expected.toFixed(2) : "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <Activity className="mx-auto mb-1 size-4 text-muted-foreground" />
            <h3 className="text-xs font-medium text-muted-foreground">प्रत्यक्ष सरासरी</h3>
            <p className="mt-1 text-2xl font-bold">{row ? row.actual.toFixed(2) : "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <TrendingUp className="mx-auto mb-1 size-4 text-muted-foreground" />
            <h3 className="text-xs font-medium text-muted-foreground">एकूण तास / किमी</h3>
            <p className="mt-1 text-2xl font-bold">{row ? row.hours.toFixed(1) : "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <Fuel className="mx-auto mb-1 size-4 text-muted-foreground" />
            <h3 className="text-xs font-medium text-muted-foreground">एकूण डिझेल</h3>
            <p className="mt-1 text-2xl font-bold">{row ? row.diesel.toFixed(1) : "-"}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="text-center">
            <StatusIcon className={`mx-auto mb-1 size-4 ${row ? statusColor : "text-muted-foreground"}`} />
            <h3 className="text-xs font-medium text-muted-foreground">स्थिती</h3>
            <p className={`mt-1 text-2xl font-bold ${row ? statusColor : ""}`}>{statusText}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <TrendingUp className="size-4.5" />
            अपेक्षित वि. प्रत्यक्ष कार्यक्षमता
          </CardTitle>
        </CardHeader>
        <CardContent>
          {row ? (
            <div className="h-64 w-full sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                  <YAxis width={36} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]}>
                    <LabelList
                      dataKey="value"
                      position="top"
                      formatter={(v: unknown) => (typeof v === "number" ? v.toFixed(2) : "")}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground sm:h-80">
              {noDataFound ? (
                <>
                  <SearchX className="size-8" />
                  <p className="text-sm font-medium">या कालावधीसाठी नोंदी आढळल्या नाहीत</p>
                  <p className="text-xs">वेगळा दिनांक किंवा सयंत्र निवडून पुन्हा प्रयत्न करा.</p>
                </>
              ) : (
                <>
                  <Filter className="size-8" />
                  <p className="text-sm font-medium">विश्लेषण अद्याप पाहिलेले नाही</p>
                  <p className="text-xs">वरील फिल्टर निवडून "विश्लेषण पहा" दाबा.</p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
