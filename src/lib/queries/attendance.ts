import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { Attendance, AttendanceUpsert } from "@/types/database";

export function useAttendanceForDate(subdivisionId: string | null, date: string) {
  return useQuery({
    queryKey: ["attendance", subdivisionId, date],
    enabled: !!subdivisionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("subdivision_id", subdivisionId as string)
        .eq("attendance_date", date);
      if (error) throw error;
      return data as Attendance[];
    },
  });
}

export function useAttendanceReport(params: {
  subdivisionId: string | null;
  from: string;
  to: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: ["attendance_report", params.subdivisionId, params.from, params.to],
    enabled: params.enabled && !!params.subdivisionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*, staff(name, role)")
        .eq("subdivision_id", params.subdivisionId as string)
        .gte("attendance_date", params.from)
        .lte("attendance_date", params.to)
        .order("attendance_date");
      if (error) throw error;
      return data as (Attendance & { staff: { name: string; role: string } | null })[];
    },
  });
}

export function useUpsertAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rows: AttendanceUpsert[]) => {
      const { error } = await supabase
        .from("attendance")
        .upsert(rows, { onConflict: "staff_id,attendance_date" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}
