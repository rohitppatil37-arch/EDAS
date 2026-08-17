import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { MachineCategory, MachineDieselRow, MachineEarthworkProgressRow } from "@/types/database";

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

export function useMachineDieselTotal(params: {
  projectId: string | null;
  from: string;
  to: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: ["machine_diesel_total", params.projectId, params.from, params.to],
    enabled: params.enabled && !!params.projectId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("machine_diesel_total", {
        p_project: params.projectId,
        p_from: params.from,
        p_to: params.to,
      });
      if (error) throw error;
      return data as MachineDieselRow[];
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

export function useUpdateMachineRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ machineId, rate }: { machineId: string; rate: number | null }) => {
      const { error } = await supabase.from("machines").update({ rate }).eq("id", machineId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
    },
  });
}
