import { useState, useMemo, useRef } from "react";
import {
  Swords, Brain, Upload, Loader2, FileText, Sparkles, Trophy, Crown,
  Check, X as XIcon, TrendingUp, Zap, Save, Quote, AlertTriangle, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import ScoreRing from "./ScoreRing";
import { useCandidates, Candidate } from "@/hooks/useRecruiting";
import { useAgents, useTranscripts, useSaveTranscript, analyzeTranscript, ScreeningTranscript } from "@/hooks/useAgents";
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
  const [mode, setMode] = useState<"intel" | "arena">("intel");
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight">Decision Engine</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Turn interview transcripts into structured intelligence, then send candidates into the arena
            for a gamified head-to-head that makes the final call feel earned.
          </p>
        </div>
        <div className="flex rounded-xl border border-border p-1 glass-panel self-start">
          <TabBtn active={mode === "intel"} onClick={() => setMode("intel")} icon={<Brain className="h-4 w-4" />} label="Intelligence" />
          <TabBtn active={mode === "arena"} onClick={() => setMode("arena")} icon={<Swords className="h-4 w-4" />} label="Arena" />
        </div>
      </div>
      {mode === "intel" ? <IntelligenceMode /> : <ArenaMode />}
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
