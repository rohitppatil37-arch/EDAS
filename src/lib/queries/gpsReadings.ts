import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { GpsReading, GpsReadingUpsert } from "@/types/database";

export function useWorkLogDatesForMachine(params: {
  machineId: string;
  from: string;
  to: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: ["work_log_dates", params.machineId, params.from, params.to],
    enabled: params.enabled && !!params.machineId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_logs")
        .select("work_date")
        .eq("machine_id", params.machineId)
        .eq("status", "approved")
        .gte("work_date", params.from)
        .lte("work_date", params.to)
        .order("work_date");
      if (error) throw error;
      return [...new Set((data as { work_date: string }[]).map((r) => r.work_date))];
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
