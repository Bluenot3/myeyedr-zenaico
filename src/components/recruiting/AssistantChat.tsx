import { useEffect, useRef, useState } from "react";
import RichMessage from "./RichMessage";
import EmailDraftCard from "./EmailDraftCard";
import {
  Send, Loader2, Bot, User, Sparkles, Check, X, CheckCircle2, ArrowRight, Trash2, StickyNote,
  Share2, Pencil, Paperclip, Briefcase, Copy, Lock, CalendarPlus, Users, BookMarked, FileText,
  Mail, PhoneCall, AlertTriangle, TrendingUp, ClipboardList,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  useCandidates, useUpdateCandidate, useAddNote, useShareCandidate, useCandidateLifecycle,
  useBulkUpdateCandidates, useCreatePosition, useUpdatePosition, useDeletePosition,
  useReassignRequisition, useCreateJobTemplate, useCreateEvent, usePositions, useLocations,
  useLogContact, useCreateApplication,
} from "@/hooks/useRecruiting";
import { stageProgress } from "@/lib/recruiting";


interface ProposedAction {
  id: string;
  type: string;
  label: string;
  args: Record<string, any>;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: ProposedAction[];
  attachmentName?: string;
}

type ActionStatus = "idle" | "running" | "done" | "error" | "dismissed";

const ACTION_ICON: Record<string, typeof ArrowRight> = {
  move_stage: ArrowRight,
  hire_candidate: CheckCircle2,
  pool_candidate: Sparkles,
  reject_candidate: Trash2,
  add_note: StickyNote,
  share_to_location: Share2,
  update_candidate_info: Pencil,
  set_candidate_status: Pencil,
  assign_candidate_to_position: ArrowRight,
  bulk_move_stage: Users,
  create_position: Briefcase,
  update_position: Pencil,
  set_position_status: Lock,
  clone_position: Copy,
  delete_position: Trash2,
  create_job_template: BookMarked,
  schedule_interview: CalendarPlus,
  draft_email: Mail,
  log_contact: PhoneCall,
};

interface Suggestion { label: string; prompt: string; tone?: string }

const TONE_ICON: Record<string, typeof Sparkles> = {
  urgent: AlertTriangle,
  warn: AlertTriangle,
  opportunity: TrendingUp,
  action: Mail,
  plan: ClipboardList,
};

const TONE_CLASS: Record<string, string> = {
  urgent: "text-destructive",
  warn: "text-gold",
  opportunity: "text-emerald",
  action: "text-cyan",
  plan: "text-emerald",
};

const FALLBACK_SUGGESTIONS: Suggestion[] = [
  { label: "What should I do next?", prompt: "What should I focus on right now? Give me a prioritized plan and propose the actions and emails you can handle.", tone: "plan" },
  { label: "Who are my strongest candidates right now?", prompt: "Who are my strongest candidates right now?", tone: "opportunity" },
  { label: "Compare my top 3 candidates for the same role", prompt: "Compare my top 3 candidates for the same role", tone: "opportunity" },
  { label: "Open a requisition — attach the job description", prompt: "Open a new requisition from the attached job description", tone: "action" },

];

