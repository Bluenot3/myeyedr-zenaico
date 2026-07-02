import { useState, useRef, useEffect } from "react";
import {
  Bot, Plus, Play, Loader2, Trash2, Send, Sparkles, Volume2, Settings2,
  Phone, MessageSquare, Wand2, Save, X, Mic, ChevronRight,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ScreeningAgent, useAgents, useCreateAgent, useUpdateAgent, useDeleteAgent,
  useVoices, synthesizeSpeech, agentReply,
} from "@/hooks/useAgents";

const COLORS = ["emerald", "gold", "cyan", "lime", "orange", "holo"];

const BLANK: Partial<ScreeningAgent> = {
  name: "",
  role_focus: "Phone Screen",
  persona: "warm, professional, concise, upbeat",
  voice_id: "EXAVITQu4vr4xnSDxMaL",
  voice_name: "Sarah",
  opening_line:
    "Hi, this is the MyEyeDr recruiting team reaching out about your application. Do you have a couple of minutes to chat?",
  closing_line: "Thanks so much for your time today — our team will follow up with next steps very soon.",
  questions: [
    "Can you tell me a bit about your recent experience?",
    "What's your availability and earliest start date?",
    "Are you comfortable commuting to our location?",
    "What are your compensation expectations?",
  ],
  extraction_goals: ["availability", "years_experience", "certifications", "salary_expectation", "start_date"],
  system_prompt: "",
  temperature: 0.6,
  stability: 0.5,
  similarity: 0.75,
  active: true,
  color: "emerald",
};

function colorHsl(c: string) {
  return `hsl(var(--${c}))`;
}

export default function AgentStudio() {
  const { data: agents = [], isLoading } = useAgents();
  const [editing, setEditing] = useState<Partial<ScreeningAgent> | null>(null);
  const [testAgent, setTestAgent] = useState<ScreeningAgent | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight">AI Agent Studio</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Build, voice, and test screening agents that call candidates, run initial screens, and
            auto-extract everything they say into the candidate file.
          </p>
        </div>
        <Button
          onClick={() => setEditing({ ...BLANK })}
          className="bg-emerald/15 text-emerald border border-emerald/30 hover:bg-emerald/25 tap-target"
        >
          <Plus className="h-4 w-4 mr-1.5" /> New Agent
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : agents.length === 0 ? (
        <EmptyState onCreate={() => setEditing({ ...BLANK })} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((a) => (
            <AgentCard
              key={a.id}
              agent={a}
              onEdit={() => setEditing(a)}
              onTest={() => setTestAgent(a)}
            />
          ))}
        </div>
      )}

      {editing && (
        <AgentEditor
          agent={editing}
          onClose={() => setEditing(null)}
          onTest={(a) => {
            setEditing(null);
            setTestAgent(a as ScreeningAgent);
          }}
        />
      )}
      {testAgent && <TestLab agent={testAgent} onClose={() => setTestAgent(null)} />}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="glass-panel rounded-2xl border border-border p-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald/10 border border-emerald/30 mb-4">
        <Bot className="h-8 w-8 text-emerald" />
      </div>
      <h3 className="font-display text-2xl">No agents yet</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-5 max-w-md mx-auto">
        Create your first AI screening agent. Give it a voice, a script, and the questions it should
        ask — then test it live before it ever calls a candidate.
      </p>
      <Button onClick={onCreate} className="bg-emerald/15 text-emerald border border-emerald/30 hover:bg-emerald/25">
        <Sparkles className="h-4 w-4 mr-1.5" /> Build an Agent
      </Button>
    </div>
  );
}

