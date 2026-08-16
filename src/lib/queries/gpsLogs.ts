import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { GpsLog, GpsLogInsert } from "@/types/database";

export function useGpsLogs(subdivisionId: string | null) {
  return useQuery({
    queryKey: ["gps_logs", subdivisionId],
    enabled: !!subdivisionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gps_logs")
        .select("*, machines(machine_name)")
        .eq("subdivision_id", subdivisionId as string)
        .order("recorded_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as (GpsLog & { machines: { machine_name: string } | null })[];
    },
  });
}

export function useGpsReport(params: {
  subdivisionId: string | null;
  from: string;
  to: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: ["gps_report", params.subdivisionId, params.from, params.to],
    enabled: params.enabled && !!params.subdivisionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gps_logs")
        .select("*, machines(machine_name)")
        .eq("subdivision_id", params.subdivisionId as string)
        .gte("recorded_at", params.from)
        .lte("recorded_at", params.to)
        .order("recorded_at");
      if (error) throw error;
      return data as (GpsLog & { machines: { machine_name: string } | null })[];
    },
  });
}

export function useAddGpsLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (row: GpsLogInsert) => {
      const { error } = await supabase.from("gps_logs").insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gps_logs"] });
    },
  });
}
