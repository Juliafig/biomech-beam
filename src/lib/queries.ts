import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Customer, Employee, Holiday, Machine, Project } from "@/lib/lab";

export function useMachines() {
  return useQuery({
    queryKey: ["machines"],
    queryFn: async (): Promise<Machine[]> => {
      const { data, error } = await supabase
        .from("machines")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Machine[];
    },
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("nr", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Project[];
    },
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async (): Promise<Customer[]> => {
      const { data, error } = await supabase.from("customers").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });
}

export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: async (): Promise<Employee[]> => {
      const { data, error } = await supabase.from("employees").select("*").order("initials");
      if (error) throw error;
      return (data ?? []) as Employee[];
    },
  });
}

export function useHolidays() {
  return useQuery({
    queryKey: ["holidays"],
    queryFn: async (): Promise<Holiday[]> => {
      const { data, error } = await supabase.from("holidays").select("*").order("day");
      if (error) throw error;
      return (data ?? []) as Holiday[];
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Project> }) => {
      const { error } = await supabase.from("projects").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Project>) => {
      const { data, error } = await supabase
        .from("projects")
        .insert(payload as never)
        .select()
        .single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useBulkInsertProjects() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Partial<Project>[]) => {
      const { error } = await supabase.from("projects").insert(rows as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export async function ensureCustomer(name: string): Promise<string | null> {
  const clean = name.trim();
  if (!clean) return null;
  const { data } = await supabase.from("customers").select("id").eq("name", clean).maybeSingle();
  if (data?.id) return data.id as string;
  const { data: created, error } = await supabase
    .from("customers")
    .insert({ name: clean } as never)
    .select("id")
    .single();
  if (error) return null;
  return (created as { id: string }).id;
}

export async function ensureEmployee(initials: string): Promise<string | null> {
  const clean = initials.trim();
  if (!clean) return null;
  const { data } = await supabase
    .from("employees")
    .select("id")
    .eq("initials", clean)
    .maybeSingle();
  if (data?.id) return data.id as string;
  const { data: created, error } = await supabase
    .from("employees")
    .insert({ initials: clean, full_name: clean } as never)
    .select("id")
    .single();
  if (error) return null;
  return (created as { id: string }).id;
}