export default function AssistantChat({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ActionStatus>>({});
  const [animateIndex, setAnimateIndex] = useState<number>(-1);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(FALLBACK_SUGGESTIONS);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: candidates = [] } = useCandidates();
  const { data: positions = [] } = usePositions();
  const { data: locations = [] } = useLocations();
  const updateCandidate = useUpdateCandidate();
  const bulkUpdate = useBulkUpdateCandidates();
  const addNote = useAddNote();
  const share = useShareCandidate();
  const lifecycle = useCandidateLifecycle();
  const createPosition = useCreatePosition();
  const updatePosition = useUpdatePosition();
  const deletePosition = useDeletePosition();
  const reassign = useReassignRequisition();
  const createTemplate = useCreateJobTemplate();
  const createEvent = useCreateEvent();
  const logContact = useLogContact();

  /* Pull live "what needs you now" starters — deterministic, no AI spend. */
  useEffect(() => {
    let cancelled = false;
    supabase.functions
      .invoke("candidate-assistant", { body: { mode: "briefing" } })
      .then(({ data }) => {
        if (cancelled) return;
        const s = Array.isArray(data?.suggestions) ? (data.suggestions as Suggestion[]) : [];
        if (s.length) setSuggestions(s.slice(0, 5));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);




  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  const readAttachment = async (file: File): Promise<string> => {
    const isText = file.type.startsWith("text/") || /\.(txt|md|csv)$/i.test(file.name);
    if (isText) {
      const raw = (await file.text()).slice(0, 40000);
      return `\n\n---ATTACHED FILE: ${file.name}---\n${raw}\n---END ATTACHMENT---`;
    }
    const base64 = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] || "");
      r.onerror = () => reject(new Error("Could not read file"));
      r.readAsDataURL(file);
    });
    const { data, error } = await supabase.functions.invoke("parse-job", {
      body: { fileBase64: base64, fileName: file.name, mimeType: file.type || "application/pdf" },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    const job = data?.data ?? data?.job ?? data;
    return `\n\n---ATTACHED JOB DESCRIPTION (${file.name}), already parsed---\n${JSON.stringify(job)}\n---END ATTACHMENT---`;
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    const file = attachment;
    if ((!trimmed && !file) || busy) return;
    setInput("");
    setBusy(true);
    const visible = trimmed || `Use the attached file: ${file?.name}`;
    setMessages((m) => [...m, { role: "user", content: visible, attachmentName: file?.name }]);
    try {
      let payloadText = visible;
      if (file) {
        payloadText += await readAttachment(file);
        setAttachment(null);
      }
      const history = [
        ...messages.map(({ role, content }) => ({ role, content })),
        { role: "user" as const, content: payloadText },
      ];
      const { data, error } = await supabase.functions.invoke("candidate-assistant", {
        body: { messages: history },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages((m) => {
        setAnimateIndex(m.length);
        return [...m, {
          role: "assistant",
          content: data.reply || "I couldn't produce a response.",
          actions: Array.isArray(data.proposed_actions) ? data.proposed_actions : [],
        }];
      });
    } catch (e: any) {
      const msg = e?.message?.includes("402")
        ? "AI credits exhausted — add credits to continue."
        : e?.message?.includes("429")
        ? "Rate limit reached — please retry shortly."
        : e?.message || "Something went wrong.";
      toast.error(msg);
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setBusy(false);
    }
  };


  const runAction = async (a: ProposedAction) => {
    setStatuses((s) => ({ ...s, [a.id]: "running" }));
    const cand = candidates.find((c) => c.id === a.args.candidate_id);
    try {
      switch (a.type) {
        case "move_stage":
          await updateCandidate.mutateAsync({ id: a.args.candidate_id, stage: a.args.stage, score: Math.max(cand?.score || 0, stageProgress(a.args.stage)) });
          break;
        case "hire_candidate":
          if (!cand) throw new Error("Candidate not found");
          await lifecycle.hire.mutateAsync(cand);
          break;
        case "pool_candidate":
          if (!cand) throw new Error("Candidate not found");
          await lifecycle.pool.mutateAsync({ candidate: cand, reason: a.args.reason || "", roles: a.args.roles || "" });
          break;
        case "reject_candidate":
          if (!cand) throw new Error("Candidate not found");
          await lifecycle.reject.mutateAsync({ candidate: cand, reason: a.args.reason || "" });
          break;
        case "add_note":
          await addNote.mutateAsync({ candidate_id: a.args.candidate_id, body: a.args.note });
          break;
        case "share_to_location":
          await share.mutateAsync({ candidate_id: a.args.candidate_id, location_id: a.args.location_id, note: a.args.note });
          break;
        case "update_candidate_info": {
          const updates: Record<string, any> = {};
          for (const k of ["applied_role", "headline", "current_employer", "years_experience", "rating"]) {
            if (a.args[k] !== undefined && a.args[k] !== null) updates[k] = a.args[k];
          }
          if (Object.keys(updates).length === 0) throw new Error("No fields to update");
          await updateCandidate.mutateAsync({ id: a.args.candidate_id, ...updates });
          break;
        }
        case "set_candidate_status": {
          const updates: Record<string, any> = { status: a.args.status };
          if (a.args.stage) updates.stage = a.args.stage;
          if (a.args.status === "active") updates.in_talent_pool = false;
          await updateCandidate.mutateAsync({ id: a.args.candidate_id, ...updates });
          break;
        }
        case "assign_candidate_to_position": {
          if (!cand) throw new Error("Candidate not found");
          const pos = positions.find((p) => p.id === a.args.position_id);
          if (!pos) throw new Error("Requisition not found");
          const locId = a.args.location_id || pos.location_id || null;
          const loc = locations.find((l) => l.id === locId);
          await reassign.mutateAsync({
            candidate: cand,
            position_id: pos.id,
            location_id: locId,
            region: loc?.region,
            positionTitle: pos.title,
          });
          break;
        }
        case "apply_to_additional_position": {
          if (!cand) throw new Error("Candidate not found");
          const pos = positions.find((p) => p.id === a.args.position_id);
          if (!pos) throw new Error("Requisition not found");
          await createApplication.mutateAsync({
            candidate_id: cand.id,
            position_id: pos.id,
            location_id: a.args.location_id || pos.location_id || null,
            source: cand.source,
            stage: "applied",
            is_primary: false,
            title: `Also applied to ${pos.title}${a.args.reason ? ` — ${a.args.reason}` : ""}`,
          });
          break;
        }
        case "bulk_move_stage": {
          const ids: string[] = Array.isArray(a.args.candidate_ids) ? a.args.candidate_ids : [];
          if (ids.length === 0) throw new Error("No candidates selected");
          await bulkUpdate.mutateAsync({
            ids,
            updates: { stage: a.args.stage, score: stageProgress(a.args.stage) } as any,
          });
          break;
        }
        case "create_position": {
          const loc = locations.find((l) => l.id === a.args.location_id);
          await createPosition.mutateAsync({
            title: a.args.title,
            location_id: a.args.location_id || null,
            region: a.args.region || loc?.region || "",
            department: a.args.department || "",
            employment_type: a.args.employment_type || "Full-time",
            openings: Number(a.args.openings) > 0 ? Number(a.args.openings) : 1,
            status: a.args.status || "open",
            priority: a.args.priority || "medium",
            description: a.args.description || "",
            requirements: a.args.requirements || "",
            pay_range: a.args.pay_range || "",
            hiring_manager: a.args.hiring_manager || loc?.manager || "",
          } as any);
          break;
        }
        case "update_position": {
          const updates: Record<string, any> = {};
          for (const k of ["title", "department", "employment_type", "openings", "priority", "status", "description", "requirements", "pay_range", "hiring_manager", "location_id", "region"]) {
            if (a.args[k] !== undefined && a.args[k] !== null && a.args[k] !== "") updates[k] = a.args[k];
          }
          if (Object.keys(updates).length === 0) throw new Error("No fields to update");
          await updatePosition.mutateAsync({ id: a.args.position_id, ...updates });
          break;
        }
        case "set_position_status":
          await updatePosition.mutateAsync({ id: a.args.position_id, status: a.args.status });
          break;
        case "clone_position": {
          const src = positions.find((p) => p.id === a.args.source_position_id);
          if (!src) throw new Error("Source requisition not found");
          const locId = a.args.location_id || src.location_id || null;
          const loc = locations.find((l) => l.id === locId);
          await createPosition.mutateAsync({
            title: a.args.title || src.title,
            location_id: locId,
            region: loc?.region || src.region,
            department: src.department,
            employment_type: src.employment_type,
            openings: Number(a.args.openings) > 0 ? Number(a.args.openings) : src.openings || 1,
            status: a.args.status || "open",
            priority: src.priority,
            description: src.description,
            requirements: src.requirements,
            pay_range: src.pay_range,
            hiring_manager: loc?.manager || src.hiring_manager || "",
          } as any);
          break;
        }
        case "delete_position":
          await deletePosition.mutateAsync(a.args.position_id);
          break;
        case "create_job_template":
          await createTemplate.mutateAsync({
            title: a.args.title,
            department: a.args.department || "",
            employment_type: a.args.employment_type || "Full-time",
            description: a.args.description || "",
            requirements: a.args.requirements || "",
            pay_range: a.args.pay_range || "",
          } as any);
          break;
        case "schedule_interview": {
          const starts = new Date(a.args.starts_at);
          if (isNaN(starts.getTime())) throw new Error("Invalid date/time");
          await createEvent.mutateAsync({
            candidate_id: a.args.candidate_id,
            position_id: cand?.position_id ?? null,
            location_id: a.args.location_id || cand?.location_id || null,
            title: a.args.title || `${a.args.event_type || "Interview"} · ${a.args.candidate_name}`,
            event_type: a.args.event_type || "interview",
            starts_at: starts.toISOString(),
            status: "scheduled",
            mode: a.args.mode || "in_person",
            location_detail: a.args.location_detail || "",
            notes: a.args.notes || "",
            created_by: "Talent Assistant",
          } as any);
          break;
        }
        case "log_contact": {
          if (!a.args.candidate_id) throw new Error("Candidate not found");
          await logContact.mutateAsync({
            candidate_id: a.args.candidate_id,
            method: a.args.method || "email",
            outcome: a.args.outcome || "sent",
            notes: a.args.notes || "",
            contacted_by: "Talent Assistant",
            contact_count: cand?.contact_count || 0,
          });
          break;
        }

        default:
          throw new Error("Unknown action");

      }
      setStatuses((s) => ({ ...s, [a.id]: "done" }));
      toast.success(`Done: ${a.label}`);
    } catch (e: any) {
      setStatuses((s) => ({ ...s, [a.id]: "error" }));
      toast.error(e?.message || "Action failed");
    }
  };

  const dismissAction = (a: ProposedAction) => setStatuses((s) => ({ ...s, [a.id]: "dismissed" }));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={scrollRef} className={`flex-1 min-h-0 overflow-y-auto space-y-4 ${compact ? "px-3 py-3" : "px-1 py-2"}`}>
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald/12 border border-emerald/30">
              <Bot className="h-6 w-6 text-emerald" />
            </div>
            <div>
              <p className="font-display font-semibold text-foreground">Talent Assistant</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Ask, compare, or tell me to act — I'll draft the emails, propose the moves, and you confirm.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 w-full max-w-sm">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground/80 text-left px-1">Needs you now</p>
              {suggestions.map((s) => {
                const Icon = TONE_ICON[s.tone || "plan"] || Sparkles;
                return (
                  <button
                    key={s.label}
                    onClick={() => send(s.prompt)}
                    className="text-left text-[11px] rounded-lg border border-border/70 bg-background/40 px-3 py-2 hover:border-emerald/40 hover:bg-emerald/5 transition-colors inline-flex items-center gap-2"
                  >
                    <Icon className={`h-3 w-3 shrink-0 ${TONE_CLASS[s.tone || "plan"] || "text-emerald"}`} /> {s.label}
                  </button>
                );
              })}
            </div>

          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                m.role === "user" ? "bg-cyan/12 border-cyan/30" : "bg-emerald/12 border-emerald/30"
              }`}
            >
              {m.role === "user" ? <User className="h-3.5 w-3.5 text-cyan" /> : <Bot className="h-3.5 w-3.5 text-emerald" />}
            </div>
            <div className={`max-w-[88%] space-y-2 ${m.role === "user" ? "items-end" : ""}`}>
              {m.role === "user" ? (
                <div className="rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm bg-cyan/10 border border-cyan/20 text-foreground">
                  {m.attachmentName && (
                    <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-md bg-background/60 border border-border/60 px-2 py-1 text-[10px] text-muted-foreground">
                      <FileText className="h-3 w-3 text-cyan" /> {m.attachmentName}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                </div>
              ) : (
                <div className="px-0.5 pt-0.5 text-[14px] text-foreground">
                  <RichMessage content={m.content} animate={i === animateIndex} />
                </div>
              )}


              {/* Proposed actions — confirm before running */}
              {m.role === "assistant" && (m.actions?.length ?? 0) > 0 && (
                <div className="space-y-1.5">
                  {m.actions!.map((a) => {
                    const st = statuses[a.id] || "idle";
                    if (st === "dismissed") return null;
                    if (a.type === "draft_email") {
                      const c = candidates.find((x) => x.id === a.args.candidate_id);
                      return (
                        <EmailDraftCard
                          key={a.id}
                          draft={{
                            to: a.args.to || c?.email || "",
                            subject: a.args.subject || "",
                            body: a.args.body || "",
                            purpose: a.args.purpose,
                            candidate_name: a.args.candidate_name || c?.full_name,
                          }}
                          onSent={(final) => {
                            if (!a.args.candidate_id) return;
                            logContact.mutate({
                              candidate_id: a.args.candidate_id,
                              method: "email",
                              outcome: "sent",
                              notes: final.subject,
                              contacted_by: "Talent Assistant",
                              contact_count: c?.contact_count || 0,
                            });
                          }}
                        />
                      );
                    }
                    const Icon = ACTION_ICON[a.type] || ArrowRight;
                    return (

                      <div key={a.id} className="rounded-xl border border-emerald/25 bg-emerald/[0.06] p-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald/12 border border-emerald/25 text-emerald">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <p className="text-xs font-medium text-foreground flex-1 min-w-0">{a.label}</p>
                          {st === "done" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald shrink-0"><Check className="h-3.5 w-3.5" /> Done</span>
                          ) : st === "error" ? (
                            <button onClick={() => runAction(a)} className="text-[11px] font-medium text-destructive hover:underline shrink-0">Retry</button>
                          ) : (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button size="sm" className="h-7 px-2.5 text-[11px] gap-1 bg-emerald text-primary-foreground hover:bg-emerald/90" disabled={st === "running"} onClick={() => runAction(a)}>
                                {st === "running" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Confirm
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" disabled={st === "running"} onClick={() => dismissAction(a)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald/12 border border-emerald/30">
              <Bot className="h-3.5 w-3.5 text-emerald" />
            </div>
            <div className="pt-1.5 inline-flex items-center gap-1.5 text-[13px]">
              <span className="claude-thinking">Thinking</span>
              <span className="claude-dots"><i /><i /><i /></span>
            </div>
          </div>
        )}
      </div>

      <div className={`border-t border-border pt-3 ${compact ? "px-3 pb-3" : "px-1"}`}>
        {attachment && (
          <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-cyan/25 bg-cyan/[0.06] px-2.5 py-1.5 text-[11px] text-foreground">
            <FileText className="h-3.5 w-3.5 text-cyan shrink-0" />
            <span className="truncate max-w-[220px]">{attachment.name}</span>
            <button onClick={() => setAttachment(null)} className="text-muted-foreground hover:text-foreground" aria-label="Remove attachment">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.md,.csv,image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setAttachment(f);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="h-11 w-11 shrink-0 p-0"
            aria-label="Attach a job description"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask, or tell me to act — attach a job description to open a req…"
            className="min-h-[44px] max-h-32 resize-none text-sm"
            disabled={busy}
          />
          <Button
            onClick={() => send(input)}
            disabled={busy || (!input.trim() && !attachment)}
            className="h-11 w-11 shrink-0 bg-emerald text-primary-foreground hover:bg-emerald/90 p-0"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

    </div>
  );
}
