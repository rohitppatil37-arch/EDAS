import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { WorkLogInsert } from "@/types/database";

export function useSubmitWorkLog() {
  return useMutation({
    mutationFn: async (log: WorkLogInsert) => {
      const { error } = await supabase.from("work_logs").insert(log);
      if (error) throw error;
      // Attendance is auto-marked once an admin approves this entry, not at submission —
      // see useApproveWorkLog in workLogValidation.ts.
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
