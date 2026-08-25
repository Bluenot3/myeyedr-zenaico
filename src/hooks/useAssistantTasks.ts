import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { nextRunFor, type Cadence } from "@/lib/assistantPrefs";

const db = supabase as any;

export interface AssistantTask {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  cadence: Cadence;
  active: boolean;
  last_run_at: string | null;
  next_run_at: string;
  runs: number;
  created_at: string;
  updated_at: string;
}

export interface AssistantTaskRun {
  id: string;
  task_id: string;
  user_id: string;
  status: string;
  result: string;
  created_at: string;
}

export function useAssistantTasks() {
  return useQuery({
    queryKey: ["assistant_tasks"],
    queryFn: async () => {
      const { data, error } = await db
        .from("assistant_tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AssistantTask[];
    },
  });
}

export function useAssistantTaskRuns(taskId: string | null) {
  return useQuery({
    queryKey: ["assistant_task_runs", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await db
        .from("assistant_task_runs")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as AssistantTaskRun[];
    },
    enabled: !!taskId,
  });
}

export function useCreateAssistantTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: { title: string; prompt: string; cadence: Cadence }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { error } = await db.from("assistant_tasks").insert([
        {
          user_id: uid,
          title: t.title,
          prompt: t.prompt,
          cadence: t.cadence,
          next_run_at: nextRunFor(t.cadence) ?? new Date().toISOString(),
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assistant_tasks"] });
      toast.success("Task scheduled");
    },
    onError: (e: any) => toast.error(e?.message || "Could not schedule task"),
  });
}

export function useUpdateAssistantTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AssistantTask> & { id: string }) => {
      const { error } = await db.from("assistant_tasks").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assistant_tasks"] }),
    onError: (e: any) => toast.error(e?.message || "Could not update task"),
  });
}

export function useDeleteAssistantTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("assistant_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assistant_tasks"] });
      toast.success("Task removed");
    },
    onError: (e: any) => toast.error(e?.message || "Could not remove task"),
  });
}

/** Records a completed run and rolls the schedule forward. */
export function useRecordTaskRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ task, result }: { task: AssistantTask; result: string }) => {
      const next = nextRunFor(task.cadence);
      await db.from("assistant_task_runs").insert([
        { task_id: task.id, user_id: task.user_id, status: "complete", result: result.slice(0, 20000) },
      ]);
      await db
        .from("assistant_tasks")
        .update({
          last_run_at: new Date().toISOString(),
          runs: (task.runs || 0) + 1,
          next_run_at: next ?? new Date(Date.now() + 365 * 86400000).toISOString(),
          active: task.cadence === "once" ? false : task.active,
        })
        .eq("id", task.id);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["assistant_tasks"] });
      qc.invalidateQueries({ queryKey: ["assistant_task_runs", vars.task.id] });
    },
  });
}

/** Tasks whose schedule has come due (used to nudge the operator, never auto-fires). */
export function dueTasks(tasks: AssistantTask[]): AssistantTask[] {
  const now = Date.now();
  return tasks.filter((t) => t.active && new Date(t.next_run_at).getTime() <= now);
}
