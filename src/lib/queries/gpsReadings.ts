import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { GpsReading, GpsReadingUpsert } from "@/types/database";

export interface WorkLogReadingRow {
  work_date: string;
  start_reading: number;
  end_reading: number;
  total_reading: number;
}

// The driver's own dashboard-reading entries (start/end/diff) for a machine + date
// range — shown alongside the GPS reading row so admin can cross-check the two.
export function useWorkLogReadingsForMachine(params: {
  machineId: string;
  from: string;
  to: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: ["work_log_readings", params.machineId, params.from, params.to],
    enabled: params.enabled && !!params.machineId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_logs")
        .select("work_date, start_reading, end_reading, total_reading")
        .eq("machine_id", params.machineId)
        .eq("status", "approved")
        .gte("work_date", params.from)
        .lte("work_date", params.to)
        .order("work_date")
        .order("created_at");
      if (error) throw error;
      return data as WorkLogReadingRow[];
    },
  });
}

export function useGpsReadingsForMachine(machineId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["gps_readings", machineId],
    enabled: enabled && !!machineId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gps_readings")
        .select("*")
        .eq("machine_id", machineId)
        .order("reading_date");
      if (error) throw error;
      return data as GpsReading[];
    },
  });
}

export function useSaveGpsReadings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rows: GpsReadingUpsert[]) => {
      const { error } = await supabase.from("gps_readings").upsert(rows, { onConflict: "machine_id,reading_date" });
      if (error) throw error;
    },
    onSuccess: (_data, rows) => {
      queryClient.invalidateQueries({ queryKey: ["gps_readings", rows[0]?.machine_id] });
    },
  });
}
