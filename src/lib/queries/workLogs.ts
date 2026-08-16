import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { WorkLog, WorkLogInsert } from "@/types/database";

export function useSubmitWorkLog() {
  return useMutation({
    mutationFn: async (log: WorkLogInsert) => {
      const { error } = await supabase.from("work_logs").insert(log);
      if (error) throw error;
    },
  });
}

export function useWorkLogsReport(params: {
  subdivisionId: string | null;
  from: string;
  to: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: ["work_logs_report", params.subdivisionId, params.from, params.to],
    enabled: params.enabled && !!params.subdivisionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_logs")
        .select("*, machines(machine_name, machine_type, category), staff(name), projects(project_name, work_type)")
        .eq("subdivision_id", params.subdivisionId as string)
        .gte("work_date", params.from)
        .lte("work_date", params.to)
        .order("work_date");
      if (error) throw error;
      return data as (WorkLog & {
        machines: { machine_name: string; machine_type: string; category: string } | null;
        staff: { name: string } | null;
        projects: { project_name: string; work_type: string } | null;
      })[];
    },
  });
}
