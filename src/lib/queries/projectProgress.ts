import { useQueries } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { MachineEarthworkProgressRow } from "@/types/database";

const EARLIEST_DATE = "2000-01-01";

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

// Reuses the existing machine_earthwork_progress RPC (same one ProgressDashboardPage
// calls) across both machine types over an all-time date range, and sums trips*capacity
// + hours*capacity client-side — the same computation ProgressDashboardPage already does.
async function fetchProjectVolume(projectId: string) {
  const to = todayIso();
  const [tipper, excavator] = await Promise.all([
    supabase.rpc("machine_earthwork_progress", {
      p_project: projectId,
      p_category: "Vehicle",
      p_machine_type: "टिप्पर",
      p_from: EARLIEST_DATE,
      p_to: to,
    }),
    supabase.rpc("machine_earthwork_progress", {
      p_project: projectId,
      p_category: "Machine",
      p_machine_type: "डोझर/एस्कॅव्हेटर",
      p_from: EARLIEST_DATE,
      p_to: to,
    }),
  ]);
  if (tipper.error) throw tipper.error;
  if (excavator.error) throw excavator.error;

  const tipperRows = tipper.data as MachineEarthworkProgressRow[];
  const excavatorRows = excavator.data as MachineEarthworkProgressRow[];

  return (
    tipperRows.reduce((sum, r) => sum + r.total_trips * (r.capacity ?? 0), 0) +
    excavatorRows.reduce((sum, r) => sum + r.total_hours * (r.capacity ?? 0), 0)
  );
}

export function useProjectVolumes(projectIds: string[]) {
  return useQueries({
    queries: projectIds.map((id) => ({
      queryKey: ["project_volume", id],
      queryFn: () => fetchProjectVolume(id),
    })),
  });
}
