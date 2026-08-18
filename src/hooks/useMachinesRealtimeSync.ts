import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

// Keeps every open tab's machine list (work-log form, admin pages, dashboards)
// in sync the moment a machine is transferred, added, or edited elsewhere —
// without this, a driver mid-form on another device wouldn't see a machine
// disappear/appear until they manually refreshed.
export function useMachinesRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("machines-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "machines" }, () => {
        queryClient.invalidateQueries({ queryKey: ["machines"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