function AgentCard({ agent, onEdit, onTest }: { agent: ScreeningAgent; onEdit: () => void; onTest: () => void }) {
  return (
    <div className="glass-panel rounded-2xl border border-border p-5 flex flex-col group hover:border-emerald/30 transition-colors">
      <div className="flex items-start justify-between">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl border"
          style={{ background: `${colorHsl(agent.color)}/0.12`, borderColor: `${colorHsl(agent.color)}` }}
        >
          <Bot className="h-5 w-5" style={{ color: colorHsl(agent.color) }} />
        </div>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] micro-label"
          style={{
            color: agent.active ? "hsl(var(--emerald))" : "hsl(var(--muted-foreground))",
            background: agent.active ? "hsl(var(--emerald)/0.1)" : "hsl(var(--muted)/0.3)",
            border: `1px solid ${agent.active ? "hsl(var(--emerald)/0.3)" : "hsl(var(--border))"}`,
          }}
        >
          {agent.active ? "Active" : "Paused"}
        </span>
      </div>
      <h3 className="font-display text-xl mt-3">{agent.name || "Untitled Agent"}</h3>
      <p className="text-xs text-muted-foreground">{agent.role_focus}</p>
      <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
        <Mic className="h-3 w-3 text-gold" /> {agent.voice_name}
        <span className="mx-1">·</span>
        <MessageSquare className="h-3 w-3" /> {agent.questions?.length ?? 0} questions
      </div>
      <p className="text-xs text-muted-foreground/80 mt-3 line-clamp-2 italic">"{agent.opening_line}"</p>
      <div className="flex gap-2 mt-4 pt-4 border-t border-border/60">
        <Button size="sm" onClick={onTest} className="flex-1 bg-emerald/15 text-emerald border border-emerald/30 hover:bg-emerald/25">
          <Play className="h-3.5 w-3.5 mr-1" /> Test
        </Button>
        <Button size="sm" variant="outline" onClick={onEdit} className="tap-target">
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ============================ Editor ============================ */
function AgentEditor({
  agent,
  onClose,
  onTest,
}: {
  agent: Partial<ScreeningAgent>;
  onClose: () => void;
  onTest: (a: Partial<ScreeningAgent>) => void;
}) {
  const [form, setForm] = useState<Partial<ScreeningAgent>>(agent);
  const set = (u: Partial<ScreeningAgent>) => setForm((p) => ({ ...p, ...u }));
  const { data: voices = [] } = useVoices();
  const create = useCreateAgent();
  const update = useUpdateAgent();
  const [previewing, setPreviewing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isEdit = !!agent.id;

  const previewVoice = async () => {
    setPreviewing(true);
    try {
      const url = await synthesizeSpeech({
        text: form.opening_line || "Hi, this is the MyEyeDr recruiting team.",
        voiceId: form.voice_id || "EXAVITQu4vr4xnSDxMaL",
        stability: form.stability,
        similarity: form.similarity,
      });
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = url;
      await audioRef.current.play();
    } catch (e: any) {
      toast.error("Voice preview failed: " + e.message);
    } finally {
      setPreviewing(false);
    }
  };

  const save = async () => {
    if (!form.name?.trim()) { toast.error("Give your agent a name"); return; }
    const payload = { ...form };
    if (isEdit) await update.mutateAsync(payload as any);
    else await create.mutateAsync(payload);
    onClose();
  };

  const questions = form.questions ?? [];
  const goals = form.extraction_goals ?? [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col glass-panel">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <Bot className="h-5 w-5 text-emerald" /> {isEdit ? "Edit Agent" : "New Agent"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 pb-2">
            {/* Identity */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Agent name</Label>
                <Input value={form.name || ""} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Ava — Phone Screener" />
              </div>
              <div>
                <Label className="text-xs">Role focus</Label>
                <Input value={form.role_focus || ""} onChange={(e) => set({ role_focus: e.target.value })} placeholder="Phone Screen, Front-desk, OD, Lab Tech..." />
              </div>
            </div>

            <div>
              <Label className="text-xs">Persona & speaking style</Label>
              <Input value={form.persona || ""} onChange={(e) => set({ persona: e.target.value })} placeholder="warm, professional, concise, upbeat" />
            </div>

            {/* Voice */}
            <div className="rounded-xl border border-border p-4 space-y-3 bg-background/30">
              <div className="flex items-center gap-2 text-sm font-medium"><Volume2 className="h-4 w-4 text-gold" /> ElevenLabs Voice</div>
              <div className="flex gap-2">
                <Select
                  value={form.voice_id}
                  onValueChange={(v) => {
                    const vo = voices.find((x) => x.voice_id === v);
                    set({ voice_id: v, voice_name: vo?.name || "Voice" });
                  }}
                >
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select a voice" /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {voices.map((v) => (
                      <SelectItem key={v.voice_id} value={v.voice_id}>
                        {v.name}{v.labels?.accent ? ` · ${v.labels.accent}` : ""}{v.category === "cloned" ? " · your voice" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={previewVoice} disabled={previewing} className="tap-target">
                  {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  <span className="ml-1 hidden sm:inline">Preview</span>
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Use your own cloned voices or pick from the library. Clone new voices in your ElevenLabs account and they'll appear here.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 pt-1">
                <SliderRow label="Stability" value={form.stability ?? 0.5} onChange={(v) => set({ stability: v })} />
                <SliderRow label="Voice match" value={form.similarity ?? 0.75} onChange={(v) => set({ similarity: v })} />
              </div>
            </div>

            {/* Scripts */}
            <div>
              <Label className="text-xs">Opening line</Label>
              <Textarea rows={2} value={form.opening_line || ""} onChange={(e) => set({ opening_line: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Closing line</Label>
              <Textarea rows={2} value={form.closing_line || ""} onChange={(e) => set({ closing_line: e.target.value })} />
            </div>

            {/* Questions */}
            <ListEditor
              label="Screening questions"
              icon={<MessageSquare className="h-4 w-4 text-cyan" />}
              items={questions}
              placeholder="Add a question the agent should ask..."
              onChange={(items) => set({ questions: items })}
            />

            {/* Extraction goals */}
            <ListEditor
              label="Auto-extract these data points"
              icon={<Wand2 className="h-4 w-4 text-lime" />}
              items={goals}
              placeholder="e.g. certifications, salary_expectation..."
              onChange={(items) => set({ extraction_goals: items })}
            />

            <div>
              <Label className="text-xs">Extra instructions (optional)</Label>
              <Textarea rows={2} value={form.system_prompt || ""} onChange={(e) => set({ system_prompt: e.target.value })} placeholder="Any special guardrails, tone notes, or must-say disclosures." />
            </div>

            {/* Meta */}
            <div className="grid sm:grid-cols-2 gap-4">
              <SliderRow label="Creativity (temperature)" value={form.temperature ?? 0.6} onChange={(v) => set({ temperature: v })} max={1} />
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Label className="text-xs">Accent color</Label>
                  <div className="flex gap-1.5 mt-1.5">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => set({ color: c })}
                        className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                        style={{ background: colorHsl(c), borderColor: form.color === c ? "hsl(var(--foreground))" : "transparent" }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 pb-1">
                  <Switch checked={form.active} onCheckedChange={(v) => set({ active: v })} />
                  <span className="text-xs text-muted-foreground">Active</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
          <Button variant="ghost" onClick={() => onTest(form)} className="text-emerald">
            <Play className="h-4 w-4 mr-1" /> Test conversation
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={create.isPending || update.isPending} className="bg-emerald/15 text-emerald border border-emerald/30 hover:bg-emerald/25">
              {(create.isPending || update.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save agent
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SliderRow({ label, value, onChange, max = 1 }: { label: string; value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{value.toFixed(2)}</span>
      </div>
      <Slider value={[value]} min={0} max={max} step={0.05} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function ListEditor({
  label, icon, items, placeholder, onChange,
}: {
  label: string; icon: React.ReactNode; items: string[]; placeholder: string; onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    if (!draft.trim()) return;
    onChange([...items, draft.trim()]);
    setDraft("");
  };
  return (
    <div>
      <Label className="text-xs flex items-center gap-1.5 mb-1.5">{icon} {label}</Label>
      <div className="space-y-1.5 mb-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-background/30 px-3 py-1.5 text-sm">
            <span className="text-muted-foreground/60 text-xs font-mono">{i + 1}</span>
            <span className="flex-1">{it}</span>
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} />
        <Button variant="outline" onClick={add} className="tap-target"><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

/* ============================ Test Lab ============================ */
interface Turn { role: "user" | "assistant"; content: string; }

function TestLab({ agent, onClose }: { agent: Partial<ScreeningAgent>; onClose: () => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  const speak = async (text: string) => {
    if (!voiceOn) return;
    try {
      setSpeaking(true);
      const url = await synthesizeSpeech({
        text, voiceId: agent.voice_id || "EXAVITQu4vr4xnSDxMaL",
        stability: agent.stability, similarity: agent.similarity,
      });
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = url;
      audioRef.current.onended = () => setSpeaking(false);
      await audioRef.current.play();
    } catch { setSpeaking(false); }
  };

  const converse = async (history: Turn[]) => {
    setBusy(true);
    try {
      const reply = await agentReply({ agent, messages: history });
      setTurns((t) => [...t, { role: "assistant", content: reply }]);
      speak(reply);
    } catch (e: any) {
      toast.error(e.message || "Agent failed to respond");
    } finally {
      setBusy(false);
    }
  };

  const start = () => { setTurns([]); converse([]); };

  const send = () => {
    if (!input.trim() || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: input.trim() }];
    setTurns(next);
    setInput("");
    converse(next);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col glass-panel p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-border">
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <Phone className="h-5 w-5 text-emerald" /> Test call — {agent.name}
          </DialogTitle>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">You play the candidate. The agent screens you live.</p>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <Volume2 className={`h-3.5 w-3.5 ${voiceOn ? "text-emerald" : ""}`} />
              <Switch checked={voiceOn} onCheckedChange={setVoiceOn} /> Voice
            </label>
          </div>
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
          {turns.length === 0 && !busy ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3">
              <div className={`relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald/10 border border-emerald/30 ${speaking ? "animate-pulse" : ""}`}>
                <Bot className="h-9 w-9 text-emerald" />
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">Press start and the agent will place the call using the {agent.voice_name} voice.</p>
              <Button onClick={start} className="bg-emerald/15 text-emerald border border-emerald/30 hover:bg-emerald/25">
                <Phone className="h-4 w-4 mr-1.5" /> Start test call
              </Button>
            </div>
          ) : (
            turns.map((t, i) => (
              <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    t.role === "user"
                      ? "bg-cyan/12 border border-cyan/25 text-foreground"
                      : "bg-emerald/10 border border-emerald/25 text-foreground"
                  }`}
                >
                  <div className="text-[9px] micro-label mb-1 opacity-60">{t.role === "user" ? "Candidate (you)" : agent.name}</div>
                  {t.content}
                  {t.role === "assistant" && voiceOn && (
                    <button onClick={() => speak(t.content)} className="ml-2 inline-flex text-emerald/70 hover:text-emerald align-middle">
                      <Volume2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3 bg-emerald/10 border border-emerald/25">
                <Loader2 className="h-4 w-4 animate-spin text-emerald" />
              </div>
            </div>
          )}
        </div>

        {turns.length > 0 && (
          <div className="p-4 border-t border-border flex gap-2">
            <Input
              value={input}
              placeholder="Answer as the candidate..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={busy}
            />
            <Button onClick={send} disabled={busy || !input.trim()} className="bg-emerald/15 text-emerald border border-emerald/30 hover:bg-emerald/25">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
