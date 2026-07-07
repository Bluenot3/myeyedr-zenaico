import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, Circle, MinusCircle, Clock, CalendarDays, MapPin, GraduationCap,
  Loader2, Save, Sparkles, User, ChevronRight,
} from "lucide-react";
import {
  Candidate, useOnboarding, useUpsertOnboarding, useLocations,
} from "@/hooks/useRecruiting";
import {
  ONBOARDING_GROUPS, onboardingProgress, defaultOnboardingSteps, defaultTrainingSchedule,
  type OnboardingStep, type StepStatus, type TrainingWeek,
} from "@/lib/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { relativeTime } from "@/lib/recruiting";

const STATUS_CYCLE: StepStatus[] = ["pending", "in_progress", "done", "na"];
const statusMeta: Record<StepStatus, { icon: typeof Circle; color: string; label: string }> = {
  pending: { icon: Circle, color: "hsl(var(--muted-foreground))", label: "Pending" },
  in_progress: { icon: Clock, color: "hsl(var(--gold))", label: "In progress" },
  done: { icon: CheckCircle2, color: "hsl(var(--emerald))", label: "Done" },
  na: { icon: MinusCircle, color: "hsl(var(--muted-foreground)/0.5)", label: "N/A" },
};

export default function OnboardingTracker({ candidate }: { candidate: Candidate }) {
  const { data: record, isLoading } = useOnboarding(candidate.id);
  const { data: locations = [] } = useLocations();
  const upsert = useUpsertOnboarding();

  const [steps, setSteps] = useState<OnboardingStep[]>(defaultOnboardingSteps());
  const [training, setTraining] = useState<TrainingWeek[]>(defaultTrainingSchedule());
  const [firstDay, setFirstDay] = useState("");
  const [firstDayTime, setFirstDayTime] = useState("");
  const [firstDayLoc, setFirstDayLoc] = useState<string>("");
  const [trainer, setTrainer] = useState("");
  const [notes, setNotes] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (record) {
      setSteps(record.steps?.length ? record.steps : defaultOnboardingSteps());
      setTraining(record.training_schedule?.length ? record.training_schedule : defaultTrainingSchedule());
      setFirstDay(record.first_day_date ?? "");
      setFirstDayTime(record.first_day_time ?? "");
      setFirstDayLoc(record.first_day_location_id ?? candidate.location_id ?? "");
      setTrainer(record.trainer_name ?? "");
      setNotes(record.notes ?? "");
      setDirty(false);
    }
  }, [record, candidate.location_id]);

  const progress = useMemo(() => onboardingProgress(steps), [steps]);

  const cycleStep = (key: string) => {
    setSteps((prev) =>
      prev.map((s) => {
        if (s.key !== key) return s;
        const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(s.status) + 1) % STATUS_CYCLE.length];
        return { ...s, status: next, date: next === "done" ? new Date().toISOString() : s.date };
      })
    );
    setDirty(true);
  };

  const patchWeek = (week: number, u: Partial<TrainingWeek>) => {
    setTraining((prev) => prev.map((w) => (w.week === week ? { ...w, ...u } : w)));
    setDirty(true);
  };

  const applyTrainerToAll = () => {
    setTraining((prev) => prev.map((w) => ({ ...w, trainer })));
    setDirty(true);
  };

  const save = () => {
    upsert.mutate(
      {
        candidate_id: candidate.id,
        seedLocationId: candidate.location_id,
        updates: {
          steps,
          training_schedule: training,
          first_day_date: firstDay || null,
          first_day_time: firstDayTime,
          first_day_location_id: firstDayLoc || null,
          trainer_name: trainer,
          notes,
          status: progress === 100 ? "complete" : "in_progress",
        } as any,
      },
      { onSuccess: () => setDirty(false) }
    );
  };

  const startOnboarding = () => {
    upsert.mutate({ candidate_id: candidate.id, seedLocationId: candidate.location_id });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  if (!record) {
    return (
      <div className="glass-panel rounded-xl p-6 text-center space-y-3">
        <GraduationCap className="h-8 w-8 mx-auto text-emerald" />
        <div>
          <p className="font-display text-lg font-semibold">Start onboarding</p>
          <p className="text-xs text-muted-foreground mt-1">Kick off the new-hire checklist, first-day plan, and 4-week training schedule for {candidate.full_name}.</p>
        </div>
        <Button onClick={startOnboarding} disabled={upsert.isPending} className="btn-optic gap-1.5">
          {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Begin onboarding
        </Button>
      </div>
    );
  }

  const locName = (id: string | null) => locations.find((l) => l.id === id)?.site_name ?? "—";

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="glass-panel rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-emerald" />
            <span className="font-display font-semibold">Onboarding</span>
          </div>
          <span className="text-xs font-mono" style={{ color: progress === 100 ? "hsl(var(--emerald))" : "hsl(var(--gold))" }}>{progress}% complete</span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "linear-gradient(90deg, hsl(var(--cyan)), hsl(var(--emerald)))" }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Updated {relativeTime(record.updated_at)} · tap any item to change its status.</p>
      </div>

      {/* Day-one plan */}
      <div className="glass-panel rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-cyan" /><span className="text-sm font-medium">First Day</span></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-[10px]">Start date</Label><Input type="date" value={firstDay} onChange={(e) => { setFirstDay(e.target.value); setDirty(true); }} className="h-9 text-xs mt-1" /></div>
          <div><Label className="text-[10px]">Report time</Label><Input type="time" value={firstDayTime} onChange={(e) => { setFirstDayTime(e.target.value); setDirty(true); }} className="h-9 text-xs mt-1" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px]">Location</Label>
            <select value={firstDayLoc} onChange={(e) => { setFirstDayLoc(e.target.value); setDirty(true); }} className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs mt-1">
              <option value="">—</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.site_name}</option>)}
            </select>
          </div>
          <div><Label className="text-[10px]">Primary trainer</Label><Input value={trainer} onChange={(e) => { setTrainer(e.target.value); setDirty(true); }} placeholder="Who's training them" className="h-9 text-xs mt-1" /></div>
        </div>
        {trainer && <button onClick={applyTrainerToAll} className="text-[10px] text-emerald inline-flex items-center gap-0.5 hover:underline">Apply {trainer} to all 4 weeks <ChevronRight className="h-3 w-3" /></button>}
      </div>

      {/* Checklist grouped */}
      <div className="space-y-3">
        {ONBOARDING_GROUPS.map((group) => {
          const items = steps.filter((s) => s.group === group);
          if (items.length === 0) return null;
          const done = items.filter((s) => s.status === "done").length;
          return (
            <div key={group} className="glass-panel rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="micro-label text-muted-foreground text-[10px]">{group}</span>
                <span className="text-[10px] text-muted-foreground">{done}/{items.length}</span>
              </div>
              <div className="space-y-1">
                {items.map((s) => {
                  const meta = statusMeta[s.status];
                  const Icon = meta.icon;
                  return (
                    <button key={s.key} onClick={() => cycleStep(s.key)} className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-muted/40 transition-colors tap-target">
                      <Icon className="h-4 w-4 shrink-0" style={{ color: meta.color }} />
                      <span className={`text-xs flex-1 ${s.status === "done" ? "text-muted-foreground line-through" : s.status === "na" ? "text-muted-foreground/60" : "text-foreground"}`}>{s.label}</span>
                      {s.status === "done" && s.date && <span className="text-[9px] text-muted-foreground">{relativeTime(s.date)}</span>}
                      <span className="text-[9px] font-mono uppercase tracking-wide" style={{ color: meta.color }}>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4-week training schedule */}
      <div className="glass-panel rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-gold" /><span className="text-sm font-medium">First 4 Weeks — Training Plan</span></div>
        <div className="space-y-3">
          {training.map((w) => (
            <div key={w.week} className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold/15 text-gold text-[11px] font-bold shrink-0">{w.week}</span>
                <Input value={w.focus} onChange={(e) => patchWeek(w.week, { focus: e.target.value })} placeholder="Weekly focus" className="h-8 text-xs font-medium" />
              </div>
              <Textarea value={w.activities} onChange={(e) => patchWeek(w.week, { activities: e.target.value })} placeholder="Activities & goals" className="text-xs min-h-[56px]" />
              <div className="grid grid-cols-2 gap-2">
                <div className="relative"><User className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" /><Input value={w.trainer} onChange={(e) => patchWeek(w.week, { trainer: e.target.value })} placeholder="Trainer" className="h-8 text-xs pl-7" /></div>
                <div className="relative"><MapPin className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" /><Input value={w.location} onChange={(e) => patchWeek(w.week, { location: e.target.value })} placeholder="Location" className="h-8 text-xs pl-7" /></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="glass-panel rounded-xl p-4 space-y-2">
        <Label className="text-[10px]">Onboarding notes</Label>
        <Textarea value={notes} onChange={(e) => { setNotes(e.target.value); setDirty(true); }} placeholder="Anything the team should know…" className="text-xs min-h-[60px]" />
      </div>

      {/* Sticky save */}
      <div className="sticky bottom-0 -mx-1 pt-2">
        <Button onClick={save} disabled={upsert.isPending || !dirty} className="w-full btn-optic gap-1.5">
          {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {dirty ? "Save onboarding" : "All changes saved"}
        </Button>
      </div>
    </div>
  );
}
