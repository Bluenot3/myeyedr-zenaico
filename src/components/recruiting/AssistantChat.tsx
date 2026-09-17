import { useEffect, useRef, useState } from "react";
import RichMessage from "./RichMessage";
import EmailDraftCard from "./EmailDraftCard";
import AssistantSettings from "./AssistantSettings";
import {
  Send, Loader2, Bot, User, Sparkles, Check, X, CheckCircle2, ArrowRight, Trash2, StickyNote,
  Share2, Pencil, Paperclip, Briefcase, Copy, Lock, CalendarPlus, Users, BookMarked, FileText,
  Mail, PhoneCall, AlertTriangle, TrendingUp, ClipboardList, Square, CalendarClock, Play,
  MapPin, UserPlus,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  useCandidates, useUpdateCandidate, useAddNote, useShareCandidate, useCandidateLifecycle,
  useBulkUpdateCandidates, useCreatePosition, useUpdatePosition, useDeletePosition,
  useReassignRequisition, useCreateJobTemplate, useCreateEvent, usePositions, useLocations,
  useLogContact, useCreateApplication, useCreateCandidate, useDeleteCandidate,
  useCreateLocation, useUpdateLocation, useUpsertOnboarding, useRecordDecision,
  useUpdateJobTemplate, useDeleteJobTemplate, useAnalyzeCandidateSignals,
} from "@/hooks/useRecruiting";
import {
  useAssistantTasks, useRecordTaskRun, dueTasks, useCreateAssistantTask, type AssistantTask,
} from "@/hooks/useAssistantTasks";

