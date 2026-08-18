/** machine_id -> reading_date -> that day's admin-recorded GPS-device difference, for report lookups. */
export function buildGpsDiffMap(readings: { machine_id: string; reading_date: string; reading: number }[]) {
  const diffMap = new Map<string, number>();
  readings.forEach((r) => {
    diffMap.set(`${r.machine_id}|${r.reading_date}`, r.reading);
  });
  return diffMap;
}
