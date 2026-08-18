import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Download, Inbox, SlidersHorizontal, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useMachines, useSubdivisions, useTransferMachine } from "@/lib/queries/masterData";
import type { Machine } from "@/types/database";

function unique(arr: string[]) {
  return [...new Set(arr)];
}

type PendingAction =
  | { kind: "bring-in"; machine: Machine }
  | { kind: "pick-target"; machine: Machine };

export function MachineTransferPage() {
  const { profile } = useAuth();
  const subdivisionId = profile?.subdivision_id ?? null;
  const isSuperadmin = profile?.role === "superadmin";

  const { data: subdivisions = [] } = useSubdivisions();
  const { data: machines = [] } = useMachines();
  const transferMachine = useTransferMachine();

  const [machineType, setMachineType] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [pickedTarget, setPickedTarget] = useState("");

  const machineTypeOptions = useMemo(() => unique(machines.map((m) => m.machine_type)), [machines]);
  const filteredMachines = useMemo(
    () => machines.filter((m) => !machineType || m.machine_type === machineType),
    [machines, machineType]
  );

  function subdivisionName(id: string) {
    return subdivisions.find((s) => s.id === id)?.name ?? "-";
  }

  function openAction(machine: Machine) {
    const isMine = machine.subdivision_id === subdivisionId;
    if (!isSuperadmin && !isMine) {
      setPendingAction({ kind: "bring-in", machine });
    } else {
      setPendingAction({ kind: "pick-target", machine });
      setPickedTarget("");
    }
  }

  function closeDialog() {
    setPendingAction(null);
    setPickedTarget("");
  }

  async function handleConfirm() {
    if (!pendingAction) return;
    const targetSubdivisionId = pendingAction.kind === "bring-in" ? subdivisionId : pickedTarget;
    if (!targetSubdivisionId) {
      toast.error("कृपया उपविभाग निवडा");
      return;
    }
    try {
      await transferMachine.mutateAsync({ machineId: pendingAction.machine.id, targetSubdivisionId });
      toast.success(`${pendingAction.machine.machine_name} स्थानांतरित झाले!`);
      closeDialog();
    } catch {
      toast.error("स्थानांतरित करताना समस्या आली.");
    }
  }

  const targetOptions = pendingAction
    ? subdivisions.filter((s) => s.id !== pendingAction.machine.subdivision_id)
    : [];

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <SlidersHorizontal className="size-4.5" />
            फिल्टर
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label>सयंत्राचा प्रकार</Label>
            <Select value={machineType || "all"} onValueChange={(v) => setMachineType(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="सर्व प्रकार" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">सर्व प्रकार</SelectItem>
                {machineTypeOptions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <ArrowLeftRight className="size-4.5" />
            सयंत्र स्थानांतरण
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {filteredMachines.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <Inbox className="size-8" />
              <p className="text-sm">या प्रकारची सयंत्रे सापडली नाहीत.</p>
            </div>
          )}
          {filteredMachines.map((m) => {
            const isMine = m.subdivision_id === subdivisionId;
            return (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium leading-snug">{m.machine_name}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Badge variant={isMine ? "default" : "secondary"} className="text-[11px]">
                      {subdivisionName(m.subdivision_id)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{m.machine_type}</span>
                  </div>
                </div>
                {isSuperadmin ? (
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => openAction(m)}>
                    <ArrowLeftRight className="size-4" />
                    स्थानांतरित करा
                  </Button>
                ) : isMine ? (
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => openAction(m)}>
                    <Upload className="size-4" />
                    पाठवा
                  </Button>
                ) : (
                  <Button size="sm" className="shrink-0" onClick={() => openAction(m)}>
                    <Download className="size-4" />
                    आणा
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && closeDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>सयंत्र स्थानांतरित करायचे आहे का?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {pendingAction?.kind === "bring-in" ? (
                  <p>
                    <span className="font-semibold text-foreground">{pendingAction.machine.machine_name}</span> हे
                    सयंत्र तुमच्या उपविभागात ({subdivisionName(subdivisionId ?? "")}) आणले जाईल.
                  </p>
                ) : (
                  <>
                    <p>
                      <span className="font-semibold text-foreground">{pendingAction?.machine.machine_name}</span> हे
                      सयंत्र कोणत्या उपविभागात पाठवायचे आहे ते निवडा.
                    </p>
                    <Select value={pickedTarget} onValueChange={setPickedTarget}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="उपविभाग निवडा..." />
                      </SelectTrigger>
                      <SelectContent>
                        {targetOptions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>रद्द करा</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                transferMachine.isPending || (pendingAction?.kind === "pick-target" && !pickedTarget)
              }
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
            >
              {transferMachine.isPending ? "स्थानांतरित होत आहे..." : "स्थानांतरित करा"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
