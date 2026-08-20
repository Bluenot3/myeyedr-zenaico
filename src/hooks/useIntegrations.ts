import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

/* ------------------------------- shared types ------------------------------ */

export type SyncKind = "candidates" | "positions";

export interface NotionDatabase {
  id: string;
  title: string;
  url: string;
  properties: { name: string; type: string }[];
}

export interface NotionSyncSetting {
  id: string;
  kind: SyncKind;
  database_id: string;
  database_title: string;
  field_map: Record<string, string>;
  enabled: boolean;
  last_synced_at: string | null;
}

export interface NotionSyncRun {
  id: string;
  kind: string;
  status: string;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  errors: string[];
  message: string;
  created_at: string;
}

export interface ImportResult {
  ok: boolean;
  kind: SyncKind;
  read: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/** Reads the real failure text out of an edge-function error. */
async function fnError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const raw = await error.context.text().catch(() => "");
    try {
      const parsed = JSON.parse(raw);
      return parsed?.error || parsed?.message || raw || error.message;
    } catch {
      return raw || error.message;
    }
  }
  return (error as Error)?.message || "Request failed";
}

async function callSync<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("notion-sync", { body });
  if (error) throw new Error(await fnError(error));
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

/* --------------------------------- queries -------------------------------- */

export function useNotionSettings() {
  return useQuery({
    queryKey: ["notion_sync_settings"],
    queryFn: async (): Promise<NotionSyncSetting[]> => {
      const { data, error } = await supabase.from("notion_sync_settings").select("*");
      if (error) throw error;
      return (data ?? []) as unknown as NotionSyncSetting[];
    },
  });
}

export function useNotionRuns(limit = 8) {
  return useQuery({
    queryKey: ["notion_sync_runs", limit],
    queryFn: async (): Promise<NotionSyncRun[]> => {
      const { data, error } = await supabase
        .from("notion_sync_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as NotionSyncRun[];
    },
  });
}

export function useDiscoverNotionDatabases() {
  return useMutation({
    mutationFn: () => callSync<{ databases: NotionDatabase[] }>({ action: "discover" }),
  });
}

export function usePreviewNotionDatabase() {
  return useMutation({
    mutationFn: (database_id: string) =>
      callSync<{ rows: Record<string, string>[]; properties: string[] }>({ action: "preview", database_id }),
  });
}

export function useRunNotionImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { kind: SyncKind; database_id: string; database_title?: string }) =>
      callSync<ImportResult>({ action: "import", ...vars }),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["notion_sync_settings"] });
      qc.invalidateQueries({ queryKey: ["notion_sync_runs"] });
      qc.invalidateQueries({ queryKey: [vars.kind === "candidates" ? "candidates" : "positions"] });
      qc.invalidateQueries({ queryKey: ["login_brief"] });
    },
  });
}

/* ------------------------------- login brief ------------------------------- */

export interface LoginBrief {
  brief: string;
  headline: string;
  stats: Record<string, number>;
  generated_at: string;
  cached?: boolean;
  stale?: boolean;
  warning?: string;
}

export function useLoginBrief() {
  return useQuery({
    queryKey: ["login_brief"],
    queryFn: async (): Promise<LoginBrief> => {
      const { data, error } = await supabase.functions.invoke("login-brief", { body: {} });
      if (error) throw new Error(await fnError(error));
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as LoginBrief;
    },
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}

export function useRefreshLoginBrief() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<LoginBrief> => {
      const { data, error } = await supabase.functions.invoke("login-brief", { body: { force: true } });
      if (error) throw new Error(await fnError(error));
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as LoginBrief;
    },
    onSuccess: (data) => qc.setQueryData(["login_brief"], data),
  });
}
