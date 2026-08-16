import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CheckCircle2, Compass, MapPin, MapPinOff, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useMachines } from "@/lib/queries/masterData";
import { useAddGpsLog, useGpsLogs } from "@/lib/queries/gpsLogs";

export function GpsLogEntryPage() {
  const { profile } = useAuth();
  const subdivisionId = profile?.subdivision_id ?? null;
  const { data: machines = [] } = useMachines();
  const { data: logs = [] } = useGpsLogs(subdivisionId);
  const addGpsLog = useAddGpsLog();

  const subdivisionMachines = machines.filter((m) => m.subdivision_id === subdivisionId);

  const [machineId, setMachineId] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [locating, setLocating] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation या ब्राउझरमध्ये उपलब्ध नाही");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        toast.error("🚫 Location मिळू शकले नाही, permission तपासा");
        setLocating(false);
      }
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!subdivisionId || !machineId || !latitude || !longitude) {
      toast.error("मशीन आणि Location भरा");
      return;
    }

    try {
      await addGpsLog.mutateAsync({
        subdivision_id: subdivisionId,
        machine_id: machineId,
        work_log_id: null,
        recorded_at: new Date().toISOString(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        location_label: locationLabel || null,
      });
      toast.success("GPS नोंद जतन झाली!");
      setLatitude("");
      setLongitude("");
      setLocationLabel("");
    } catch {
      toast.error("जतन करताना समस्या आली.");
    }
  }

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <MapPin className="size-4.5" />
            नवीन GPS नोंद
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>सयंत्र</Label>
              <Select value={machineId} onValueChange={setMachineId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="सयंत्र निवडा" />
                </SelectTrigger>
                <SelectContent>
                  {subdivisionMachines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.machine_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="latitude">अक्षांश (Latitude)</Label>
                <Input id="latitude" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="longitude">रेखांश (Longitude)</Label>
                <Input id="longitude" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
              </div>
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={useMyLocation} disabled={locating}>
              {locating ? <Compass className="size-4 animate-spin" /> : <MapPin className="size-4" />}
              {locating ? "Location मिळवत आहे..." : "सध्याचे Location वापरा"}
            </Button>

            {latitude && longitude && (
              <Badge variant="secondary" className="gap-1.5">
                <CheckCircle2 className="size-3.5" />
                स्थान मिळाले
              </Badge>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="locationLabel">स्थळाचे नाव (पर्यायी)</Label>
              <Input id="locationLabel" value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} />
            </div>

            <Button type="submit" className="w-full" disabled={addGpsLog.isPending}>
              <Plus className="size-4.5" />
              {addGpsLog.isPending ? "जतन होत आहे..." : "GPS नोंद जोडा"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Mobile: card list */}
      <div className="space-y-3 sm:hidden">
        {logs.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
            <MapPinOff className="size-8" />
            <p className="text-sm">कोणतीही नोंद नाही</p>
          </div>
        )}
        {logs.map((log) => (
          <Card key={log.id}>
            <CardContent className="space-y-1.5">
              <p className="font-semibold">{log.machines?.machine_name ?? "-"}</p>
              <p className="text-xs text-muted-foreground">{new Date(log.recorded_at).toLocaleString()}</p>
              <p className="text-sm">
                {log.latitude}, {log.longitude}
              </p>
              {log.location_label && <p className="text-sm text-muted-foreground">{log.location_label}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop/tablet: table */}
      <Card className="hidden sm:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>वेळ</TableHead>
                <TableHead>सयंत्र</TableHead>
                <TableHead>अक्षांश</TableHead>
                <TableHead>रेखांश</TableHead>
                <TableHead>स्थळ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.recorded_at).toLocaleString()}</TableCell>
                  <TableCell>{log.machines?.machine_name ?? "-"}</TableCell>
                  <TableCell>{log.latitude}</TableCell>
                  <TableCell>{log.longitude}</TableCell>
                  <TableCell>{log.location_label ?? "-"}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    कोणतीही नोंद नाही
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </>
  );
}
