import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { WorkLog, WorkLogInsert } from "@/types/database";

export function useSubmitWorkLog() {
  return useMutation({
    mutationFn: async (log: WorkLogInsert) => {
      const { error } = await supabase.from("work_logs").insert(log);
      if (error) throw error;

      const { error: attendanceError } = await supabase.rpc("mark_attendance_present", {
        p_subdivision: log.subdivision_id,
        p_staff: log.staff_id,
        p_date: log.work_date,
      });
      if (attendanceError) console.error("Attendance auto-mark failed:", attendanceError);
    },
  });
}

export async function fetchPreviousReading(machineId: string, workDate: string) {
  const { data, error } = await supabase.rpc("get_previous_end_reading", {
    p_machine: machineId,
    p_before_date: workDate,
  });
  if (error) throw error;
  return data as number | null;
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
