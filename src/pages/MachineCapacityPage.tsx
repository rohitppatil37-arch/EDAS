import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Gauge, Loader2, Save, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useMachines } from "@/lib/queries/masterData";
import { useUpdateMachineCapacity } from "@/lib/queries/earthworkProgress";
import type { Machine } from "@/types/database";

function MachineRow({ machine, unitLabel }: { machine: Machine; unitLabel: string }) {
  const [value, setValue] = useState(machine.capacity != null ? String(machine.capacity) : "");
  const update = useUpdateMachineCapacity();

  useEffect(() => {
    setValue(machine.capacity != null ? String(machine.capacity) : "");
  }, [machine.capacity]);

  const dirty = value !== (machine.capacity != null ? String(machine.capacity) : "");

  async function save() {
    const capacity = value === "" ? null : Number(value);
    if (capacity !== null && (isNaN(capacity) || capacity < 0)) {
      toast.error("कृपया योग्य क्षमता भरा");
      return;
    }
    try {
      await update.mutateAsync({ machineId: machine.id, capacity });
      toast.success(`${machine.machine_name} ची क्षमता जतन झाली!`);
    } catch {
      toast.error("जतन करताना समस्या आली.");
    }
  }

  return (
    <div className="rounded-lg border p-3">
      <p className="text-balance font-medium leading-snug">{machine.machine_name}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{unitLabel}</p>
        <div className="flex shrink-0 items-center gap-2">
          <Input
            type="number"
            min={0}
            step="0.1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-24"
          />
          <Button size="icon" variant="outline" disabled={!dirty || update.isPending} onClick={save} aria-label="जतन करा">
            {update.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MachineCapacityPage() {
  const { profile } = useAuth();
  const subdivisionId = profile?.subdivision_id ?? null;
  const { data: machines = [] } = useMachines();

  const subdivisionMachines = machines.filter((m) => m.subdivision_id === subdivisionId);
  const tippers = subdivisionMachines.filter((m) => m.machine_type === "टिप्पर");
  const excavators = subdivisionMachines.filter((m) => m.machine_type === "डोझर/एस्कॅव्हेटर");

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Truck className="size-4.5" />
            टिप्पर क्षमता (घनमीटर प्रति फेरी)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {tippers.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">या उपविभागासाठी टिप्पर सापडले नाहीत.</p>
          )}
          {tippers.map((m) => (
            <MachineRow key={m.id} machine={m} unitLabel="घनमीटर / फेरी" />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Gauge className="size-4.5" />
            सयंत्र (डोझर/एस्कॅव्हेटर) क्षमता (घनमीटर प्रति तास)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {excavators.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              या उपविभागासाठी डोझर/एस्कॅव्हेटर सापडले नाहीत.
            </p>
          )}
          {excavators.map((m) => (
            <MachineRow key={m.id} machine={m} unitLabel="घनमीटर / तास" />
          ))}
        </CardContent>
      </Card>
    </>
  );
}
