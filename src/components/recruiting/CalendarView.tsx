import { useMemo, useState } from "react";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Clock, MapPin, Phone, Video,
  Trash2, Loader2, CheckCircle2, XCircle, CalendarClock, PhoneCall, Handshake, Star, Users,
  ClipboardCheck, ExternalLink,
} from "lucide-react";
import {
  useInterviewEvents, useCreateEvent, useUpdateEvent, useDeleteEvent,
  useCandidates, usePositions, useLocations, InterviewEvent, Candidate,
} from "@/hooks/useRecruiting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import CandidateProfile from "./CandidateProfile";

const EVENT_TYPES: { key: string; label: string; hsl: string; icon: typeof CalendarClock }[] = [
  { key: "screening", label: "Screening", hsl: "190 100% 74%", icon: PhoneCall },
  { key: "interview", label: "Interview", hsl: "210 100% 64%", icon: Users },
  { key: "offer", label: "Offer", hsl: "228 100% 68%", icon: Star },
  { key: "hire", label: "Hire / Start Date", hsl: "160 84% 46%", icon: Handshake },
  { key: "other", label: "Other", hsl: "197 100% 78%", icon: CalendarClock },
];
const typeMeta = (k: string) => EVENT_TYPES.find((t) => t.key === k) || EVENT_TYPES[4];
const MODES = ["Phone", "Video", "In-person"];

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
function fromLocalInput(v: string): string {
  return new Date(v).toISOString();
}
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type FormState = {
  id?: string;
  title: string;
  event_type: string;
  candidate_id: string;
  position_id: string;
  location_id: string;
  date: string; // datetime-local
  duration: number; // minutes
  mode: string;
  location_detail: string;
  notes: string;
  status: string;
};

const emptyForm = (): FormState => ({
  title: "", event_type: "interview", candidate_id: "", position_id: "", location_id: "",
  date: "", duration: 30, mode: "Phone", location_detail: "", notes: "", status: "scheduled",
});

