import { useState, useMemo, useRef } from "react";
import {
  Swords, Brain, Upload, Loader2, FileText, Sparkles, Trophy, Crown,
  Check, X as XIcon, TrendingUp, Zap, Save, Quote, AlertTriangle, Star,
  Target, Wand2, UserCheck, Plus, Trash2, Gem, Radar as RadarIcon, ArrowUpDown,
  ShieldAlert, Lightbulb, Gauge, ListChecks,
} from "lucide-react";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import ScoreRing from "./ScoreRing";
import { useCandidates, Candidate, usePositions } from "@/hooks/useRecruiting";
import { useAgents, useTranscripts, useSaveTranscript, analyzeTranscript, ScreeningTranscript } from "@/hooks/useAgents";
import {
  useGoldenProfiles, useSaveGoldenProfile, useDeleteGoldenProfile, generateGoldenProfile,
} from "@/hooks/useRecruiting";
import {
  GoldenProfile, GoldenDimension, GOLDEN_DIM_KEYS, GOLDEN_DIM_LABELS,
  DEFAULT_DIMENSIONS, blankGolden, goldenFromCandidate, computeGoldenFit, GoldenFit,
} from "@/lib/golden";
import { fileToBase64 } from "@/lib/storage";
import { initials, scoreTone, TONE_HSL, relativeTime } from "@/lib/recruiting";

const TIERS = [
  { min: 90, label: "Elite", color: "gold" },
  { min: 78, label: "Gold", color: "lime" },
  { min: 62, label: "Silver", color: "emerald" },
  { min: 45, label: "Bronze", color: "cyan" },
  { min: 0, label: "Prospect", color: "orange" },
];
function tierOf(score: number) {
  return TIERS.find((t) => score >= t.min)!;
}

