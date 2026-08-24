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

export type ProjectStep = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  sequence: number;
  planned_start: string | null;
  due_date: string | null;
  done: boolean;
  done_at: string | null;
  critical: boolean;
  reminder_days_before: number;
  reminder_enabled: boolean;
  reminder_sent_at: string | null;
};

export function useProjectSteps(projectId: string | null) {
  return useQuery({
    queryKey: ["project_steps", projectId],
    enabled: Boolean(projectId),
    queryFn: async (): Promise<ProjectStep[]> => {
      const { data, error } = await supabase
        .from("project_steps")
        .select("*")
        .eq("project_id", projectId as string)
        .order("sequence", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProjectStep[];
    },
  });
}

export function useAllSteps() {
  return useQuery({
    queryKey: ["project_steps", "all"],
    queryFn: async (): Promise<ProjectStep[]> => {
      const { data, error } = await supabase
        .from("project_steps")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as ProjectStep[];
    },
  });
}

export function useStepMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["project_steps"] });
  const create = useMutation({
    mutationFn: async (payload: Partial<ProjectStep>) => {
      const { error } = await supabase.from("project_steps").insert(payload as never);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ProjectStep> }) => {
      const { error } = await supabase.from("project_steps").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_steps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  return { create, update, remove };
}

export type StoredChatMessage = {
  id: string;
  role: string;
  parts: unknown;
  created_at: string;
};

export function useChatHistory() {
  return useQuery({
    queryKey: ["chat_messages"],
    queryFn: async (): Promise<StoredChatMessage[]> => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as StoredChatMessage[];
    },
  });
}

export function useClearChatHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("chat_messages").delete().neq("id", "");
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat_messages"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}