export default function CalendarView() {
  const { data: events = [], isLoading } = useInterviewEvents();
  const { data: candidates = [] } = useCandidates();
  const { data: positions = [] } = usePositions();
  const { data: locations = [] } = useLocations();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [profileCand, setProfileCand] = useState<Candidate | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const openScorecard = () => {
    const c = candidates.find((x) => x.id === form.candidate_id);
    if (!c) return;
    setDialogOpen(false);
    setProfileCand(c);
    setProfileOpen(true);
  };

  const candName = (id: string | null) => candidates.find((c) => c.id === id)?.full_name;
  const locName = (id: string | null) => locations.find((l) => l.id === id)?.site_name;

  const eventsByDay = useMemo(() => {
    const map: Record<string, InterviewEvent[]> = {};
    events.forEach((e) => {
      const key = new Date(e.starts_at).toDateString();
      (map[key] ||= []).push(e);
    });
    return map;
  }, [events]);

  const upcoming = useMemo(
    () => events
      .filter((e) => e.status !== "canceled" && new Date(e.starts_at).getTime() >= Date.now() - 3600_000)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
      .slice(0, 8),
    [events]
  );

  // Build month grid
  const grid = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const cells: { date: Date | null }[] = [];
    for (let i = 0; i < startDay; i++) cells.push({ date: null });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(cursor.y, cursor.m, d) });
    while (cells.length % 7 !== 0) cells.push({ date: null });
    return cells;
  }, [cursor]);

  const shiftMonth = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const openNew = (date?: Date) => {
    const base = date ? new Date(date) : new Date();
    if (date) base.setHours(9, 0, 0, 0);
    setForm({ ...emptyForm(), date: toLocalInput(base.toISOString()) });
    setDialogOpen(true);
  };

  const openEdit = (e: InterviewEvent) => {
    const dur = e.ends_at ? Math.max(15, Math.round((new Date(e.ends_at).getTime() - new Date(e.starts_at).getTime()) / 60000)) : 30;
    setForm({
      id: e.id, title: e.title, event_type: e.event_type, candidate_id: e.candidate_id || "",
      position_id: e.position_id || "", location_id: e.location_id || "", date: toLocalInput(e.starts_at),
      duration: dur, mode: e.mode || "Phone", location_detail: e.location_detail, notes: e.notes, status: e.status,
    });
    setDialogOpen(true);
  };

  const pickCandidate = (id: string) => {
    const c = candidates.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      candidate_id: id,
      position_id: c?.position_id || f.position_id,
      location_id: c?.location_id || f.location_id,
      title: f.title || (c ? `${typeMeta(f.event_type).label} — ${c.full_name}` : f.title),
    }));
  };

  const submit = async () => {
    if (!form.date) return;
    const starts = fromLocalInput(form.date);
    const ends = new Date(new Date(starts).getTime() + form.duration * 60000).toISOString();
    const title = form.title.trim() || (candName(form.candidate_id) ? `${typeMeta(form.event_type).label} — ${candName(form.candidate_id)}` : typeMeta(form.event_type).label);
    const payload = {
      title,
      event_type: form.event_type,
      candidate_id: form.candidate_id || null,
      position_id: form.position_id || null,
      location_id: form.location_id || null,
      starts_at: starts,
      ends_at: ends,
      mode: form.mode,
      location_detail: form.location_detail,
      notes: form.notes,
      status: form.status,
      created_by: "Administrator",
    };
    if (form.id) await updateEvent.mutateAsync({ id: form.id, ...payload });
    else await createEvent.mutateAsync(payload);
    setDialogOpen(false);
  };

  const remove = async () => {
    if (form.id) { await deleteEvent.mutateAsync(form.id); setDialogOpen(false); }
  };

  const saving = createEvent.isPending || updateEvent.isPending;

  return (
    <div className="space-y-4 animate-rise">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Scheduling Calendar</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Screenings, interviews, offers & hire dates — schedule and track every touchpoint.</p>
        </div>
        <Button size="sm" onClick={() => openNew()} className="gap-1.5 bg-emerald text-primary-foreground hover:bg-emerald/90">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Schedule</span>
        </Button>
      </div>

      {/* Type legend */}
      <div className="flex flex-wrap gap-2">
        {EVENT_TYPES.map((t) => (
          <span key={t.key} className="inline-flex items-center gap-1.5 text-[10px] font-medium rounded-full px-2 py-1"
            style={{ color: `hsl(${t.hsl})`, background: `hsl(${t.hsl} / 0.12)` }}>
            <t.icon className="h-3 w-3" /> {t.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar grid */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-emerald" /> {MONTHS[cursor.m]} {cursor.y}
            </h3>
            <div className="flex items-center gap-1">
              <button onClick={() => setCursor({ y: today.getFullYear(), m: today.getMonth() })} className="text-[10px] px-2 h-7 rounded-md border border-input text-muted-foreground hover:text-foreground">Today</button>
              <button onClick={() => shiftMonth(-1)} className="h-7 w-7 grid place-items-center rounded-md border border-input hover:bg-muted/40"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => shiftMonth(1)} className="h-7 w-7 grid place-items-center rounded-md border border-input hover:bg-muted/40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-80 rounded-lg" />
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((d) => <div key={d} className="text-center text-[9px] font-mono uppercase tracking-wide text-muted-foreground py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {grid.map((cell, i) => {
                  if (!cell.date) return <div key={i} className="min-h-[68px] rounded-lg" />;
                  const key = cell.date.toDateString();
                  const dayEvents = (eventsByDay[key] || []).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
                  const isToday = key === today.toDateString();
                  return (
                    <button key={i} onClick={() => openNew(cell.date!)}
                      className={`min-h-[68px] rounded-lg border p-1 text-left transition-colors hover:border-emerald/40 ${isToday ? "border-emerald/50 bg-emerald/5" : "border-border/50 bg-background/30"}`}>
                      <span className={`text-[10px] font-semibold ${isToday ? "text-emerald" : "text-muted-foreground"}`}>{cell.date.getDate()}</span>
                      <div className="mt-0.5 space-y-0.5">
                        {dayEvents.slice(0, 3).map((e) => {
                          const tm = typeMeta(e.event_type);
                          return (
                            <div key={e.id} onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                              className={`truncate rounded px-1 py-0.5 text-[8.5px] font-medium leading-tight ${e.status === "canceled" ? "line-through opacity-50" : ""}`}
                              style={{ color: `hsl(${tm.hsl})`, background: `hsl(${tm.hsl} / 0.14)` }}>
                              {fmtTime(e.starts_at)} {candName(e.candidate_id) || tm.label}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && <div className="text-[8px] text-muted-foreground pl-1">+{dayEvents.length - 3} more</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Upcoming */}
        <div className="glass-panel rounded-xl p-4">
          <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-orange" /> Upcoming</h3>
          <div className="space-y-2">
            {upcoming.length === 0 && <p className="text-xs text-muted-foreground">Nothing scheduled. Click a day to add an event.</p>}
            {upcoming.map((e) => {
              const tm = typeMeta(e.event_type);
              const ModeIcon = e.mode === "Video" ? Video : e.mode === "In-person" ? MapPin : Phone;
              return (
                <button key={e.id} onClick={() => openEdit(e)} className="w-full text-left rounded-lg bg-background/40 border border-border/60 p-2.5 hover:border-emerald/40 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 grid place-items-center rounded-md shrink-0" style={{ color: `hsl(${tm.hsl})`, background: `hsl(${tm.hsl} / 0.14)` }}><tm.icon className="h-3.5 w-3.5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">{candName(e.candidate_id) || e.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{tm.label}{locName(e.location_id) ? ` · ${locName(e.location_id)}` : ""}</p>
                    </div>
                    {e.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald shrink-0" />}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {fmtDate(e.starts_at)}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtTime(e.starts_at)}</span>
                    {e.mode && <span className="inline-flex items-center gap-1"><ModeIcon className="h-3 w-3" /> {e.mode}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg glass-panel max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-xl">{form.id ? "Edit Event" : "Schedule Event"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div>
              <Label className="text-[10px]">Type</Label>
              <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
                {EVENT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[10px]">Candidate</Label>
              <select value={form.candidate_id} onChange={(e) => pickCandidate(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
                <option value="">— none —</option>
                {candidates.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[10px]">Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder="Auto-filled from candidate & type" />
            </div>
            <div>
              <Label className="text-[10px]">Date & time</Label>
              <Input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-[10px]">Duration (min)</Label>
              <Input type="number" min={15} step={15} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} className="mt-1" />
            </div>
            <div>
              <Label className="text-[10px]">Mode</Label>
              <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
                {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[10px]">Office</Label>
              <select value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
                <option value="">— none —</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.site_name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[10px]">Location detail / link</Label>
              <Input value={form.location_detail} onChange={(e) => setForm({ ...form, location_detail: e.target.value })} className="mt-1" placeholder="Phone number, meeting link, or address" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[10px]">Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" placeholder="Prep notes, probes, reminders…" />
            </div>
            {form.id && (
              <div className="sm:col-span-2">
                <Label className="text-[10px]">Status</Label>
                <div className="flex gap-2 mt-1">
                  {[
                    { k: "scheduled", label: "Scheduled", icon: CalendarClock },
                    { k: "completed", label: "Completed", icon: CheckCircle2 },
                    { k: "canceled", label: "Canceled", icon: XCircle },
                  ].map((s) => (
                    <button key={s.k} onClick={() => setForm({ ...form, status: s.k })}
                      className={`flex-1 inline-flex items-center justify-center gap-1 h-9 rounded-md border text-xs ${form.status === s.k ? "border-emerald/50 bg-emerald/10 text-emerald" : "border-input text-muted-foreground"}`}>
                      <s.icon className="h-3.5 w-3.5" /> {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {form.candidate_id && (
              <button
                onClick={openScorecard}
                className="sm:col-span-2 flex items-center gap-2.5 rounded-lg border border-emerald/40 bg-emerald/8 p-3 text-left hover:bg-emerald/12 transition-colors tap-target"
              >
                <span className="h-8 w-8 grid place-items-center rounded-lg bg-emerald/15 text-emerald border border-emerald/30 shrink-0">
                  <ClipboardCheck className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">Open evaluation scorecards</p>
                  <p className="text-[10px] text-muted-foreground">Add notes & score {candName(form.candidate_id)} for this interview</p>
                </div>
                <ExternalLink className="h-4 w-4 text-emerald shrink-0" />
              </button>
            )}
          </div>
          <DialogFooter className="mt-4 pt-3 border-t border-border gap-2 sm:justify-between">
            {form.id ? (
              <Button variant="ghost" onClick={remove} disabled={deleteEvent.isPending} className="text-destructive hover:text-destructive gap-1.5">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={saving || !form.date} className="bg-emerald text-primary-foreground hover:bg-emerald/90">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{form.id ? "Save" : "Schedule"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CandidateProfile candidate={profileCand} open={profileOpen} onOpenChange={setProfileOpen} initialTab="scorecards" eventId={form.id} />
    </div>
  );
}