import {
  loadPrefs, savePrefs, LENGTH_LABEL, STYLE_LABEL, type AssistantPrefs,
} from "@/lib/assistantPrefs";
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
  apply_to_additional_position: Briefcase,
  bulk_move_stage: Users,
  bulk_set_position_status: Lock,
  bulk_update_positions: Pencil,
  create_position: Briefcase,
  update_position: Pencil,
  set_position_status: Lock,
  clone_position: Copy,
  delete_position: Trash2,
  create_job_template: BookMarked,
  schedule_interview: CalendarPlus,
  draft_email: Mail,
  log_contact: PhoneCall,
  create_candidate: User,
  delete_candidate: Trash2,
  bulk_set_candidate_status: Users,
  bulk_share_candidates: Share2,
  bulk_apply_to_position: Briefcase,
  run_signal_scan: Sparkles,
  record_decision: ClipboardList,
  update_onboarding: CheckCircle2,
  create_location: MapPin,
  update_location: MapPin,
  invite_user: UserPlus,
  update_job_template: Pencil,
  delete_job_template: Trash2,
  schedule_recurring_task: CalendarClock,
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
  const [streamIndex, setStreamIndex] = useState(-1);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ActionStatus>>({});
  const [animateIndex, setAnimateIndex] = useState<number>(-1);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(FALLBACK_SUGGESTIONS);
  const [prefs, setPrefs] = useState<AssistantPrefs>(() => loadPrefs());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const activeTask = useRef<AssistantTask | null>(null);
  const lastActions = useRef<ProposedAction[]>([]);

  const { data: candidates = [] } = useCandidates();
  const { data: positions = [] } = usePositions();
  const { data: locations = [] } = useLocations();
  const { data: tasks = [] } = useAssistantTasks();
  const recordRun = useRecordTaskRun();
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
  const createApplication = useCreateApplication();
  const createCandidate = useCreateCandidate();
  const deleteCandidate = useDeleteCandidate();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const upsertOnboarding = useUpsertOnboarding();
  const recordDecision = useRecordDecision();
  const updateTemplate = useUpdateJobTemplate();
  const deleteTemplate = useDeleteJobTemplate();
  const signalScan = useAnalyzeCandidateSignals();
  const createTask = useCreateAssistantTask();


  const due = dueTasks(tasks);

  const applyPrefs = (p: AssistantPrefs) => {
    setPrefs(p);
    savePrefs(p);
  };


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

  const prefsPayload = () => ({
    length: prefs.length,
    style: prefs.style,
    charts: prefs.charts,
    tables: prefs.tables,
    proactive: prefs.proactive,
    autoActions: prefs.autoActions,
    temperature: prefs.temperature,
  });

  /** Model routing — workspace model, or the operator's own key when enabled. */
  const modelPayload = () => ({
    model: prefs.model,
    byok: prefs.byokEnabled && prefs.byokKey.trim()
      ? { provider: prefs.byokProvider, key: prefs.byokKey.trim(), model: prefs.byokModel.trim() }
      : undefined,
  });


  /** Token-by-token stream straight from the edge function's SSE channel. */
  const streamReply = async (history: { role: string; content: string }[]) => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token;
    if (!token) throw new Error("Session expired — sign in again.");

    const controller = new AbortController();
    abortRef.current = controller;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/candidate-assistant`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        },
        body: JSON.stringify({ messages: history, stream: true, prefs: prefsPayload(), ...modelPayload() }),
        signal: controller.signal,
      },
    );
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      throw new Error(detail || `AI error ${res.status}`);
    }

    // Placeholder message that grows as tokens land.
    let index = -1;
    setMessages((m) => {
      index = m.length;
      setStreamIndex(index);
      return [...m, { role: "assistant", content: "", actions: [] }];
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";

    const patch = (updater: (msg: ChatMessage) => ChatMessage) =>
      setMessages((m) => m.map((msg, i) => (i === index ? updater(msg) : msg)));

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        let ev: any;
        try { ev = JSON.parse(t.slice(5).trim()); } catch { continue; }
        if (ev.t === "delta") {
          text += ev.v;
          patch((msg) => ({ ...msg, content: text }));
        } else if (ev.t === "done") {
          const acts: ProposedAction[] = Array.isArray(ev.actions) ? ev.actions : [];
          lastActions.current = acts;
          patch((msg) => ({
            ...msg,
            content: text || "I couldn't produce a response.",
            actions: acts,
          }));

        } else if (ev.t === "error") {
          throw new Error(ev.message || "Stream failed");
        }
      }
    }
    setStreamIndex(-1);
    abortRef.current = null;
    return text;
  };

  const send = async (text: string, opts?: { task?: AssistantTask }) => {
    const trimmed = text.trim();
    const file = attachment;
    if ((!trimmed && !file) || busy) return;
    setInput("");
    setBusy(true);
    activeTask.current = opts?.task ?? null;
    const visible = trimmed || `Use the attached file: ${file?.name}`;
    setMessages((m) => [...m, { role: "user", content: visible, attachmentName: file?.name }]);
    try {
      lastActions.current = [];
      let payloadText = visible;
      if (file) {
        payloadText += await readAttachment(file);
        setAttachment(null);
      }
      const history = [
        ...messages.map(({ role, content }) => ({ role, content })),
        { role: "user" as const, content: payloadText },
      ];

      let replyText = "";
      if (prefs.streaming) {
        replyText = await streamReply(history);
      } else {
        const { data, error } = await supabase.functions.invoke("candidate-assistant", {
          body: { messages: history, prefs: prefsPayload(), ...modelPayload() },
        });
        // supabase-js masks non-2xx as a generic message — read the function's own error.
        if (error) {
          let detail = "";
          try { detail = (await (error as any).context?.text?.()) || ""; } catch { /* body already read */ }
          try { detail = JSON.parse(detail)?.error || detail; } catch { /* plain text */ }
          throw new Error(detail || error.message);
        }
        if (data?.error) throw new Error(data.error);

        replyText = data.reply || "I couldn't produce a response.";
        const acts: ProposedAction[] = Array.isArray(data.proposed_actions) ? data.proposed_actions : [];
        lastActions.current = acts;
        setMessages((m) => {
          setAnimateIndex(m.length);
          return [...m, { role: "assistant", content: replyText, actions: acts }];
        });
      }

      const task = activeTask.current;
      if (task && replyText) {
        recordRun.mutate({ task, result: replyText });
      }

      // Auto-apply mode: execute everything the assistant prepared, no row-by-row clicking.
      if (prefs.autoRun && lastActions.current.length > 0) {
        await runAll(lastActions.current);
      }
    } catch (e: any) {

      if (e?.name === "AbortError") {
        setStreamIndex(-1);
      } else {
        const msg = e?.message?.includes("402")
          ? "AI credits exhausted — add credits to continue."
          : e?.message?.includes("429")
          ? "Rate limit reached — please retry shortly."
          : e?.message || "Something went wrong.";
        toast.error(msg);
        setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
      }
    } finally {
      activeTask.current = null;
      abortRef.current = null;
      setStreamIndex(-1);
      setBusy(false);
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const runTask = (task: AssistantTask) => {
    send(`Run my standing task “${task.title}”.\n\n${task.prompt}`, { task });
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
        case "bulk_set_position_status": {
          const pids: string[] = Array.isArray(a.args.position_ids) ? a.args.position_ids : [];
          if (pids.length === 0) throw new Error("No requisitions selected");
          for (const id of pids) await updatePosition.mutateAsync({ id, status: a.args.status });
          break;
        }
        case "bulk_update_positions": {
          const pids: string[] = Array.isArray(a.args.position_ids) ? a.args.position_ids : [];
          if (pids.length === 0) throw new Error("No requisitions selected");
          const updates: Record<string, any> = {};
          for (const k of ["priority", "openings", "employment_type", "pay_range", "hiring_manager", "department", "status"]) {
            if (a.args[k] !== undefined && a.args[k] !== null && a.args[k] !== "") updates[k] = a.args[k];
          }
          if (Object.keys(updates).length === 0) throw new Error("No fields to update");
          for (const id of pids) await updatePosition.mutateAsync({ id, ...updates });
          break;
        }
        case "create_candidate": {
          const pos = positions.find((p) => p.id === a.args.position_id);
          const locId = a.args.location_id || pos?.location_id || null;
          const loc = locations.find((l) => l.id === locId);
          await createCandidate.mutateAsync({
            full_name: a.args.full_name,
            email: a.args.email || "",
            phone: a.args.phone || "",
            applied_role: a.args.applied_role || pos?.title || "",
            headline: a.args.headline || "",
            current_employer: a.args.current_employer || "",
            years_experience: Number(a.args.years_experience) || 0,
            position_id: pos?.id ?? null,
            location_id: locId,
            region: loc?.region || "",
            source: a.args.source || "Talent Assistant",
            stage: a.args.stage || "applied",
            status: "active",
          } as any);
          break;
        }
        case "delete_candidate":
          await deleteCandidate.mutateAsync(a.args.candidate_id);
          break;
        case "bulk_set_candidate_status": {
          const ids: string[] = Array.isArray(a.args.candidate_ids) ? a.args.candidate_ids : [];
          if (ids.length === 0) throw new Error("No candidates selected");
          const reason = a.args.reason || "";
          if (a.args.status === "talent_pool") {
            for (const id of ids) {
              const c = candidates.find((x) => x.id === id);
              if (c) await lifecycle.pool.mutateAsync({ candidate: c, reason, roles: "" });
            }
          } else if (a.args.status === "rejected") {
            for (const id of ids) {
              const c = candidates.find((x) => x.id === id);
              if (c) await lifecycle.reject.mutateAsync({ candidate: c, reason });
            }
          } else if (a.args.status === "hired") {
            for (const id of ids) {
              const c = candidates.find((x) => x.id === id);
              if (c) await lifecycle.hire.mutateAsync(c);
            }
          } else {
            await bulkUpdate.mutateAsync({ ids, updates: { status: "active", in_talent_pool: false } as any });
          }
          break;
        }
        case "bulk_share_candidates": {
          const ids: string[] = Array.isArray(a.args.candidate_ids) ? a.args.candidate_ids : [];
          if (ids.length === 0) throw new Error("No candidates selected");
          if (!a.args.location_id) throw new Error("No office selected");
          for (const id of ids) {
            await share.mutateAsync({ candidate_id: id, location_id: a.args.location_id, note: a.args.note });
          }
          break;
        }
        case "bulk_apply_to_position": {
          const ids: string[] = Array.isArray(a.args.candidate_ids) ? a.args.candidate_ids : [];
          const pos = positions.find((p) => p.id === a.args.position_id);
          if (!pos) throw new Error("Requisition not found");
          if (ids.length === 0) throw new Error("No candidates selected");
          for (const id of ids) {
            const c = candidates.find((x) => x.id === id);
            await createApplication.mutateAsync({
              candidate_id: id,
              position_id: pos.id,
              location_id: a.args.location_id || pos.location_id || null,
              source: c?.source,
              stage: "applied",
              is_primary: false,
              title: `Also applied to ${pos.title}${a.args.reason ? ` — ${a.args.reason}` : ""}`,
            });
          }
          break;
        }
        case "run_signal_scan":
          await signalScan.mutateAsync({ candidateId: a.args.candidate_id, evaluatorName: "Talent Assistant" });
          break;
        case "record_decision":
          await recordDecision.mutateAsync({
            candidate_id: a.args.candidate_id,
            decision: a.args.decision,
            rationale: a.args.rationale || "",
          } as any);
          break;
        case "update_onboarding": {
          const updates: Record<string, any> = {};
          if (a.args.trainer_name) updates.trainer_name = a.args.trainer_name;
          if (a.args.first_day_date) updates.first_day_date = a.args.first_day_date;
          if (a.args.coverage_plan) updates.coverage_plan = a.args.coverage_plan;
          if (a.args.notes) updates.notes = a.args.notes;
          await upsertOnboarding.mutateAsync({
            candidate_id: a.args.candidate_id,
            updates,
            seedLocationId: cand?.location_id ?? null,
          });
          toast.success("Onboarding readiness updated");
          break;
        }
        case "create_location":
          await createLocation.mutateAsync({
            name: a.args.name,
            city: a.args.city || "",
            state: a.args.state || "",
            region: a.args.region || "",
            manager: a.args.manager || "",
            manager_email: a.args.manager_email || "",
          } as any);
          break;
        case "update_location": {
          const updates: Record<string, any> = {};
          for (const k of ["name", "city", "state", "region", "manager", "manager_email"]) {
            if (a.args[k]) updates[k] = a.args[k];
          }
          if (Object.keys(updates).length === 0) throw new Error("No fields to update");
          await updateLocation.mutateAsync({ id: a.args.location_id, ...updates });
          break;
        }
        case "invite_user": {
          const { data, error } = await supabase.functions.invoke("admin-users", {
            body: {
              action: "invite",
              email: a.args.email,
              full_name: a.args.full_name,
              title: a.args.title || "",
              role: a.args.role || "manager",
              location_ids: Array.isArray(a.args.location_ids) ? a.args.location_ids : [],
              redirect_to: `${window.location.origin}/reset-password`,
            },
          });
          if (error) throw error;
          if ((data as any)?.error) throw new Error((data as any).error);
          toast.success(`Invite sent to ${a.args.email}`);
          break;
        }
        case "update_job_template": {
          const updates: Record<string, any> = {};
          for (const k of ["title", "department", "employment_type", "description", "requirements", "pay_range"]) {
            if (a.args[k]) updates[k] = a.args[k];
          }
          if (Object.keys(updates).length === 0) throw new Error("No fields to update");
          await updateTemplate.mutateAsync({ id: a.args.template_id, ...updates } as any);
          break;
        }
        case "delete_job_template":
          await deleteTemplate.mutateAsync(a.args.template_id);
          break;
        case "schedule_recurring_task":
          await createTask.mutateAsync({
            title: a.args.title,
            prompt: a.args.prompt,
            cadence: a.args.cadence || "daily",
          });
          break;



        default:
          throw new Error("Unknown action");

      }
      setStatuses((s) => ({ ...s, [a.id]: "done" }));
      toast.success(`Done: ${a.label}`);
      return true;
    } catch (e: any) {
      setStatuses((s) => ({ ...s, [a.id]: "error" }));
      toast.error(e?.message || "Action failed");
      return false;
    }
  };

  /** Run every pending action in a reply in one go — no row-by-row confirming. */
  const runAll = async (actions: ProposedAction[]) => {
    const pending = actions.filter(
      (a) => a.type !== "draft_email" && !["done", "running", "dismissed"].includes(statuses[a.id] || "idle"),
    );
    if (pending.length === 0) return;
    let ok = 0;
    for (const a of pending) if (await runAction(a)) ok++;
    if (ok) toast.success(`Applied ${ok} of ${pending.length} action${pending.length === 1 ? "" : "s"}`);
  };

  const dismissAll = (actions: ProposedAction[]) =>
    setStatuses((s) => {
      const n = { ...s };
      actions.forEach((a) => { if (!["done", "running"].includes(n[a.id] || "idle")) n[a.id] = "dismissed"; });
      return n;
    });

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

            {due.length > 0 && (
              <div className="flex flex-col gap-1.5 w-full max-w-sm">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground/80 text-left px-1 inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3 text-cyan" /> Scheduled tasks due
                </p>
                {due.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => runTask(t)}
                    className="text-left text-[11px] rounded-lg border border-cyan/30 bg-cyan/[0.06] px-3 py-2 hover:border-cyan/50 transition-colors inline-flex items-center gap-2"
                  >
                    <Play className="h-3 w-3 shrink-0 text-cyan" /> Run “{t.title}”
                  </button>
                ))}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground/70">
              {LENGTH_LABEL[prefs.length]} · {STYLE_LABEL[prefs.style]} · {prefs.streaming ? "live streaming" : "buffered"}
            </p>
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
                  <RichMessage
                    content={m.content}
                    animate={i === animateIndex}
                    live={i === streamIndex}
                    streamStyle={prefs.streamStyle}
                  />
                </div>

              )}


              {/* Proposed actions — confirm one, or apply the whole batch at once */}
              {m.role === "assistant" && (m.actions?.length ?? 0) > 0 && (
                <div className="space-y-1.5">
                  {(() => {
                    const pending = m.actions!.filter(
                      (a) => a.type !== "draft_email" && !["done", "running", "dismissed"].includes(statuses[a.id] || "idle"),
                    );
                    if (pending.length < 2) return null;
                    return (
                      <div className="flex items-center gap-2 rounded-xl border border-emerald/30 bg-emerald/[0.08] px-3 py-2">
                        <Users className="h-3.5 w-3.5 text-emerald shrink-0" />
                        <p className="text-[11.5px] font-medium text-foreground flex-1 min-w-0">
                          {pending.length} actions ready — apply them together
                        </p>
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-[11px] gap-1 bg-emerald text-primary-foreground hover:bg-emerald/90"
                          onClick={() => runAll(m.actions!)}
                        >
                          <Check className="h-3 w-3" /> Apply all
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px] text-muted-foreground"
                          onClick={() => dismissAll(m.actions!)}
                        >
                          Dismiss all
                        </Button>
                      </div>
                    );
                  })()}
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

        {busy && streamIndex === -1 && (
          <div className="flex gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald/12 border border-emerald/30">
              <Bot className="h-3.5 w-3.5 text-emerald" />
            </div>
            <div className="pt-1.5 inline-flex items-center gap-1.5 text-[13px]">
              <span className="claude-thinking">{activeTask.current ? "Working the task" : "Thinking"}</span>
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
          <AssistantSettings prefs={prefs} onChange={applyPrefs} onRunTask={runTask} running={busy} />
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask, or tell me to act — attach a job description to open a req…"
            className="min-h-[44px] max-h-32 resize-none text-sm"
            disabled={busy}
          />
          {busy && prefs.streaming ? (
            <Button
              onClick={stop}
              variant="outline"
              className="h-11 w-11 shrink-0 p-0 border-destructive/40 text-destructive hover:bg-destructive/10"
              aria-label="Stop generating"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              onClick={() => send(input)}
              disabled={busy || (!input.trim() && !attachment)}
              className="h-11 w-11 shrink-0 bg-emerald text-primary-foreground hover:bg-emerald/90 p-0"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          )}
        </div>

      </div>

    </div>
  );
}
