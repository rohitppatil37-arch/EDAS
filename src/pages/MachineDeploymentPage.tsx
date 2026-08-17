import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, Inbox, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useMachines, useProjects, useSubdivisions } from "@/lib/queries/masterData";
import {
  useCreateMachineDeployment,
  useDeleteMachineDeployment,
  useMachineDeployments,
} from "@/lib/queries/machineDeployments";

function unique(arr: string[]) {
  return [...new Set(arr)];
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

function deploymentStatus(startDate: string, endDate: string) {
  const today = todayIso();
  if (today < startDate) return { label: "आगामी", variant: "secondary" as const };
  if (today > endDate) return { label: "संपले", variant: "outline" as const };
  return { label: "सुरू आहे", variant: "default" as const };
}

export function MachineDeploymentPage() {
  const { profile } = useAuth();
  const subdivisionId = profile?.subdivision_id ?? null;
  const isSuperadmin = profile?.role === "superadmin";

  const { data: subdivisions = [] } = useSubdivisions();
  const { data: machines = [] } = useMachines();
  const { data: projects = [] } = useProjects();
  const { data: deployments = [] } = useMachineDeployments(subdivisionId, isSuperadmin);
  const createDeployment = useCreateMachineDeployment();
  const deleteDeployment = useDeleteMachineDeployment();

  const [machineType, setMachineType] = useState("");
  const [machineId, setMachineId] = useState("");
  const [targetSubdivisionId, setTargetSubdivisionId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());

  const machineTypeOptions = useMemo(() => unique(machines.map((m) => m.machine_type)), [machines]);
  const machineOptions = useMemo(
    () => machines.filter((m) => m.machine_type === machineType),
    [machines, machineType]
  );
  const projectOptions = useMemo(
    () => projects.filter((p) => p.subdivision_id === targetSubdivisionId),
    [projects, targetSubdivisionId]
  );

  function machineLabel(m: { machine_name: string; subdivision_id: string }) {
    const home = subdivisions.find((s) => s.id === m.subdivision_id)?.name;
    return `${m.machine_name}${home ? ` (${home})` : ""}`;
  }

  function resetForm() {
    setMachineType("");
    setMachineId("");
    setTargetSubdivisionId("");
    setProjectId("");
    setStartDate(todayIso());
    setEndDate(todayIso());
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!machineId || !targetSubdivisionId || !projectId || !startDate || !endDate) {
      toast.error("सर्व माहिती भरा");
      return;
    }
    if (endDate < startDate) {
      toast.error("शेवटचा दिनांक सुरुवातीच्या दिनांकापेक्षा आधीचा असू शकत नाही");
      return;
    }

    try {
      await createDeployment.mutateAsync({
        machine_id: machineId,
        subdivision_id: targetSubdivisionId,
        project_id: projectId,
        start_date: startDate,
        end_date: endDate,
      });
      toast.success("सयंत्र नियुक्त झाले!");
      resetForm();
    } catch {
      toast.error("जतन करताना समस्या आली.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDeployment.mutateAsync(id);
      toast.success("नियुक्ती रद्द झाली!");
    } catch {
      toast.error("रद्द करताना समस्या आली.");
    }
  }

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <ArrowRightLeft className="size-4.5" />
            सयंत्र नियुक्ती
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>सयंत्राचा प्रकार</Label>
              <Select
                value={machineType}
                onValueChange={(v) => {
                  setMachineType(v);
                  setMachineId("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="सयंत्राचा प्रकार निवडा..." />
                </SelectTrigger>
                <SelectContent>
                  {machineTypeOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>सयंत्राचे नाव</Label>
              <Select value={machineId} onValueChange={setMachineId} disabled={!machineType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="सयंत्र निवडा..." />
                </SelectTrigger>
                <SelectContent>
                  {machineOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {machineLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>उपविभाग (जिथे नियुक्त करायचे)</Label>
              <Select
                value={targetSubdivisionId}
                onValueChange={(v) => {
                  setTargetSubdivisionId(v);
                  setProjectId("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="उपविभाग निवडा..." />
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
              <Label>प्रकल्पाचे नाव</Label>
              <Select value={projectId} onValueChange={setProjectId} disabled={!targetSubdivisionId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="प्रकल्प निवडा..." />
                </SelectTrigger>
                <SelectContent>
                  {projectOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">सुरुवात दिनांक</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">शेवट दिनांक</Label>
                <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={createDeployment.isPending}>
              <Plus className="size-4.5" />
              {createDeployment.isPending ? "जतन होत आहे..." : "नियुक्त करा"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {deployments.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Inbox className="size-8" />
            <p className="text-sm">कोणतीही नियुक्ती नाही</p>
          </div>
        )}
        {deployments.map((d) => {
          const status = deploymentStatus(d.start_date, d.end_date);
          return (
            <Card key={d.id}>
              <CardContent className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{d.machines?.machine_name ?? "-"}</p>
                    <p className="text-xs text-muted-foreground">
                      मूळ उपविभाग:{" "}
                      {subdivisions.find((s) => s.id === d.machines?.subdivision_id)?.name ?? "-"}
                    </p>
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {d.projects?.project_name ?? "-"} · {d.subdivisions?.name ?? "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(d.start_date)} – {fmtDate(d.end_date)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={deleteDeployment.isPending}
                    onClick={() => handleDelete(d.id)}
                  >
                    <Trash2 className="size-4" />
                    रद्द करा
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
