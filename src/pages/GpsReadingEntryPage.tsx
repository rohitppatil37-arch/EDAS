import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarSearch, Loader2, Navigation, Route, Save, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useMachines } from "@/lib/queries/masterData";
import { useGpsReadingsForMachine, useSaveGpsReadings, useWorkLogDatesForMachine } from "@/lib/queries/gpsReadings";
import { buildGpsSeries } from "@/lib/gpsSeries";

function unique(arr: string[]) {
  return [...new Set(arr)];
}

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

const EMPTY_DATES: string[] = [];

export function GpsReadingEntryPage() {
  const { profile } = useAuth();
  const subdivisionId = profile?.subdivision_id ?? null;
  const { data: machines = [] } = useMachines();

  const subdivisionMachines = useMemo(
    () => machines.filter((m) => m.subdivision_id === subdivisionId),
    [machines, subdivisionId]
  );
  const machineTypeOptions = useMemo(
    () => unique(subdivisionMachines.map((m) => m.machine_type)),
    [subdivisionMachines]
  );

  const [machineType, setMachineType] = useState("");
  const [machineId, setMachineId] = useState("");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayIso());
  const [fetchEnabled, setFetchEnabled] = useState(false);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const saveGps = useSaveGpsReadings();

  const machineOptions = useMemo(
    () => subdivisionMachines.filter((m) => m.machine_type === machineType),
    [subdivisionMachines, machineType]
  );
  const selectedMachine = subdivisionMachines.find((m) => m.id === machineId);

  const datesQuery = useWorkLogDatesForMachine({ machineId, from, to, enabled: fetchEnabled });
  const readingsQuery = useGpsReadingsForMachine(machineId, fetchEnabled);

  useEffect(() => {
    if (!readingsQuery.data) return;
    const map: Record<string, string> = {};
    readingsQuery.data.forEach((r) => {
      map[r.reading_date] = String(r.reading);
    });
    setInputs(map);
  }, [readingsQuery.data]);

  const dates = datesQuery.data ?? EMPTY_DATES;

  const rows = useMemo(() => {
    const merged = new Map<string, number>();
    (readingsQuery.data ?? []).forEach((r) => merged.set(r.reading_date, r.reading));
    Object.entries(inputs).forEach(([date, value]) => {
      const n = Number(value);
      if (value !== "" && !isNaN(n)) merged.set(date, n);
      else if (value === "") merged.delete(date);
    });
    const sorted = [...merged.entries()]
      .map(([date, reading]) => ({ reading_date: date, reading }))
      .sort((a, b) => a.reading_date.localeCompare(b.reading_date));
    const series = buildGpsSeries(sorted);

    return dates.map((date) => {
      const point = series.find((p) => p.date === date);
      const priorPoint = [...series].reverse().find((p) => p.date < date);
      return {
        date,
        start: point ? point.start : (priorPoint?.end ?? null),
        diff: point?.diff ?? null,
        input: inputs[date] ?? "",
      };
    });
  }, [dates, inputs, readingsQuery.data]);

  function handleFetch() {
    if (!machineId) {
      toast.error("कृपया सयंत्र निवडा");
      return;
    }
    setFetchEnabled(true);
  }

  function updateInput(date: string, value: string) {
    setInputs((prev) => ({ ...prev, [date]: value }));
  }

  async function handleSave() {
    if (!subdivisionId || !machineId) return;
    const payload = dates
      .filter((date) => inputs[date] !== undefined && inputs[date] !== "")
      .map((date) => ({
        subdivision_id: subdivisionId,
        machine_id: machineId,
        reading_date: date,
        reading: Number(inputs[date]),
      }));

    if (payload.length === 0) {
      toast.error("कृपया किमान एक रिडींग भरा");
      return;
    }
    if (payload.some((p) => isNaN(p.reading))) {
      toast.error("कृपया योग्य रिडींग भरा");
      return;
    }

    try {
      await saveGps.mutateAsync(payload);
      toast.success("GPS रिडींग जतन झाले!");
    } catch {
      toast.error("जतन करताना समस्या आली.");
    }
  }

  const hasResults = fetchEnabled && !!machineId;

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <SlidersHorizontal className="size-4.5" />
            फिल्टर
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>सयंत्राचा प्रकार</Label>
            <Select
              value={machineType}
              onValueChange={(v) => {
                setMachineType(v);
                setMachineId("");
                setFetchEnabled(false);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="प्रकार निवडा" />
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
            <Label>सयंत्र</Label>
            <Select
              value={machineId}
              onValueChange={(v) => {
                setMachineId(v);
                setFetchEnabled(false);
              }}
            >
              <SelectTrigger className="w-full" disabled={!machineType}>
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

          <Button
            size="lg"
            className="w-full"
            onClick={handleFetch}
            disabled={datesQuery.isFetching || readingsQuery.isFetching}
          >
            {datesQuery.isFetching || readingsQuery.isFetching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CalendarSearch className="size-4" />
            )}
            माहिती आणा
          </Button>
        </CardContent>
      </Card>

      {hasResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Route className="size-4.5" />
              {selectedMachine?.machine_name} — GPS रिडींग
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dates.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
                <Navigation className="size-8" />
                <p className="text-sm">या कालावधीत या सयंत्राची कामाची नोंद आढळली नाही.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {rows.map((row) => (
                    <div key={row.date} className="rounded-lg border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold">{fmtDate(row.date)}</p>
                        <p className="text-xs text-muted-foreground">
                          मागील: {row.start ?? "-"} · फरक:{" "}
                          <span className="font-semibold text-primary">{row.diff ?? "-"}</span>
                        </p>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="GPS रिडींग भरा"
                        value={row.input}
                        onChange={(e) => updateInput(row.date, e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                <Button className="w-full" size="lg" onClick={handleSave} disabled={saveGps.isPending}>
                  {saveGps.isPending ? <Loader2 className="size-4.5 animate-spin" /> : <Save className="size-4.5" />}
                  {saveGps.isPending ? "जतन होत आहे..." : "रिडींग जतन करा"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
