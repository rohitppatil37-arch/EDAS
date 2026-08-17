import { useState, type ComponentType } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Fuel,
  Gauge,
  Inbox,
  Loader2,
  MapPinned,
  MessageSquareWarning,
  Timer,
  Truck,
  Wrench,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  useApproveWorkLog,
  useRejectWorkLog,
  useWorkLogsByStatus,
  type WorkLogForReview,
} from "@/lib/queries/workLogValidation";
import type { WorkLogStatus } from "@/types/database";

const statusTabs: { value: WorkLogStatus; label: string }[] = [
  { value: "pending", label: "प्रलंबित" },
  { value: "approved", label: "मंजूर" },
  { value: "rejected", label: "नाकारलेले" },
];

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

function fmtTime(t: string | null) {
  return t ? t.slice(0, 5) : "-";
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        {label}
      </span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function EntryCard({
  log,
  onApprove,
  onReject,
  approving,
}: {
  log: WorkLogForReview;
  onApprove: () => void;
  onReject: () => void;
  approving: boolean;
}) {
  const isVehicle = log.machines?.category === "Vehicle";
  const dieselFilled = log.diesel_qty > 0;

  return (
    <Card>
      <CardContent className="space-y-1">
        <div className="flex items-start justify-between gap-2 pb-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{log.machines?.machine_name ?? "-"}</p>
            <p className="text-xs text-muted-foreground">
              {fmtDate(log.work_date)} · {log.staff?.name ?? "-"} ({log.staff?.role ?? "-"})
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant="secondary">{log.projects?.project_name ?? "-"}</Badge>
            <Badge variant="outline" className="text-[10px]">
              {log.work_type}
            </Badge>
          </div>
        </div>

        <Separator />

        <div className="divide-y">
          <DetailRow
            icon={Gauge}
            label="डॅशबोर्ड रिडींग"
            value={`${log.start_reading} → ${log.end_reading}  (एकूण ${log.total_reading})`}
          />
          <DetailRow
            icon={Fuel}
            label="डिझेल"
            value={
              dieselFilled
                ? `${log.diesel_qty} लि. · ${fmtTime(log.diesel_time)} · रिडींग ${log.diesel_reading ?? "-"}`
                : "भरले नाही"
            }
          />
          <DetailRow icon={Clock} label="शिफ्ट-१" value={`${fmtTime(log.shift1_start)} – ${fmtTime(log.shift1_end)}`} />
          <DetailRow icon={Clock} label="शिफ्ट-२" value={`${fmtTime(log.shift2_start)} – ${fmtTime(log.shift2_end)}`} />
          <DetailRow icon={Timer} label="एकूण शिफ्ट तास" value={String(log.total_shift_hours ?? "-")} />
          {isVehicle && (
            <>
              <DetailRow icon={Truck} label="एकूण फेऱ्या" value={String(log.trip_count ?? "-")} />
              <DetailRow icon={MapPinned} label="ठिकाण" value={log.location_from_to ?? "-"} />
            </>
          )}
        </div>

        {log.remark && (
          <p className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground">
            <Wrench className="size-3.5 shrink-0" />
            {log.remark}
          </p>
        )}

        {log.status === "rejected" && log.review_note && (
          <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
            <MessageSquareWarning className="size-3.5 shrink-0" />
            {log.review_note}
          </p>
        )}

        {log.status === "pending" && (
          <div className="grid grid-cols-2 gap-2 pt-3">
            <Button variant="outline" disabled={approving} onClick={onReject}>
              <XCircle className="size-4 text-destructive" />
              नाकारा
            </Button>
            <Button disabled={approving} onClick={onApprove}>
              {approving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              मंजूर करा
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function WorkLogValidationPage() {
  const { profile } = useAuth();
  const subdivisionId = profile?.subdivision_id ?? null;
  const [status, setStatus] = useState<WorkLogStatus>("pending");
  const { data: logs = [], isFetching } = useWorkLogsByStatus(subdivisionId, status);
  const approveLog = useApproveWorkLog();
  const rejectLog = useRejectWorkLog();

  const [rejectTarget, setRejectTarget] = useState<WorkLogForReview | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  async function handleApprove(log: WorkLogForReview) {
    try {
      await approveLog.mutateAsync(log);
      toast.success("नोंद मंजूर झाली!");
    } catch {
      toast.error("मंजूर करताना समस्या आली.");
    }
  }

  function openReject(log: WorkLogForReview) {
    setRejectTarget(log);
    setRejectNote("");
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    if (!rejectNote.trim()) {
      toast.error("कृपया नाकारण्याचे कारण लिहा");
      return;
    }
    try {
      await rejectLog.mutateAsync({ id: rejectTarget.id, note: rejectNote.trim() });
      toast.success("नोंद नाकारली!");
      setRejectTarget(null);
    } catch {
      toast.error("नाकारताना समस्या आली.");
    }
  }

  return (
    <>
      <Tabs value={status} onValueChange={(v) => setStatus(v as WorkLogStatus)} className="mb-4">
        <TabsList className="grid w-full grid-cols-3">
          {statusTabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isFetching ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
          {status === "pending" ? <Inbox className="size-8" /> : <ClipboardList className="size-8" />}
          <p className="text-sm">
            {status === "pending" ? "पडताळणीसाठी कोणतीही नोंद प्रलंबित नाही." : "कोणतीही नोंद आढळली नाही."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <EntryCard
              key={log.id}
              log={log}
              approving={approveLog.isPending && approveLog.variables?.id === log.id}
              onApprove={() => handleApprove(log)}
              onReject={() => openReject(log)}
            />
          ))}
        </div>
      )}

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>नोंद नाकारायची आहे का?</DialogTitle>
            <DialogDescription>
              {rejectTarget?.machines?.machine_name} — {rejectTarget && fmtDate(rejectTarget.work_date)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="rejectNote">नाकारण्याचे कारण</Label>
            <Textarea
              id="rejectNote"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="उदा. रिडींग चुकीचे वाटते, तपासून पुन्हा भरा."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              रद्द करा
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={rejectLog.isPending}
              onClick={confirmReject}
            >
              {rejectLog.isPending ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
              नाकारा
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
