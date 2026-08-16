import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { FuelPerformanceRow, MachineCategory } from "@/types/database";

export function useFuelPerformance(params: {
  subdivisionId: string;
  category: MachineCategory | null;
  machineId: string | null;
  from: string;
  to: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: [
      "fuel_performance",
      params.subdivisionId,
      params.category,
      params.machineId,
      params.from,
      params.to,
    ],
    enabled: params.enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fuel_performance", {
        p_subdivision: params.subdivisionId,
        p_category: params.category,
        p_machine_id: params.machineId,
        p_from: params.from,
        p_to: params.to,
      });
      if (error) throw error;
      return data as FuelPerformanceRow[];
    },
  });
}
