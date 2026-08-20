import { useEffect, useMemo, useState } from "react";
import {
  Plug, RefreshCw, Database, Users, Briefcase, CheckCircle2, AlertTriangle, Loader2,
  ArrowRight, Mail, UploadCloud, Search, ExternalLink, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useDiscoverNotionDatabases, useNotionRuns, useNotionSettings, usePreviewNotionDatabase,
  useRunNotionImport, type NotionDatabase, type SyncKind,
} from "@/hooks/useIntegrations";

const KIND_META: Record<SyncKind, { label: string; blurb: string; icon: typeof Users; hsl: string }> = {
  candidates: {
    label: "Candidates",
    blurb: "Pull applicants from your Notion tracker. Matched by Notion page, then email, then name + phone — existing candidates are updated, never duplicated.",
    icon: Users,
    hsl: "197 100% 66%",
  },
  positions: {
    label: "Requisitions",
    blurb: "Pull open roles from Notion into requisitions. Matched by Notion page, then title + office, so edits in Notion update the same req.",
    icon: Briefcase,
    hsl: "160 84% 42%",
  },
};

function relative(iso: string | null | undefined) {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Integrations() {
  const { data: settings = [] } = useNotionSettings();
  const { data: runs = [] } = useNotionRuns();
  const discover = useDiscoverNotionDatabases();
  const preview = usePreviewNotionDatabase();
  const runImport = useRunNotionImport();

  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [choice, setChoice] = useState<Record<SyncKind, string>>({ candidates: "", positions: "" });
  const [previewRows, setPreviewRows] = useState<Record<string, string>[] | null>(null);
  const [previewFor, setPreviewFor] = useState<string>("");
  const [loadError, setLoadError] = useState<string>("");

  const settingFor = (kind: SyncKind) => settings.find((s) => s.kind === kind) || null;

  useEffect(() => {
    setChoice((c) => ({
      candidates: c.candidates || settingFor("candidates")?.database_id || "",
      positions: c.positions || settingFor("positions")?.database_id || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.length]);

  const loadDatabases = () => {
    setLoadError("");
    discover.mutate(undefined, {
      onSuccess: (res) => {
        setDatabases(res.databases);
        if (!res.databases.length) {
          setLoadError("No Notion databases are shared with this connection yet. In Notion, open the database → ⋯ → Connections → add the MyEyeDr connection, then load again.");
        } else {
          toast.success(`Found ${res.databases.length} Notion database${res.databases.length === 1 ? "" : "s"}`);
        }
      },
      onError: (e: any) => setLoadError(e?.message || "Could not reach Notion"),
    });
  };

  useEffect(() => { loadDatabases(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const runFor = (kind: SyncKind) => runs.find((r) => r.kind === kind) || null;

  const doPreview = (dbId: string) => {
    setPreviewFor(dbId);
    setPreviewRows(null);
    preview.mutate(dbId, {
      onSuccess: (res) => setPreviewRows(res.rows),
      onError: (e: any) => { setPreviewFor(""); toast.error(e?.message || "Could not read that database"); },
    });
  };

  const doImport = (kind: SyncKind) => {
    const database_id = choice[kind];
    if (!database_id) return toast.error("Pick a Notion database first");
    const db = databases.find((d) => d.id === database_id);
    runImport.mutate(
      { kind, database_id, database_title: db?.title || settingFor(kind)?.database_title || "" },
      {
        onSuccess: (res) =>
          toast.success(
            `${KIND_META[kind].label}: ${res.created} added, ${res.updated} updated${res.skipped ? `, ${res.skipped} skipped` : ""}${res.errors?.length ? ` · ${res.errors.length} error(s)` : ""}`,
          ),
        onError: (e: any) => toast.error(e?.message || "Sync failed"),
      },
    );
  };

  const busyKind = runImport.isPending ? (runImport.variables?.kind as SyncKind | undefined) : undefined;

  const previewColumns = useMemo(() => {
    if (!previewRows?.length) return [];
    return Object.keys(previewRows[0]).slice(0, 6);
  }, [previewRows]);

  return (
    <div className="space-y-6 animate-rise pb-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald/12 border border-emerald/30 shrink-0">
          <Plug className="h-5 w-5 text-emerald" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Integrations</h1>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            Keep this desk in step with the systems your team already lives in. Notion is connected — import candidates and requisitions
            on demand, and everything is matched so nothing duplicates.
          </p>
        </div>
      </div>

      {/* Notion */}
      <section className="glass-panel rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/70">
          <Database className="h-4 w-4 text-emerald" />
          <h2 className="font-display text-base font-semibold">Notion</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald/12 border border-emerald/30 px-2 py-0.5 text-[10px] font-medium text-emerald">
            <CheckCircle2 className="h-3 w-3" /> Connected
          </span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-8 gap-1.5 text-[11px]"
            onClick={loadDatabases}
            disabled={discover.isPending}
          >
            {discover.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Load databases
          </Button>
        </div>

        {loadError && (
          <div className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/[0.07] p-3 text-xs">
            <AlertTriangle className="h-4 w-4 text-gold shrink-0 mt-0.5" />
            <p className="text-muted-foreground">{loadError}</p>
          </div>
        )}

        <div className="p-5 grid gap-4 lg:grid-cols-2">
          {(Object.keys(KIND_META) as SyncKind[]).map((kind) => {
            const meta = KIND_META[kind];
            const Icon = meta.icon;
            const setting = settingFor(kind);
            const last = runFor(kind);
            const running = busyKind === kind;
            return (
              <div
                key={kind}
                className="rounded-2xl p-4 border"
                style={{ background: `hsl(${meta.hsl} / 0.05)`, borderColor: `hsl(${meta.hsl} / 0.25)` }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-xl"
                    style={{ background: `hsl(${meta.hsl} / 0.14)`, border: `1px solid hsl(${meta.hsl} / 0.3)` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: `hsl(${meta.hsl})` }} />
                  </div>
                  <h3 className="font-display text-sm font-semibold">{meta.label} from Notion</h3>
                  <span className="ml-auto text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                    synced {relative(setting?.last_synced_at)}
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{meta.blurb}</p>

                <label className="block mt-3 text-[10px] micro-label text-muted-foreground">Notion database</label>
                <select
                  value={choice[kind]}
                  onChange={(e) => setChoice((c) => ({ ...c, [kind]: e.target.value }))}
                  className="mt-1 w-full h-10 rounded-xl border border-border bg-background/60 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald/40"
                >
                  <option value="">
                    {setting?.database_id ? `Saved: ${setting.database_title || setting.database_id}` : "Select a database…"}
                  </option>
                  {databases.map((d) => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>

                <div className="flex items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    className="h-9 gap-1.5 text-[11px] bg-emerald text-primary-foreground hover:bg-emerald/90"
                    onClick={() => doImport(kind)}
                    disabled={runImport.isPending || (!choice[kind] && !setting?.database_id)}
                  >
                    {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    {running ? "Importing…" : "Import now"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 gap-1.5 text-[11px]"
                    onClick={() => doPreview(choice[kind] || setting?.database_id || "")}
                    disabled={preview.isPending || (!choice[kind] && !setting?.database_id)}
                  >
                    {preview.isPending && previewFor === (choice[kind] || setting?.database_id)
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <ArrowRight className="h-3.5 w-3.5" />}
                    Preview rows
                  </Button>
                </div>

                {last && (
                  <div className="mt-3 rounded-xl border border-border/70 bg-background/40 p-2.5 text-[11px]">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <History className="h-3 w-3" />
                      <span className="font-medium text-foreground">{last.status.replace(/_/g, " ")}</span>
                      <span className="ml-auto">{relative(last.created_at)}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      <span className="text-foreground font-semibold">{last.created_count}</span> added ·{" "}
                      <span className="text-foreground font-semibold">{last.updated_count}</span> updated ·{" "}
                      {last.skipped_count} skipped
                    </p>
                    {last.errors?.length > 0 && (
                      <p className="mt-1 text-destructive">{last.errors.length} row error(s): {last.errors[0]}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {previewRows && previewRows.length > 0 && (
          <div className="px-5 pb-5">
            <p className="text-[10px] micro-label text-muted-foreground mb-2">Preview · first {previewRows.length} Notion rows</p>
            <div className="overflow-x-auto rounded-xl border border-border/70">
              <table className="w-full text-[11px]">
                <thead className="bg-background/60">
                  <tr>
                    {previewColumns.map((c) => (
                      <th key={c} className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={i} className="border-t border-border/60">
                      {previewColumns.map((c) => (
                        <td key={c} className="px-3 py-2 max-w-[220px] truncate">{r[c] || "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Indeed */}
      <section className="glass-panel rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/70">
          <Mail className="h-4 w-4 text-cyan" />
          <h2 className="font-display text-base font-semibold">Indeed</h2>
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">Manual intake</span>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Indeed does not offer a self-serve applicant API for employer accounts — access requires an ATS partner agreement, so a
            direct live connection isn't available today. Until then the fastest reliable path is bulk intake, which parses each resume
            with the same AI pipeline and dedupes against everyone already here.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: UploadCloud, title: "Bulk resume upload", body: "Save resumes from your Indeed applicant emails, then drop the whole folder into Pipeline → Bulk upload. Every file is parsed and scored." },
              { icon: Mail, title: "Indeed email alerts", body: "Keep new-applicant notifications on. The attached resume is all the parser needs — no manual typing." },
              { icon: ExternalLink, title: "ATS partner route", body: "If MyEyeDr signs an Indeed ATS/Apply partner agreement, feed credentials can be wired in here for true live sync." },
            ].map((c) => (
              <div key={c.title} className="rounded-xl border border-border/70 bg-background/40 p-3">
                <c.icon className="h-4 w-4 text-cyan" />
                <p className="mt-2 text-xs font-medium text-foreground">{c.title}</p>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
