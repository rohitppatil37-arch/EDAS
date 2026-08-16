import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { WorkLogInsert } from "@/types/database";

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
