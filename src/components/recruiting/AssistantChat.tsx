import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Who are my strongest candidates right now?",
  "Compare my top 3 candidates for the same role",
  "Which candidates are stuck and need follow-up?",
  "Who is the best fit for my open requisitions?",
];

export default function AssistantChat({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
        body: { messages: next },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages((m) => [...m, { role: "assistant", content: data.reply || "I couldn't produce a response." }]);
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
                Ask about your candidates, compare them, or find the best fit for a role. Scoped to what you can access.
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
            <div
              className={`rounded-2xl px-3.5 py-2.5 text-sm max-w-[85%] ${
                m.role === "user"
                  ? "bg-cyan/10 border border-cyan/20 text-foreground"
                  : "bg-background/50 border border-border/70 text-foreground"
              }`}
            >
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-li:my-0.5 prose-table:text-xs prose-th:px-2 prose-td:px-2">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
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
            placeholder="Ask about your candidates…"
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
