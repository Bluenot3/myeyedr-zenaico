import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, Bot, User, Sparkles, Check, X, CheckCircle2, ArrowRight, Trash2, Star, StickyNote, Share2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  useCandidates, useUpdateCandidate, useAddNote, useShareCandidate, useCandidateLifecycle,
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
};

const SUGGESTIONS = [
  "Who are my strongest candidates right now?",
  "Compare my top 3 candidates for the same role",
  "Which candidates are stuck and need follow-up?",
  "Move my best applicant to interview",
];

export default function AssistantChat({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, ActionStatus>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: candidates = [] } = useCandidates();
  const updateCandidate = useUpdateCandidate();
  const addNote = useAddNote();
  const share = useShareCandidate();
  const lifecycle = useCandidateLifecycle();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("candidate-assistant", {
        body: { messages: next.map(({ role, content }) => ({ role, content })) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages((m) => [...m, {
        role: "assistant",
        content: data.reply || "I couldn't produce a response.",
        actions: Array.isArray(data.proposed_actions) ? data.proposed_actions : [],
      }]);
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
                Ask about your candidates, compare them, or tell me to act — I'll propose the change and you confirm it.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 w-full max-w-sm">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-[11px] rounded-lg border border-border/70 bg-background/40 px-3 py-2 hover:border-emerald/40 hover:bg-emerald/5 transition-colors inline-flex items-center gap-2"
                >
                  <Sparkles className="h-3 w-3 text-emerald shrink-0" /> {s}
                </button>
              ))}
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
            <div className={`max-w-[85%] space-y-2 ${m.role === "user" ? "items-end" : ""}`}>
              <div
                className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-cyan/10 border border-cyan/20 text-foreground"
                    : "bg-background/50 border border-border/70 text-foreground"
                }`}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-li:my-0.5 prose-table:text-xs prose-th:px-2 prose-td:px-2">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>

              {/* Proposed actions — confirm before running */}
              {m.role === "assistant" && (m.actions?.length ?? 0) > 0 && (
                <div className="space-y-1.5">
                  {m.actions!.map((a) => {
                    const st = statuses[a.id] || "idle";
                    if (st === "dismissed") return null;
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
            <div className="rounded-2xl px-3.5 py-2.5 bg-background/50 border border-border/70 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald" /> Analyzing candidates…
            </div>
          </div>
        )}
      </div>

      <div className={`border-t border-border pt-3 ${compact ? "px-3 pb-3" : "px-1"}`}>
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about candidates or tell me to act…"
            className="min-h-[44px] max-h-32 resize-none text-sm"
            disabled={busy}
          />
          <Button
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            className="h-11 w-11 shrink-0 bg-emerald text-primary-foreground hover:bg-emerald/90 p-0"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
