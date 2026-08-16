import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Loader2, Save, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useStaff } from "@/lib/queries/masterData";
import { useAttendanceForDate, useUpsertAttendance } from "@/lib/queries/attendance";
import type { AttendanceStatus, AttendanceUpsert } from "@/types/database";

const statusOptions: AttendanceStatus[] = ["Present", "Absent", "Half Day", "Leave"];

const statusLabels: Record<AttendanceStatus, string> = {
  Present: "उपस्थित",
  Absent: "अनुपस्थित",
  "Half Day": "अर्धा दिवस",
  Leave: "रजा",
};

const statusDotColor: Record<AttendanceStatus, string> = {
  Present: "bg-success",
  Absent: "bg-destructive",
  "Half Day": "bg-warning",
  Leave: "bg-muted-foreground",
};

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

export function AttendanceEntryPage() {
  const { profile } = useAuth();
  const subdivisionId = profile?.subdivision_id ?? null;
  const { data: staff = [] } = useStaff();
  const [date, setDate] = useState(todayIso());
  const { data: existing } = useAttendanceForDate(subdivisionId, date);
  const upsert = useUpsertAttendance();

  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});

  const subdivisionStaff = staff.filter((s) => s.subdivision_id === subdivisionId);

  const statusCounts = useMemo(() => {
    const counts: Record<AttendanceStatus, number> = { Present: 0, Absent: 0, "Half Day": 0, Leave: 0 };
    subdivisionStaff.forEach((s) => {
      const status = statuses[s.id] ?? "Present";
      counts[status]++;
    });
    return counts;
  }, [subdivisionStaff, statuses]);

  useEffect(() => {
    const map: Record<string, AttendanceStatus> = {};
    subdivisionStaff.forEach((s) => {
      map[s.id] = "Present";
    });
    existing?.forEach((a) => {
      map[a.staff_id] = a.status;
    });
    setStatuses(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, existing, staff.length]);

  async function save() {
    if (!subdivisionId) return;
    const rows: AttendanceUpsert[] = subdivisionStaff.map((s) => ({
      subdivision_id: subdivisionId,
      staff_id: s.id,
      attendance_date: date,
      status: statuses[s.id] ?? "Present",
      remarks: null,
    }));

    try {
      await upsert.mutateAsync(rows);
      toast.success("हजेरी जतन झाली!");
    } catch {
      toast.error("हजेरी जतन करताना समस्या आली.");
    }
  }

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <CalendarDays className="size-4.5" />
            दिनांक निवडा
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="attendanceDate" className="sr-only">
            दिनांक
          </Label>
          <Input id="attendanceDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </CardContent>
      </Card>

      {subdivisionStaff.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {statusOptions.map((opt) => (
            <Badge key={opt} variant="outline" className="gap-1.5 py-1">
              <span className={`size-2 rounded-full ${statusDotColor[opt]}`} />
              {statusLabels[opt]}
              <span className="font-bold">{statusCounts[opt]}</span>
            </Badge>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="space-y-2.5">
          {subdivisionStaff.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
              <Users className="size-8" />
              <p className="text-sm">या उपविभागासाठी कर्मचारी सापडले नाहीत.</p>
            </div>
          )}
          {subdivisionStaff.map((s) => {
            const status = statuses[s.id] ?? "Present";
            return (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={`size-2 shrink-0 rounded-full ${statusDotColor[status]}`} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.role}</p>
                  </div>
                </div>
                <Select
                  value={status}
                  onValueChange={(v) => setStatuses((prev) => ({ ...prev, [s.id]: v as AttendanceStatus }))}
                >
                  <SelectTrigger className="w-32 shrink-0 sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {statusLabels[opt]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {subdivisionStaff.length > 0 && (
        <Button className="mt-4 w-full" size="lg" onClick={save} disabled={upsert.isPending}>
          {upsert.isPending ? <Loader2 className="size-4.5 animate-spin" /> : <Save className="size-4.5" />}
          {upsert.isPending ? "जतन होत आहे..." : "हजेरी जतन करा"}
        </Button>
      )}
    </>
  );
}
