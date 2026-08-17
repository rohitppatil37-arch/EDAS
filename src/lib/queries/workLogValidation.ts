import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { WorkLog, WorkLogStatus } from "@/types/database";

export type WorkLogForReview = WorkLog & {
  machines: { machine_name: string; machine_type: string; category: string } | null;
  staff: { name: string; role: string } | null;
  projects: { project_name: string } | null;
};

export function useWorkLogsByStatus(subdivisionId: string | null, status: WorkLogStatus) {
  return useQuery({
    queryKey: ["work_logs_review", subdivisionId, status],
    enabled: !!subdivisionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_logs")
        .select("*, machines(machine_name, machine_type, category), staff(name, role), projects(project_name)")
        .eq("subdivision_id", subdivisionId as string)
        .eq("status", status)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as WorkLogForReview[];
    },
  });
}

export function usePendingWorkLogCount(subdivisionId: string | null) {
  return useQuery({
    queryKey: ["work_logs_pending_count", subdivisionId],
    enabled: !!subdivisionId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("work_logs")
        .select("id", { count: "exact", head: true })
        .eq("subdivision_id", subdivisionId as string)
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function invalidateAfterReview(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["work_logs_review"] });
  queryClient.invalidateQueries({ queryKey: ["work_logs_pending_count"] });
}

export function useApproveWorkLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (log: WorkLogForReview) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("work_logs")
        .update({ status: "approved", reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
        .eq("id", log.id);
      if (error) throw error;

      const { error: attendanceError } = await supabase.rpc("mark_attendance_present", {
        p_subdivision: log.subdivision_id,
        p_staff: log.staff_id,
        p_date: log.work_date,
      });
      if (attendanceError) console.error("Attendance auto-mark failed:", attendanceError);
    },
    onSuccess: () => invalidateAfterReview(queryClient),
  });
}

export function useRejectWorkLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("work_logs")
        .update({
          status: "rejected",
          reviewed_by: user?.id ?? null,
          reviewed_at: new Date().toISOString(),
          review_note: note,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAfterReview(queryClient),
  });
}
