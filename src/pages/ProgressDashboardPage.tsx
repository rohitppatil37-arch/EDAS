import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Filter, Fuel, Gauge, SlidersHorizontal, Truck } from "lucide-react";
import { GovHeader } from "@/components/layout/GovHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSubdivisions, useProjects } from "@/lib/queries/masterData";
import { useMachineEarthworkProgress, useSiteDieselTotal } from "@/lib/queries/earthworkProgress";
import type { MachineEarthworkProgressRow } from "@/types/database";

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

            <div className="space-y-2">
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
  const dieselQuery = useSiteDieselTotal({ projectId, from, to, enabled: queryEnabled });

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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Fuel className="size-4.5" />
                घेतलेले डिझेल
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-accent/60 px-4 py-3 text-center">
                <p className="text-xs font-medium text-muted-foreground">या प्रकल्पासाठी एकूण डिझेल</p>
                <p className="mt-1 text-2xl font-bold text-primary">
                  {(dieselQuery.data ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })} लिटर
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
