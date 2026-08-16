import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { Machine, Project, Staff, Subdivision } from "@/types/database";

export function useSubdivisions() {
  return useQuery({
    queryKey: ["subdivisions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subdivisions")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Subdivision[];
    },
  });
}

export function useMachines() {
  return useQuery({
    queryKey: ["machines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machines")
        .select("*")
        .eq("active", true)
        .order("machine_name");
      if (error) throw error;
      return data as Machine[];
    },
  });
}

export function useStaff() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as Staff[];
    },
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("active", true)
        .order("project_name");
      if (error) throw error;
      return data as Project[];
    },
  });
}
