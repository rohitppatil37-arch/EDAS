import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Filter, Fuel, Gauge, SlidersHorizontal, Truck } from "lucide-react";
import { GovHeader } from "@/components/layout/GovHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSubdivisions, useProjects } from "@/lib/queries/masterData";
import { useMachineDieselTotal, useMachineEarthworkProgress } from "@/lib/queries/earthworkProgress";
import type { MachineDieselRow, MachineEarthworkProgressRow } from "@/types/database";

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

function shortSubdivisionLabel(name: string) {
  const parts = name.split(",");
  return parts[parts.length - 1]?.trim() || name;
}

function volumeFmt(n: number) {
  return `${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })} घ.मी.`;
}

function dieselFmt(n: number) {
  return `${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })} लिटर`;
}

function truncateLabel(s: string, max = 16) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// Generic "one metric per named machine" horizontal bar chart — used for both the
// earthwork-volume sections (Tipper/Excavator) and the diesel-per-machine section,
// since they're the same shape: a single magnitude compared across named categories.
interface MetricChartDatum {
  name: string;
  value: number;
  detail: string;
}

function MetricTooltip({
  active,
  payload,
  valueFmt,
}: {
  active?: boolean;
  payload?: { payload: MetricChartDatum }[];
  valueFmt?: (n: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-popover-foreground">{d.name}</p>
      <p className="text-muted-foreground">{d.detail}</p>
      <p className="font-semibold text-primary">{valueFmt ? valueFmt(d.value) : d.value}</p>
    </div>
  );
}

function MetricBarChart({ data, valueFmt }: { data: MetricChartDatum[]; valueFmt: (n: number) => string }) {
  const height = data.length * 40 + 24;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 44, left: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke="var(--color-border)" />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={112}
            tickFormatter={(v: string) => truncateLabel(v)}
            tick={{ fontSize: 11, fill: "var(--color-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<MetricTooltip valueFmt={valueFmt} />} cursor={{ fill: "var(--color-accent)" }} />
          <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 4, 4, 0]} barSize={18}>
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v: unknown) => (typeof v === "number" ? v.toLocaleString("en-IN", { maximumFractionDigits: 1 }) : "")}
              style={{ fontSize: 11, fill: "var(--color-foreground)" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProgressSection({
  icon: Icon,
  title,
  rows,
  quantityLabel,
  quantityOf,
  unitSuffix,
  emptyText,
}: {
  icon: typeof Truck;
  title: string;
  rows: MachineEarthworkProgressRow[];
  quantityLabel: string;
  quantityOf: (row: MachineEarthworkProgressRow) => number;
  unitSuffix: string;
  emptyText: string;
}) {
  const [filterId, setFilterId] = useState("");
  const filtered = filterId ? rows.filter((r) => r.machine_id === filterId) : rows;
  const totalVolume = filtered.reduce((sum, r) => sum + quantityOf(r) * (r.capacity ?? 0), 0);
  const missingCapacity = filtered.some((r) => r.capacity == null && quantityOf(r) > 0);

  const chartData = useMemo(
    () =>
      filtered
        .map((r) => ({
          name: r.machine_name,
          value: quantityOf(r) * (r.capacity ?? 0),
          detail: `${quantityLabel}: ${quantityOf(r)} ${unitSuffix} · क्षमता: ${r.capacity ?? "-"}`,
        }))
        .sort((a, b) => b.value - a.value),
    [filtered, quantityOf, quantityLabel, unitSuffix]
  );

  useEffect(() => {
    setFilterId("");
  }, [rows]);

  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Icon className="size-4.5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <>
            {rows.length > 1 && (
              <Select value={filterId || "all"} onValueChange={(v) => setFilterId(v === "all" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">सर्व ({rows.length})</SelectItem>
                  {rows.map((r) => (
                    <SelectItem key={r.machine_id} value={r.machine_id}>
                      {r.machine_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="rounded-lg border bg-accent/60 px-4 py-3 text-center">
              <p className="text-xs font-medium text-muted-foreground">एकूण मातीकाम</p>
              <p className="mt-1 text-2xl font-bold text-primary">{volumeFmt(totalVolume)}</p>
            </div>

            {missingCapacity && (
              <p className="flex items-center gap-1.5 text-xs text-warning">
                <AlertTriangle className="size-3.5 shrink-0" />
                काही सयंत्रांची क्षमता नोंदवलेली नाही (अ‍ॅडमिन पेजवरून भरा) — त्यांचे मातीकाम गणनेत धरले नाही.
              </p>
            )}

            {chartData.length > 1 && <MetricBarChart data={chartData} valueFmt={volumeFmt} />}

            <details className="group">
              <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                तपशीलवार यादी पहा ({filtered.length})
              </summary>
              <div className="mt-2 space-y-2">
                {filtered.map((r) => (
                  <div key={r.machine_id} className="rounded-lg border p-3 text-sm">
                    <p className="text-balance font-medium leading-snug">{r.machine_name}</p>
                    <div className="mt-1.5 flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        {quantityLabel}: {quantityOf(r)} {unitSuffix} · क्षमता: {r.capacity ?? "-"}
                      </p>
                      <span className="shrink-0 font-semibold text-primary">
                        {volumeFmt(quantityOf(r) * (r.capacity ?? 0))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DieselSection({ rows }: { rows: MachineDieselRow[] }) {
  const [filterId, setFilterId] = useState("");
  const filtered = filterId ? rows.filter((r) => r.machine_id === filterId) : rows;
  const totalDiesel = filtered.reduce((sum, r) => sum + r.total_diesel, 0);

  const chartData = useMemo(
    () =>
      filtered
        .map((r) => ({
          name: r.machine_name,
          value: r.total_diesel,
          detail: r.category === "Vehicle" ? "वाहन" : "मशीन",
        }))
        .sort((a, b) => b.value - a.value),
    [filtered]
  );

  useEffect(() => {
    setFilterId("");
  }, [rows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Fuel className="size-4.5" />
          घेतलेले डिझेल
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            या कालावधीत या प्रकल्पावर डिझेलची नोंद आढळली नाही.
          </p>
        ) : (
          <>
            {rows.length > 1 && (
              <Select value={filterId || "all"} onValueChange={(v) => setFilterId(v === "all" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">सर्व ({rows.length})</SelectItem>
                  {rows.map((r) => (
                    <SelectItem key={r.machine_id} value={r.machine_id}>
                      {r.machine_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="rounded-lg border bg-accent/60 px-4 py-3 text-center">
              <p className="text-xs font-medium text-muted-foreground">या प्रकल्पासाठी एकूण डिझेल</p>
              <p className="mt-1 text-2xl font-bold text-primary">{dieselFmt(totalDiesel)}</p>
            </div>

            {chartData.length > 1 && <MetricBarChart data={chartData} valueFmt={dieselFmt} />}

            <details className="group">
              <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                तपशीलवार यादी पहा ({filtered.length})
              </summary>
              <div className="mt-2 space-y-2">
                {filtered.map((r) => (
                  <div key={r.machine_id} className="rounded-lg border p-3 text-sm">
                    <p className="text-balance font-medium leading-snug">{r.machine_name}</p>
                    <div className="mt-1.5 flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">{r.category === "Vehicle" ? "वाहन" : "मशीन"}</p>
                      <span className="shrink-0 font-semibold text-primary">{dieselFmt(r.total_diesel)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function ProgressDashboardPage() {
  const { data: subdivisions = [] } = useSubdivisions();
  const { data: projects = [] } = useProjects();

  const [activeSubdivision, setActiveSubdivision] = useState("");
  const [projectId, setProjectId] = useState("");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayIso());
  const [queryEnabled, setQueryEnabled] = useState(false);

  useEffect(() => {
    if (!activeSubdivision && subdivisions.length > 0) {
      setActiveSubdivision(subdivisions[0].id);
    }
  }, [subdivisions, activeSubdivision]);

  const subdivisionProjects = useMemo(
    () => projects.filter((p) => p.subdivision_id === activeSubdivision),
    [projects, activeSubdivision]
  );

  function handleTabChange(id: string) {
    setActiveSubdivision(id);
    setProjectId("");
    setQueryEnabled(false);
  }

  function handleAnalyze() {
    if (!projectId) {
      toast.error("कृपया प्रकल्प निवडा");
      return;
    }
    setQueryEnabled(true);
  }

  const tipperQuery = useMachineEarthworkProgress({
    projectId,
    category: "Vehicle",
    machineType: "टिप्पर",
    from,
    to,
    enabled: queryEnabled,
  });
  const excavatorQuery = useMachineEarthworkProgress({
    projectId,
    category: "Machine",
    machineType: "डोझर/एस्कॅव्हेटर",
    from,
    to,
    enabled: queryEnabled,
  });
  const dieselQuery = useMachineDieselTotal({ projectId, from, to, enabled: queryEnabled });

  const hasResults = queryEnabled && !!projectId;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10">
      <GovHeader title="मातीकाम प्रगती डॅशबोर्ड" showSubtitle={false} />

      <div className="mb-5 flex items-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-primary">
        <Filter className="size-4 shrink-0" />
        उपविभाग व प्रकल्प निवडून मातीकाम प्रगती पहा.
      </div>

      <Tabs value={activeSubdivision} onValueChange={handleTabChange} className="mb-5">
        <TabsList className="grid w-full grid-cols-3">
          {subdivisions.map((s) => (
            <TabsTrigger key={s.id} value={s.id}>
              {shortSubdivisionLabel(s.name)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <SlidersHorizontal className="size-4.5" />
            फिल्टर
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>प्रकल्प</Label>
            <Select
              value={projectId}
              onValueChange={(v) => {
                setProjectId(v);
                setQueryEnabled(false);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="प्रकल्प निवडा..." />
              </SelectTrigger>
              <SelectContent>
                {subdivisionProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>पासून दिनांक</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>पर्यंत दिनांक</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <Button size="lg" className="w-full" onClick={handleAnalyze}>
            प्रगती पहा
          </Button>
        </CardContent>
      </Card>

      {hasResults && (
        <>
          <ProgressSection
            icon={Truck}
            title="टिप्पर फेरीनुसार मातीकाम प्रगती"
            rows={tipperQuery.data ?? []}
            quantityLabel="फेऱ्या"
            quantityOf={(r) => r.total_trips}
            unitSuffix="फेऱ्या"
            emptyText="या कालावधीत या प्रकल्पावर टिप्परची नोंद आढळली नाही."
          />

          <ProgressSection
            icon={Gauge}
            title="सयंत्र (डोझर/एस्कॅव्हेटर) तासानुसार मातीकाम प्रगती"
            rows={excavatorQuery.data ?? []}
            quantityLabel="तास"
            quantityOf={(r) => r.total_hours}
            unitSuffix="तास"
            emptyText="या कालावधीत या प्रकल्पावर सयंत्राची नोंद आढळली नाही."
          />

          <DieselSection rows={dieselQuery.data ?? []} />
        </>
      )}
    </div>
  );
}
