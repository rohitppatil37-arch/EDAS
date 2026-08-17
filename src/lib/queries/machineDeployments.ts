import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { MachineDeployment, MachineDeploymentInsert } from "@/types/database";

export type MachineDeploymentRow = MachineDeployment & {
  machines: { machine_name: string; machine_type: string; subdivision_id: string } | null;
  projects: { project_name: string } | null;
  subdivisions: { name: string } | null;
};

const DEPLOYMENTS_KEY = "machine_deployments";

// All deployments touching the given subdivision, either as the machine's home
// subdivision (sent out) or the target subdivision (received). Superadmin sees all.
export function useMachineDeployments(subdivisionId: string | null, isSuperadmin: boolean) {
  return useQuery({
    queryKey: [DEPLOYMENTS_KEY, subdivisionId, isSuperadmin],
    enabled: isSuperadmin || !!subdivisionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machine_deployments")
        .select("*, machines(machine_name, machine_type, subdivision_id), projects(project_name), subdivisions(name)")
        .order("start_date", { ascending: false });
      if (error) throw error;
      const rows = data as MachineDeploymentRow[];
      if (isSuperadmin) return rows;
      return rows.filter(
        (r) => r.subdivision_id === subdivisionId || r.machines?.subdivision_id === subdivisionId
      );
    },
  });
}

// Deployments landing on a given subdivision that are active on the given date —
// used by the public form to widen the machine dropdown to include deployed-in machines.
export function useDeploymentsForSubdivisionDate(subdivisionId: string, date: string) {
  return useQuery({
    queryKey: [DEPLOYMENTS_KEY, "for_date", subdivisionId, date],
    enabled: !!subdivisionId && !!date,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machine_deployments")
        .select("*")
        .eq("subdivision_id", subdivisionId)
        .lte("start_date", date)
        .gte("end_date", date);
      if (error) throw error;
      return data as MachineDeployment[];
    },
  });
}

// The active deployment (if any) for a specific machine on a specific date, regardless
// of subdivision — used to show the driver a notice that the machine is committed elsewhere.
export function useActiveDeploymentForMachine(machineId: string, date: string) {
  return useQuery({
    queryKey: [DEPLOYMENTS_KEY, "active", machineId, date],
    enabled: !!machineId && !!date,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machine_deployments")
        .select("*, projects(project_name), subdivisions(name)")
        .eq("machine_id", machineId)
        .lte("start_date", date)
        .gte("end_date", date)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as (MachineDeployment & { projects: { project_name: string } | null; subdivisions: { name: string } | null }) | null;
    },
  });
}

export function useCreateMachineDeployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MachineDeploymentInsert) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("machine_deployments")
        .insert({ ...payload, created_by: user?.id ?? null });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DEPLOYMENTS_KEY] }),
  });
}

export function useDeleteMachineDeployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("machine_deployments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DEPLOYMENTS_KEY] }),
  });
}
