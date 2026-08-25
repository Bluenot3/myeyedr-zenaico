import { useMemo, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Settings2, Sparkles, Play, Trash2, Plus, Clock, Loader2, CalendarClock, Gauge,
} from "lucide-react";
import {
  type AssistantPrefs, type AssistantLength, type AssistantStyle, type StreamStyle,
  LENGTH_LABEL, STYLE_LABEL, STREAM_LABEL, CADENCE_LABEL, type Cadence, DEFAULT_PREFS,
} from "@/lib/assistantPrefs";
import {
  useAssistantTasks, useCreateAssistantTask, useUpdateAssistantTask, useDeleteAssistantTask,
  type AssistantTask,
} from "@/hooks/useAssistantTasks";

const SEGMENT =
  "flex-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors border";
const ON = "bg-emerald/12 border-emerald/40 text-emerald";
const OFF = "border-border/70 text-muted-foreground hover:text-foreground hover:border-emerald/30";

function Segmented<T extends string>({
  value, options, onChange, labels,
}: { value: T; options: T[]; onChange: (v: T) => void; labels: Record<T, string> }) {
  return (
    <div className="flex gap-1.5">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} className={`${SEGMENT} ${value === o ? ON : OFF}`}>
          {labels[o]}
        </button>
      ))}
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div>
        <p className="text-xs font-semibold text-foreground">{label}</p>
        {hint && <p className="text-[10.5px] text-muted-foreground leading-snug">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/40 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-[10.5px] text-muted-foreground leading-snug">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

const TASK_PRESETS: { title: string; prompt: string; cadence: Cadence }[] = [
  {
    title: "Morning pipeline sweep",
    cadence: "weekdays",
    prompt:
      "Run my morning sweep: every requisition I can see, its coverage vs. openings, candidates going cold, interviews missing scorecards, and anyone ready for a decision. Give me an ordered action list and propose every move and email you can handle.",
  },
  {
    title: "Stale requisition recovery",
    cadence: "weekly",
    prompt:
      "Audit every open requisition older than 14 days. For each, diagnose why it is stalled, pull matching talent-pool candidates, propose applying them, and draft re-engagement emails.",
  },
  {
    title: "Weekly hiring scorecard",
    cadence: "weekly",
    prompt:
      "Build my weekly hiring scorecard: movement by stage, time-in-stage outliers, offices trending behind, source quality, and the three decisions I must make this week. Include charts.",
  },
  {
    title: "Best-fit rescan",
    cadence: "daily",
    prompt:
      "Rescan all active candidates against every open requisition and surface anyone who fits a second opening. Propose apply_to_additional_position for each with a one-line reason.",
  },
];

export default function AssistantSettings({
  prefs, onChange, onRunTask, running,
}: {
  prefs: AssistantPrefs;
  onChange: (p: AssistantPrefs) => void;
  onRunTask: (task: AssistantTask) => void;
  running?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [cadence, setCadence] = useState<Cadence>("weekdays");

  const { data: tasks = [], isLoading } = useAssistantTasks();
  const createTask = useCreateAssistantTask();
  const updateTask = useUpdateAssistantTask();
  const deleteTask = useDeleteAssistantTask();

  const set = (patch: Partial<AssistantPrefs>) => onChange({ ...prefs, ...patch });

  const dueCount = useMemo(
    () => tasks.filter((t) => t.active && new Date(t.next_run_at).getTime() <= Date.now()).length,
    [tasks],
  );

  const submit = () => {
    if (!title.trim() || !prompt.trim()) return;
    createTask.mutate(
      { title: title.trim(), prompt: prompt.trim(), cadence },
      { onSuccess: () => { setTitle(""); setPrompt(""); } },
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="h-11 w-11 shrink-0 p-0 relative"
          aria-label="Assistant settings and scheduled tasks"
        >
          <Settings2 className="h-4 w-4" />
          {dueCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald px-1 text-[9px] font-bold text-primary-foreground">
              {dueCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald" /> Assistant controls
          </SheetTitle>
          <SheetDescription className="text-[11.5px]">
            Tune how the assistant writes and streams, and queue standing work it should run for you.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="output" className="mt-5">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="output" className="text-xs gap-1.5"><Gauge className="h-3.5 w-3.5" /> Output</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" /> Tasks{tasks.length ? ` (${tasks.length})` : ""}
            </TabsTrigger>
          </TabsList>

          {/* ------------------------- OUTPUT ------------------------- */}
          <TabsContent value="output" className="space-y-4 pt-4">
            <Row label="Response length" hint="How much depth every answer carries by default.">
              <Segmented<AssistantLength>
                value={prefs.length}
                options={["brief", "standard", "deep"]}
                labels={LENGTH_LABEL}
                onChange={(v) => set({ length: v })}
              />
            </Row>

            <Row label="Voice & style" hint="The register it writes in.">
              <Segmented<AssistantStyle>
                value={prefs.style}
                options={["analyst", "executive", "coach", "direct"]}
                labels={STYLE_LABEL}
                onChange={(v) => set({ style: v })}
              />
            </Row>

            <Row label="Streaming animation" hint="How tokens render as they arrive.">
              <Segmented<StreamStyle>
                value={prefs.streamStyle}
                options={["smooth", "typewriter", "instant"]}
                labels={STREAM_LABEL}
                onChange={(v) => set({ streamStyle: v })}
              />
            </Row>

            <Row
              label={`Creativity · ${prefs.temperature.toFixed(2)}`}
              hint="Lower stays literal to the data. Higher explores more framing and phrasing."
            >
              <Slider
                value={[prefs.temperature]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([v]) => set({ temperature: v })}
              />
            </Row>

            <div className="space-y-2">
              <Toggle
                label="Live streaming"
                hint="Stream the answer token by token instead of waiting for the full reply."
                checked={prefs.streaming}
                onChange={(v) => set({ streaming: v })}
              />
              <Toggle
                label="Charts"
                hint="Render inline bar, line, area and pie visuals for numeric comparisons."
                checked={prefs.charts}
                onChange={(v) => set({ charts: v })}
              />
              <Toggle
                label="Comparison tables"
                hint="Use markdown tables whenever two or more records are compared."
                checked={prefs.tables}
                onChange={(v) => set({ tables: v })}
              />
              <Toggle
                label="Proactive next steps"
                hint="Close every answer with recommended next steps and unprompted risk flags."
                checked={prefs.proactive}
                onChange={(v) => set({ proactive: v })}
              />
              <Toggle
                label="Propose actions automatically"
                hint="Offer confirmable moves, requisition edits and emails without being asked."
                checked={prefs.autoActions}
                onChange={(v) => set({ autoActions: v })}
              />
            </div>

            <Button variant="ghost" className="w-full text-[11px] text-muted-foreground" onClick={() => onChange(DEFAULT_PREFS)}>
              Reset to defaults
            </Button>
          </TabsContent>

          {/* ------------------------- TASKS ------------------------- */}
          <TabsContent value="tasks" className="space-y-4 pt-4">
            <div className="rounded-xl border border-border/70 bg-background/40 p-3 space-y-2.5">
              <p className="text-xs font-semibold text-foreground">New standing task</p>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task name — e.g. Morning pipeline sweep"
                className="h-9 text-xs"
              />
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What should the assistant do every time this runs?"
                className="min-h-[76px] text-xs resize-none"
              />
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(CADENCE_LABEL) as Cadence[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCadence(c)}
                    className={`rounded-lg border px-2.5 py-1 text-[10.5px] font-medium transition-colors ${cadence === c ? ON : OFF}`}
                  >
                    {CADENCE_LABEL[c]}
                  </button>
                ))}
              </div>
              <Button
                onClick={submit}
                disabled={!title.trim() || !prompt.trim() || createTask.isPending}
                className="w-full h-9 text-xs gap-1.5 bg-emerald text-primary-foreground hover:bg-emerald/90"
              >
                {createTask.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Schedule task
              </Button>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground/80">Start from a preset</p>
              {TASK_PRESETS.map((p) => (
                <button
                  key={p.title}
                  onClick={() => { setTitle(p.title); setPrompt(p.prompt); setCadence(p.cadence); }}
                  className="w-full text-left rounded-lg border border-border/70 bg-background/40 px-3 py-2 hover:border-emerald/40 hover:bg-emerald/5 transition-colors"
                >
                  <p className="text-[11.5px] font-medium text-foreground">{p.title}</p>
                  <p className="text-[10px] text-muted-foreground">{CADENCE_LABEL[p.cadence]}</p>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground/80">Scheduled</p>
              {isLoading ? (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground py-3">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading tasks…
                </div>
              ) : tasks.length === 0 ? (
                <p className="text-[11px] text-muted-foreground py-3">
                  Nothing scheduled yet. Standing tasks run in this workspace when they come due — you stay in control of every action they propose.
                </p>
              ) : (
                tasks.map((t) => {
                  const due = t.active && new Date(t.next_run_at).getTime() <= Date.now();
                  return (
                    <div key={t.id} className="rounded-xl border border-border/70 bg-background/40 p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">{t.title}</p>
                          <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                            <Clock className="h-2.5 w-2.5" /> {CADENCE_LABEL[t.cadence] ?? t.cadence}
                            {t.runs > 0 && ` · ${t.runs} run${t.runs === 1 ? "" : "s"}`}
                            {due && <span className="text-emerald font-semibold"> · due now</span>}
                          </p>
                        </div>
                        <Switch
                          checked={t.active}
                          onCheckedChange={(v) => updateTask.mutate({ id: t.id, active: v })}
                        />
                      </div>
                      <p className="text-[10.5px] text-muted-foreground line-clamp-2 leading-snug">{t.prompt}</p>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-[11px] gap-1"
                          disabled={running}
                          onClick={() => { onRunTask(t); setOpen(false); }}
                        >
                          <Play className="h-3 w-3" /> Run now
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteTask.mutate(t.id)}
                          aria-label={`Delete ${t.title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
