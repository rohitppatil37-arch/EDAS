export interface GpsSeriesPoint {
  date: string;
  start: number | null;
  end: number;
  diff: number | null;
}

/**
 * Turns a chronologically-sorted list of single daily GPS-meter readings into
 * per-day start/end/diff rows, the same continuity model the dashboard reading
 * already uses: a day's start is the previous reading's value, and the diff is
 * only known once a previous reading exists.
 */
export function buildGpsSeries(readings: { reading_date: string; reading: number }[]): GpsSeriesPoint[] {
  const sorted = [...readings].sort((a, b) => a.reading_date.localeCompare(b.reading_date));
  let prev: number | null = null;
  return sorted.map((r) => {
    const point: GpsSeriesPoint = {
      date: r.reading_date,
      start: prev,
      end: r.reading,
      diff: prev == null ? null : r.reading - prev,
    };
    prev = r.reading;
    return point;
  });
}

/** machine_id -> reading_date -> that day's GPS diff (hours/km), for report lookups. */
export function buildGpsDiffMap(readings: { machine_id: string; reading_date: string; reading: number }[]) {
  const byMachine = new Map<string, { reading_date: string; reading: number }[]>();
  readings.forEach((r) => {
    const list = byMachine.get(r.machine_id) ?? [];
    list.push(r);
    byMachine.set(r.machine_id, list);
  });

  const diffMap = new Map<string, number>();
  byMachine.forEach((list, machineId) => {
    buildGpsSeries(list).forEach((point) => {
      if (point.diff != null) diffMap.set(`${machineId}|${point.date}`, point.diff);
    });
  });
  return diffMap;
}