export default function DecisionTool() {
  const [mode, setMode] = useState<"golden" | "arena" | "intel">("golden");
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight">Decision Engine</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Define the perfect hire, benchmark every applicant against that golden standard, then send
            your finalists into a data-rich arena so the final call is earned, not guessed.
          </p>
        </div>
        <div className="flex flex-wrap rounded-xl border border-border p-1 glass-panel self-start">
          <TabBtn active={mode === "golden"} onClick={() => setMode("golden")} icon={<Gem className="h-4 w-4" />} label="Golden Standard" />
          <TabBtn active={mode === "arena"} onClick={() => setMode("arena")} icon={<Swords className="h-4 w-4" />} label="Arena" />
          <TabBtn active={mode === "intel"} onClick={() => setMode("intel")} icon={<Brain className="h-4 w-4" />} label="Intelligence" />
        </div>
      </div>
      {mode === "golden" ? <GoldenMode /> : mode === "arena" ? <ArenaMode /> : <IntelligenceMode />}
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm transition-all tap-target ${
        active ? "bg-emerald/15 text-emerald border border-emerald/30" : "text-muted-foreground border border-transparent"
      }`}
    >
      {icon} {label}
    </button>
  );
}

/* ============================ Golden Standard Mode ============================ */
function GoldenMode() {
  const { data: candidates = [] } = useCandidates();
  const { data: positions = [] } = usePositions();
  const { data: goldens = [] } = useGoldenProfiles();
  const save = useSaveGoldenProfile();
  const del = useDeleteGoldenProfile();

  const [activeId, setActiveId] = useState<string>("");
  const [draft, setDraft] = useState<(Partial<GoldenProfile> & { id?: string }) | null>(null);

  const active = goldens.find((g) => g.id === activeId) || goldens[0];
  const activeGolden = active as GoldenProfile | undefined;

  // roles derived from positions + candidates for the AI generator
  const roleOptions = useMemo(() => {
    const set = new Set<string>();
    positions.forEach((p) => p.title && set.add(p.title));
    candidates.forEach((c) => c.applied_role && set.add(c.applied_role));
    return Array.from(set).sort();
  }, [positions, candidates]);

  return (
    <div className="space-y-5">
      {/* Builder + library */}
      {draft ? (
        <GoldenEditor
          draft={draft}
          setDraft={setDraft}
          onSave={async () => {
            const saved = await save.mutateAsync(draft);
            setDraft(null);
            setActiveId(saved.id);
          }}
          saving={save.isPending}
          candidates={candidates}
        />
      ) : (
        <GoldenLibrary
          goldens={goldens as GoldenProfile[]}
          activeId={active?.id || ""}
          setActiveId={setActiveId}
          onNew={(d) => setDraft(d)}
          onEdit={(g) => setDraft(g)}
          onDelete={(id) => del.mutate(id)}
          candidates={candidates}
          positions={positions}
          roleOptions={roleOptions}
        />
      )}

      {/* Benchmark leaderboard */}
      {!draft && activeGolden && (
        <GoldenLeaderboard golden={activeGolden} candidates={candidates} />
      )}
      {!draft && !activeGolden && (
        <div className="glass-panel rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <Gem className="h-10 w-10 text-emerald/40" />
          Define a golden example above to benchmark every candidate against your perfect hire.
        </div>
      )}
    </div>
  );
}

function GoldenLibrary({
  goldens, activeId, setActiveId, onNew, onEdit, onDelete, candidates, positions, roleOptions,
}: {
  goldens: GoldenProfile[];
  activeId: string;
  setActiveId: (id: string) => void;
  onNew: (d: Partial<GoldenProfile> & { id?: string }) => void;
  onEdit: (g: GoldenProfile) => void;
  onDelete: (id: string) => void;
  candidates: Candidate[];
  positions: { id: string; title: string; requirements?: string; description?: string }[];
  roleOptions: string[];
}) {
  const [genRole, setGenRole] = useState<string>(roleOptions[0] || "Patient Service Coordinator");
  const [sourceCandidate, setSourceCandidate] = useState<string>("");
  const [busy, setBusy] = useState<string>("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const positionForRole = positions.find((p) => p.title === genRole);

  const aiGenerate = async () => {
    setBusy("ai");
    try {
      const ctx = positionForRole
        ? [positionForRole.requirements, positionForRole.description].filter(Boolean).join("\n")
        : "";
      const profile = await generateGoldenProfile({ mode: "from_position", role: genRole, context: ctx });
      onNew({ ...blankGolden(genRole), ...profile, position_id: positionForRole?.id ?? null, source: "generated" });
      toast.success("AI drafted your golden example");
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setBusy("");
    }
  };

  const fromCandidate = () => {
    const c = candidates.find((x) => x.id === sourceCandidate);
    if (!c) { toast.error("Pick a candidate first"); return; }
    onNew({ ...blankGolden(c.applied_role || ""), ...goldenFromCandidate(c) });
  };

  const fromResume = async (f: File) => {
    setBusy("upload");
    try {
      const fileBase64 = await fileToBase64(f);
      const profile = await generateGoldenProfile({
        mode: "from_resume", role: genRole, fileBase64, mimeType: f.type || "application/pdf",
      });
      onNew({ ...blankGolden(genRole), ...profile, position_id: positionForRole?.id ?? null, source: "upload" });
      toast.success("Golden example built from résumé");
    } catch (e: any) {
      toast.error(e.message || "Could not read résumé");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="glass-panel rounded-2xl border border-emerald/25 p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Gem className="h-4 w-4 text-emerald" /> Golden example — your perfect hire
      </div>
      <p className="text-xs text-muted-foreground -mt-1">
        Teach the system what "great" looks like for this role. Every applicant is then scored on how close they come.
      </p>

      {/* Create methods */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-background/30 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium"><Wand2 className="h-3.5 w-3.5 text-cyan" /> AI generate</div>
          <Select value={genRole} onValueChange={setGenRole}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent className="max-h-64">
              {roleOptions.length === 0 && <SelectItem value="Patient Service Coordinator">Patient Service Coordinator</SelectItem>}
              {roleOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={aiGenerate} disabled={busy === "ai"} size="sm" className="w-full h-8 bg-cyan/15 text-cyan border border-cyan/30 hover:bg-cyan/25">
            {busy === "ai" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Sparkles className="h-3.5 w-3.5 mr-1" /> Draft ideal</>}
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-background/30 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium"><UserCheck className="h-3.5 w-3.5 text-emerald" /> From candidate</div>
          <Select value={sourceCandidate} onValueChange={setSourceCandidate}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pick a strong one" /></SelectTrigger>
            <SelectContent className="max-h-64">
              {candidates.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={fromCandidate} size="sm" className="w-full h-8 bg-emerald/15 text-emerald border border-emerald/30 hover:bg-emerald/25">
            <Star className="h-3.5 w-3.5 mr-1" /> Set as golden
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-background/30 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium"><Upload className="h-3.5 w-3.5 text-gold" /> Upload résumé</div>
          <p className="text-[10px] text-muted-foreground leading-tight">A dream résumé for the <b>{genRole}</b> role.</p>
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" hidden onChange={(e) => e.target.files?.[0] && fromResume(e.target.files[0])} />
          <Button onClick={() => fileRef.current?.click()} disabled={busy === "upload"} size="sm" className="w-full h-8 bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25">
            {busy === "upload" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Upload className="h-3.5 w-3.5 mr-1" /> Upload & analyze</>}
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-background/30 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium"><Plus className="h-3.5 w-3.5 text-muted-foreground" /> From scratch</div>
          <p className="text-[10px] text-muted-foreground leading-tight">Hand-tune every target and skill yourself.</p>
          <Button onClick={() => onNew(blankGolden(genRole))} size="sm" variant="outline" className="w-full h-8">
            <Plus className="h-3.5 w-3.5 mr-1" /> Build manually
          </Button>
        </div>
      </div>

      {/* Saved goldens */}
      {goldens.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="text-[10px] micro-label text-muted-foreground">Saved golden examples ({goldens.length})</div>
          <div className="flex flex-wrap gap-2">
            {goldens.map((g) => {
              const on = g.id === activeId;
              return (
                <div key={g.id} className={`group flex items-center gap-2 rounded-xl border px-3 py-2 transition-all ${on ? "border-emerald/50 bg-emerald/10" : "border-border bg-background/30"}`}>
                  <button onClick={() => setActiveId(g.id)} className="flex items-center gap-2 text-left">
                    <Gem className={`h-4 w-4 ${on ? "text-emerald" : "text-muted-foreground"}`} />
                    <div>
                      <p className="text-xs font-medium leading-tight">{g.name}</p>
                      <p className="text-[10px] text-muted-foreground">{g.role || "Any role"} · {relativeTime(g.created_at)}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100">
                    <button onClick={() => onEdit(g)} className="p-1 rounded hover:bg-muted/50" title="Edit"><Gauge className="h-3.5 w-3.5" /></button>
                    <button onClick={() => onDelete(g.id)} className="p-1 rounded hover:bg-destructive/15 text-destructive" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function GoldenEditor({
  draft, setDraft, onSave, saving, candidates,
}: {
  draft: Partial<GoldenProfile> & { id?: string };
  setDraft: (d: (Partial<GoldenProfile> & { id?: string }) | null) => void;
  onSave: () => void;
  saving: boolean;
  candidates: Candidate[];
}) {
  const set = (patch: Partial<GoldenProfile>) => setDraft({ ...draft, ...patch });
  const dims = draft.dimensions?.length ? draft.dimensions : DEFAULT_DIMENSIONS;

  const setDim = (key: string, patch: Partial<GoldenDimension>) =>
    set({ dimensions: dims.map((d) => (d.key === key ? { ...d, ...patch } : d)) });

  return (
    <div className="glass-panel rounded-2xl border border-emerald/30 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium"><Gem className="h-4 w-4 text-emerald" /> {draft.id ? "Edit" : "New"} golden example</div>
        <button onClick={() => setDraft(null)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><XIcon className="h-3.5 w-3.5" /> Cancel</button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label className="text-xs">Name</Label><Input value={draft.name || ""} onChange={(e) => set({ name: e.target.value })} /></div>
        <div><Label className="text-xs">Target role</Label><Input value={draft.role || ""} onChange={(e) => set({ role: e.target.value })} /></div>
      </div>
      <div><Label className="text-xs">Ideal profile summary</Label><Textarea rows={3} value={draft.summary || ""} onChange={(e) => set({ summary: e.target.value })} placeholder="What does the perfect hire look like?" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Ideal years of experience</Label><Input type="number" value={draft.ideal_years_experience ?? 0} onChange={(e) => set({ ideal_years_experience: Number(e.target.value) })} /></div>
      </div>

      {/* Dimension targets */}
      <div>
        <div className="text-[10px] micro-label text-muted-foreground mb-2">Scoring targets — how high the bar sits on each dimension, and how much it matters</div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
          {dims.map((d) => (
            <div key={d.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{d.label}</span>
                <span className="font-mono text-emerald">target {d.target} · w{d.weight}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground w-10">level</span>
                <Slider value={[d.target]} min={0} max={100} step={5} onValueChange={([v]) => setDim(d.key, { target: v })} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground w-10">weight</span>
                <Slider value={[d.weight]} min={1} max={10} step={1} onValueChange={([v]) => setDim(d.key, { weight: v })} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <SkillEditor label="Must-have skills" tone="emerald" items={draft.must_have_skills || []} onChange={(v) => set({ must_have_skills: v })} />
      <SkillEditor label="Nice-to-have skills" tone="cyan" items={draft.nice_to_have_skills || []} onChange={(v) => set({ nice_to_have_skills: v })} />
      <SkillEditor label="Red flags" tone="orange" items={draft.red_flags || []} onChange={(v) => set({ red_flags: v })} />
      <SkillEditor label="Interview focus" tone="gold" items={draft.interview_focus || []} onChange={(v) => set({ interview_focus: v })} />

      <div>
        <Label className="text-xs">Mock ideal résumé (optional reference)</Label>
        <Textarea rows={6} value={draft.resume_text || ""} onChange={(e) => set({ resume_text: e.target.value })} className="font-mono text-xs" placeholder="A reference résumé for the perfect candidate — the AI can generate this for you." />
      </div>

      <Button onClick={onSave} disabled={saving} className="w-full bg-emerald/15 text-emerald border border-emerald/30 hover:bg-emerald/25">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
        Save golden example
      </Button>
    </div>
  );
}

function SkillEditor({ label, tone, items, onChange }: { label: string; tone: string; items: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !items.includes(v)) onChange([...items, v]);
    setInput("");
  };
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
        {items.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px]"
            style={{ color: `hsl(var(--${tone}))`, background: `hsl(var(--${tone})/0.1)`, border: `1px solid hsl(var(--${tone})/0.3)` }}>
            {s}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))}><XIcon className="h-3 w-3" /></button>
          </span>
        ))}
        {items.length === 0 && <span className="text-[11px] text-muted-foreground">None yet</span>}
      </div>
      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder={`Add ${label.toLowerCase()}…`} className="h-8 text-xs" />
        <Button type="button" size="sm" variant="outline" className="h-8" onClick={add}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

function GoldenLeaderboard({ golden, candidates }: { golden: GoldenProfile; candidates: Candidate[] }) {
  const [roleOnly, setRoleOnly] = useState(true);
  const [focusId, setFocusId] = useState<string>("");

  const pool = useMemo(() => {
    let list = candidates;
    if (roleOnly) {
      if (golden.position_id) {
        const byPos = candidates.filter((c) => c.position_id === golden.position_id);
        if (byPos.length) list = byPos;
      } else if (golden.role) {
        const r = golden.role.toLowerCase();
        const byRole = candidates.filter((c) => (c.applied_role || "").toLowerCase().includes(r) || r.includes((c.applied_role || "").toLowerCase()));
        if (byRole.length) list = byRole;
      }
    }
    return list.filter((c) => c.id !== golden.candidate_id);
  }, [candidates, golden, roleOnly]);

  const ranked: GoldenFit[] = useMemo(
    () => pool.map((c) => computeGoldenFit(c, golden)).sort((a, b) => b.fit - a.fit),
    [pool, golden]
  );

  const focus = ranked.find((r) => r.candidate.id === focusId) || ranked[0];

  const radarData = useMemo(() => {
    if (!focus) return [];
    const dims = golden.dimensions?.length ? golden.dimensions : DEFAULT_DIMENSIONS;
    return dims.map((d) => ({
      dim: d.label,
      Golden: d.target,
      [focus.candidate.full_name.split(" ")[0]]: focus.vector[d.key] ?? 0,
    }));
  }, [focus, golden]);

  const focusName = focus?.candidate.full_name.split(" ")[0] || "Candidate";

  return (
    <div className="space-y-5">
      {/* Golden summary header */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald/40 p-5 foil-surface">
        <div className="relative flex flex-col lg:flex-row gap-5">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Gem className="h-5 w-5 text-emerald" />
              <h2 className="font-display text-2xl">{golden.name}</h2>
              <span className="text-[10px] micro-label rounded-full px-2 py-0.5 bg-emerald/10 text-emerald border border-emerald/30">{golden.source}</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">{golden.summary || "No summary yet."}</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(golden.must_have_skills || []).slice(0, 8).map((s, i) => <Chip key={i} label={s} tone="emerald" />)}
            </div>
          </div>
          <div className="flex gap-4 shrink-0">
            <MiniStat label="Ideal exp." value={`${golden.ideal_years_experience || 0}y`} />
            <MiniStat label="Benchmarked" value={String(ranked.length)} />
            <MiniStat label="Golden matches" value={String(ranked.filter((r) => r.fit >= 90).length)} />
          </div>
        </div>
      </div>

      {golden.interview_focus?.length > 0 && (
        <div className="glass-panel rounded-2xl border border-gold/30 p-4">
          <div className="flex items-center gap-2 text-sm font-medium mb-2"><Lightbulb className="h-4 w-4 text-gold" /> What to verify with every candidate</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {golden.interview_focus.map((q, i) => (
              <div key={i} className="flex gap-2 text-xs text-muted-foreground"><Check className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" /> {q}</div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm font-medium"><ArrowUpDown className="h-4 w-4 text-emerald" /> Ranked against the golden standard</div>
        <button onClick={() => setRoleOnly((v) => !v)} className={`text-xs rounded-full px-3 py-1 border transition-all ${roleOnly ? "bg-emerald/15 text-emerald border-emerald/30" : "bg-background/40 text-muted-foreground border-border"}`}>
          {roleOnly ? "Matching this role only" : "All candidates"}
        </button>
      </div>

      {ranked.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No candidates to benchmark yet.
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-5">
          {/* Ranked list */}
          <div className="lg:col-span-3 space-y-2">
            {ranked.map((r, i) => (
              <FitRow key={r.candidate.id} r={r} rank={i} active={focus?.candidate.id === r.candidate.id} onClick={() => setFocusId(r.candidate.id)} />
            ))}
          </div>

          {/* Radar + gap detail */}
          <div className="lg:col-span-2 space-y-4">
            {focus && (
              <>
                <div className="glass-panel rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-sm font-medium"><RadarIcon className="h-4 w-4 text-cyan" /> {focusName} vs Golden</div>
                    <ScoreRing score={focus.fit} size={46} label="fit" />
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius="72%">
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="dim" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Golden" dataKey="Golden" stroke="hsl(152 62% 50%)" fill="hsl(152 62% 50%)" fillOpacity={0.18} />
                        <Radar name={focusName} dataKey={focusName} stroke="hsl(200 100% 70%)" fill="hsl(200 100% 70%)" fillOpacity={0.28} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {focus.gaps.length > 0 && (
                  <div className="glass-panel rounded-2xl border border-orange/25 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium mb-2"><TrendingUp className="h-4 w-4 text-orange" /> Gaps to probe</div>
                    <div className="space-y-2">
                      {focus.gaps.map((g) => (
                        <div key={g.key}>
                          <div className="flex justify-between text-[11px] text-muted-foreground mb-0.5">
                            <span>{g.label}</span><span className="font-mono">{g.value} / {g.target}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted/40 overflow-hidden relative">
                            <div className="h-full rounded-full bg-orange/60" style={{ width: `${g.value}%` }} />
                            <div className="absolute top-0 h-full w-px bg-emerald" style={{ left: `${g.target}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(focus.mustMissing.length > 0 || focus.mustMatched.length > 0) && (
                  <div className="glass-panel rounded-2xl border border-border p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium"><ListChecks className="h-4 w-4 text-emerald" /> Must-have coverage</div>
                    <div className="flex flex-wrap gap-1.5">
                      {focus.mustMatched.map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-emerald bg-emerald/10 border border-emerald/30"><Check className="h-3 w-3" />{s}</span>
                      ))}
                      {focus.mustMissing.map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-orange bg-orange/10 border border-orange/30"><XIcon className="h-3 w-3" />{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {golden.red_flags?.length > 0 && (
                  <div className="glass-panel rounded-2xl border border-orange/25 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium mb-2"><ShieldAlert className="h-4 w-4 text-orange" /> Watch for</div>
                    <div className="space-y-1.5">
                      {golden.red_flags.map((f, i) => (
                        <div key={i} className="flex gap-2 text-xs text-muted-foreground"><AlertTriangle className="h-3 w-3 text-orange shrink-0 mt-0.5" /> {f}</div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FitRow({ r, rank, active, onClick }: { r: GoldenFit; rank: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${active ? "border-emerald/50 bg-emerald/10" : "border-border bg-background/30 hover:border-emerald/30"}`}>
      <div className="flex items-center justify-center w-6 text-sm font-display font-bold text-muted-foreground">{rank + 1}</div>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 text-xs font-semibold shrink-0">{initials(r.candidate.full_name)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{r.candidate.full_name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{r.candidate.applied_role || "—"}</p>
        <div className="mt-1.5 h-1.5 rounded-full bg-muted/40 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${r.fit}%`, background: `hsl(${r.hsl})`, boxShadow: `0 0 8px hsl(${r.hsl}/0.5)` }} />
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-display text-xl font-bold" style={{ color: `hsl(${r.hsl})` }}>{r.fit}</div>
        <div className="text-[9px] micro-label" style={{ color: `hsl(${r.hsl})` }}>{r.verdict}</div>
      </div>
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-2xl">{value}</div>
      <div className="text-[9px] micro-label text-muted-foreground">{label}</div>
    </div>
  );
}

/* ============================ Intelligence Mode ============================ */
function IntelligenceMode() {
  const { data: candidates = [] } = useCandidates();
  const { data: agents = [] } = useAgents();
  const [candidateId, setCandidateId] = useState<string>("");
  const candidate = candidates.find((c) => c.id === candidateId);
  const { data: transcripts = [] } = useTranscripts(candidateId || null);
  const save = useSaveTranscript();

  const [title, setTitle] = useState("Interview Transcript");
  const [text, setText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onFile = async (f: File) => {
    const content = await f.text();
    setText(content);
    setTitle(f.name.replace(/\.[^.]+$/, ""));
    toast.success("Transcript loaded");
  };

  const run = async () => {
    if (!text.trim()) { toast.error("Paste or upload a transcript first"); return; }
    if (!candidate) { toast.error("Select a candidate"); return; }
    setAnalyzing(true);
    setResult(null);
    try {
      const goals = agents.flatMap((a) => a.extraction_goals ?? []);
      const analysis = await analyzeTranscript({
        transcript: text,
        candidate: { full_name: candidate.full_name, applied_role: candidate.applied_role },
        goals: Array.from(new Set(goals)),
      });
      setResult(analysis);
      toast.success("Transcript analyzed");
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const commit = async () => {
    if (!result || !candidate) return;
    await save.mutateAsync({
      candidate_id: candidate.id,
      source: "upload",
      title,
      transcript: text,
      summary: result.summary || "",
      sentiment: result.sentiment || "neutral",
      fit_score: typeof result.fit_score === "number" ? Math.round(result.fit_score) : null,
      recommendation: result.recommendation || "",
      extracted: { ...(result.extracted || {}), highlights: result.highlights, concerns: result.concerns },
    });
    setText(""); setResult(null); setTitle("Interview Transcript");
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* Intake */}
      <div className="glass-panel rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium"><Upload className="h-4 w-4 text-cyan" /> Transcript intake</div>
        <div>
          <Label className="text-xs">Candidate</Label>
          <Select value={candidateId} onValueChange={(v) => { setCandidateId(v); setResult(null); }}>
            <SelectTrigger><SelectValue placeholder="Select a candidate" /></SelectTrigger>
            <SelectContent className="max-h-64">
              {candidates.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.full_name} · {c.applied_role || "—"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs">Transcript</Label>
            <button onClick={() => fileRef.current?.click()} className="text-[11px] text-emerald hover:underline flex items-center gap-1">
              <Upload className="h-3 w-3" /> Upload .txt / .vtt
            </button>
            <input ref={fileRef} type="file" accept=".txt,.vtt,.srt,.md,text/plain" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </div>
          <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the interview or phone-screen transcript here. Speaker labels help but aren't required." className="font-mono text-xs" />
        </div>
        <Button onClick={run} disabled={analyzing} className="w-full bg-emerald/15 text-emerald border border-emerald/30 hover:bg-emerald/25">
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
          Extract intelligence
        </Button>
      </div>

      {/* Result */}
      <div className="space-y-5">
        {result ? (
          <div className="glass-panel rounded-2xl border border-emerald/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium"><Brain className="h-4 w-4 text-emerald" /> Extracted intelligence</div>
              <ScoreRing score={Math.round(result.fit_score || 0)} size={52} label="fit" />
            </div>
            <p className="text-sm text-muted-foreground">{result.summary}</p>
            <div className="flex flex-wrap gap-2">
              <Chip label={`Sentiment · ${result.sentiment}`} tone={result.sentiment === "positive" ? "emerald" : result.sentiment === "negative" ? "orange" : "cyan"} />
              <Chip label={`Rec · ${result.recommendation}`} tone={result.recommendation === "advance" ? "emerald" : result.recommendation === "reject" ? "orange" : "gold"} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(result.extracted || {}).filter(([k]) => !["key_skills", "notable_quotes"].includes(k)).map(([k, v]) => (
                v ? <DataCell key={k} label={k.replace(/_/g, " ")} value={String(v)} /> : null
              ))}
            </div>
            {result.extracted?.key_skills?.length > 0 && (
              <div>
                <div className="text-[10px] micro-label text-muted-foreground mb-1.5">Key skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {result.extracted.key_skills.map((s: string, i: number) => <Chip key={i} label={s} tone="lime" />)}
                </div>
              </div>
            )}
            {result.extracted?.notable_quotes?.length > 0 && (
              <div className="space-y-1.5">
                {result.extracted.notable_quotes.slice(0, 3).map((q: string, i: number) => (
                  <div key={i} className="flex gap-2 text-xs text-muted-foreground italic border-l-2 border-gold/40 pl-2">
                    <Quote className="h-3 w-3 shrink-0 text-gold/60 mt-0.5" /> {q}
                  </div>
                ))}
              </div>
            )}
            <Button onClick={commit} disabled={save.isPending} className="w-full bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save to candidate file
            </Button>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Brain className="h-8 w-8 text-muted-foreground/40" />
            Extracted answers, skills, quotes and a fit score will appear here.
          </div>
        )}

        {/* Saved transcripts */}
        {candidateId && transcripts.length > 0 && (
          <div className="glass-panel rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 text-sm font-medium mb-3"><FileText className="h-4 w-4 text-gold" /> On file ({transcripts.length})</div>
            <div className="space-y-2">
              {transcripts.map((t) => <SavedTranscriptRow key={t.id} t={t} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SavedTranscriptRow({ t }: { t: ScreeningTranscript }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-background/30 overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left">
        {t.fit_score != null && <ScoreRing score={t.fit_score} size={40} />}
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">{t.title}</p>
          <p className="text-[11px] text-muted-foreground">{relativeTime(t.created_at)} · {t.recommendation || t.sentiment}</p>
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 text-xs text-muted-foreground space-y-2 border-t border-border/60 pt-2">
          <p>{t.summary}</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(t.extracted || {}).filter(([k, v]) => v && !Array.isArray(v)).map(([k, v]) => (
              <span key={k} className="rounded-full bg-muted/40 border border-border px-2 py-0.5">{k.replace(/_/g, " ")}: {String(v)}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/30 px-3 py-2">
      <div className="text-[9px] micro-label text-muted-foreground">{label}</div>
      <div className="text-xs text-foreground mt-0.5">{value}</div>
    </div>
  );
}

function Chip({ label, tone }: { label: string; tone: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] capitalize"
      style={{ color: `hsl(var(--${tone}))`, background: `hsl(var(--${tone})/0.1)`, border: `1px solid hsl(var(--${tone})/0.3)` }}
    >
      {label}
    </span>
  );
}

/* ============================ Arena Mode ============================ */
interface Contender {
  candidate: Candidate;
  power: number;
  dims: { label: string; value: number }[];
  transcripts: ScreeningTranscript[];
}

function ArenaMode() {
  const { data: candidates = [] } = useCandidates();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 4 ? s : [...s, id]));

  return (
    <div className="space-y-5">
      <div className="glass-panel rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-medium"><Swords className="h-4 w-4 text-gold" /> Choose contenders (up to 4)</div>
          <span className="text-xs text-muted-foreground">{selected.length} selected</span>
        </div>
        <ScrollArea className="max-h-40">
          <div className="flex flex-wrap gap-2">
            {candidates.map((c) => {
              const on = selected.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 text-sm transition-all tap-target ${
                    on ? "bg-emerald/15 text-emerald border border-emerald/40" : "bg-background/40 border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/50 text-[10px] font-semibold">{initials(c.full_name)}</span>
                  {c.full_name}
                  {on && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {selected.length < 2 ? (
        <div className="glass-panel rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <Trophy className="h-10 w-10 text-gold/40" />
          Pick at least two candidates to open the arena.
        </div>
      ) : (
        <Arena candidateIds={selected} candidates={candidates} />
      )}
    </div>
  );
}

const RADAR_COLORS = ["200 100% 70%", "152 62% 50%", "43 90% 62%", "280 80% 70%"];

function Arena({ candidateIds, candidates }: { candidateIds: string[]; candidates: Candidate[] }) {
  // Pull transcripts for each contender
  const t0 = useTranscripts(candidateIds[0] || null);
  const t1 = useTranscripts(candidateIds[1] || null);
  const t2 = useTranscripts(candidateIds[2] || null);
  const t3 = useTranscripts(candidateIds[3] || null);
  const transcriptsById: Record<string, ScreeningTranscript[]> = {};
  [t0, t1, t2, t3].forEach((q, i) => { if (candidateIds[i]) transcriptsById[candidateIds[i]] = q.data ?? []; });

  const contenders: Contender[] = useMemo(() => {
    return candidateIds.map((id) => {
      const c = candidates.find((x) => x.id === id)!;
      const ts = transcriptsById[id] ?? [];
      const avgFit = ts.length ? Math.round(ts.reduce((s, t) => s + (t.fit_score ?? 0), 0) / ts.length) : 0;
      const dims = [
        { label: "Screening", value: c.score || 0 },
        { label: "Rating", value: (c.rating || 0) * 20 },
        { label: "Interview fit", value: avgFit },
        { label: "Experience", value: Math.min(100, (c.years_experience || 0) * 12) },
        { label: "Engagement", value: Math.min(100, (c.contact_count || 0) * 25) },
      ];
      const weights = [0.3, 0.2, 0.25, 0.15, 0.1];
      const power = Math.round(dims.reduce((s, d, i) => s + d.value * weights[i], 0));
      return { candidate: c, power, dims, transcripts: ts };
    }).sort((a, b) => b.power - a.power);
  }, [candidateIds, candidates, JSON.stringify(transcriptsById)]);

  const top = contenders[0];

  const radarData = useMemo(() => {
    const labels = ["Screening", "Rating", "Interview fit", "Experience", "Engagement"];
    return labels.map((label) => {
      const row: Record<string, any> = { dim: label };
      contenders.forEach((c) => {
        row[c.candidate.full_name.split(" ")[0]] = c.dims.find((d) => d.label === label)?.value ?? 0;
      });
      return row;
    });
  }, [contenders]);

  return (
    <div className="space-y-5">
      {/* Champion banner */}
      <div className="relative overflow-hidden rounded-2xl border border-gold/40 p-6 foil-surface">
        <div className="relative flex flex-col sm:flex-row items-center gap-5">
          <div className="relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Crown className="h-6 w-6 text-gold drop-shadow" /></div>
            <ScoreRing score={top.power} size={92} stroke={7} label="power" />
          </div>
          <div className="text-center sm:text-left">
            <div className="text-[10px] micro-label text-gold mb-1">Current front-runner</div>
            <h2 className="font-display text-3xl">{top.candidate.full_name}</h2>
            <p className="text-sm text-muted-foreground">{top.candidate.applied_role || "—"} · {top.candidate.region}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
              style={{ color: `hsl(var(--${tierOf(top.power).color}))`, background: `hsl(var(--${tierOf(top.power).color})/0.12)`, border: `1px solid hsl(var(--${tierOf(top.power).color})/0.35)` }}>
              <Star className="h-3.5 w-3.5" /> {tierOf(top.power).label} tier
            </div>
          </div>
        </div>
      </div>

      {/* Radar overlay */}
      <div className="glass-panel rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2 text-sm font-medium mb-1"><RadarIcon className="h-4 w-4 text-cyan" /> Head-to-head shape</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="70%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              {contenders.map((c, i) => {
                const name = c.candidate.full_name.split(" ")[0];
                const hsl = RADAR_COLORS[i % RADAR_COLORS.length];
                return <Radar key={c.candidate.id} name={name} dataKey={name} stroke={`hsl(${hsl})`} fill={`hsl(${hsl})`} fillOpacity={0.18} />;
              })}
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Head-to-head grid */}
      <div className={`grid gap-4 ${contenders.length === 2 ? "sm:grid-cols-2" : contenders.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
        {contenders.map((c, rank) => <ContenderCard key={c.candidate.id} c={c} rank={rank} />)}
      </div>
    </div>
  );
}

function ContenderCard({ c, rank }: { c: Contender; rank: number }) {
  const tier = tierOf(c.power);
  return (
    <div className={`glass-panel rounded-2xl border p-4 ${rank === 0 ? "border-gold/40" : "border-border"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 text-xs font-semibold">{initials(c.candidate.full_name)}</span>
          <div>
            <p className="text-sm font-medium leading-tight">{c.candidate.full_name}</p>
            <p className="text-[10px] text-muted-foreground">#{rank + 1} · {tier.label}</p>
          </div>
        </div>
        <div className="font-display text-2xl font-bold" style={{ color: `hsl(var(--${tier.color}))` }}>{c.power}</div>
      </div>
      <div className="space-y-2">
        {c.dims.map((d) => {
          const hsl = TONE_HSL[scoreTone(d.value)];
          return (
            <div key={d.label}>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                <span>{d.label}</span><span className="font-mono">{Math.round(d.value)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, d.value)}%`, background: `hsl(${hsl})`, boxShadow: `0 0 8px hsl(${hsl}/0.5)` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-2 text-[11px] text-muted-foreground">
        <FileText className="h-3 w-3" /> {c.transcripts.length} transcript{c.transcripts.length === 1 ? "" : "s"} on file
      </div>
    </div>
  );
}
