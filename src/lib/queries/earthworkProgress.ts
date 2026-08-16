import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { MachineCategory, MachineEarthworkProgressRow } from "@/types/database";

export function useMachineEarthworkProgress(params: {
  projectId: string | null;
  category: MachineCategory;
  machineType: string;
  from: string;
  to: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: [
      "machine_earthwork_progress",
      params.projectId,
      params.category,
      params.machineType,
      params.from,
      params.to,
    ],
    enabled: params.enabled && !!params.projectId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("machine_earthwork_progress", {
        p_project: params.projectId,
        p_category: params.category,
        p_machine_type: params.machineType,
        p_from: params.from,
        p_to: params.to,
      });
      if (error) throw error;
      return data as MachineEarthworkProgressRow[];
    },
  });
}

export function useSiteDieselTotal(params: {
  projectId: string | null;
  from: string;
  to: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: ["site_diesel_total", params.projectId, params.from, params.to],
    enabled: params.enabled && !!params.projectId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("site_diesel_total", {
        p_project: params.projectId,
        p_from: params.from,
        p_to: params.to,
      });
      if (error) throw error;
      return data as number;
    },
  });
}

export function useUpdateMachineCapacity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ machineId, capacity }: { machineId: string; capacity: number | null }) => {
      const { error } = await supabase.from("machines").update({ capacity }).eq("id", machineId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
    },
  });
}
