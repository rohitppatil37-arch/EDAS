import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { PendingPayment, PendingPaymentInsert } from "@/types/database";

export function usePendingPayments(subdivisionId: string | null) {
  return useQuery({
    queryKey: ["pending_payments", subdivisionId],
    enabled: !!subdivisionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_payments")
        .select("*")
        .eq("subdivision_id", subdivisionId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PendingPayment[];
    },
  });
}

export function usePendingPaymentsReport(params: {
  subdivisionId: string | null;
  from: string;
  to: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: ["pending_payments_report", params.subdivisionId, params.from, params.to],
    enabled: params.enabled && !!params.subdivisionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_payments")
        .select("*")
        .eq("subdivision_id", params.subdivisionId as string)
        .gte("due_date", params.from)
        .lte("due_date", params.to)
        .order("due_date");
      if (error) throw error;
      return data as PendingPayment[];
    },
  });
}

export function useAddPendingPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (row: PendingPaymentInsert) => {
      const { error } = await supabase.from("pending_payments").insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending_payments"] });
    },
  });
}

export function useMarkPaymentPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pending_payments")
        .update({ status: "Paid" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending_payments"] });
    },
  });
}
