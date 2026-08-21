import { useState } from "react";
import { Mail, Copy, Check, Send, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export interface EmailDraft {
  to?: string;
  subject: string;
  body: string;
  purpose?: string;
  candidate_name?: string;
}

/**
 * An AI-written email the admin can edit, then send from their own mailbox in one
 * click. Sending is recorded as a touchpoint on the candidate via `onSent`.
 */
export default function EmailDraftCard({
  draft,
  onSent,
}: {
  draft: EmailDraft;
  onSent?: (final: { to: string; subject: string; body: string }) => void;
}) {
  const [to, setTo] = useState(draft.to || "");
  const [subject, setSubject] = useState(draft.subject || "");
  const [body, setBody] = useState(draft.body || "");
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const send = () => {
    const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(href, "_self");
    setSent(true);
    onSent?.({ to, subject, body });
  };

  return (
    <div className="rounded-xl border border-cyan/25 bg-cyan/[0.05] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-cyan/[0.06] transition-colors"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan/12 border border-cyan/25 text-cyan">
          <Mail className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">
            {draft.purpose || "Email draft"}
            {draft.candidate_name ? ` · ${draft.candidate_name}` : ""}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">{subject}</p>
        </div>
        {sent && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald shrink-0">
            <Check className="h-3 w-3" /> Sent
          </span>
        )}
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-2.5 pb-2.5 space-y-2">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">To</label>
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="name@email.com"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Subject</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[150px] text-xs leading-relaxed resize-y"
          />
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              onClick={send}
              disabled={!to.trim() || !subject.trim()}
              className="h-7 px-2.5 text-[11px] gap-1 bg-cyan text-primary-foreground hover:bg-cyan/90"
            >
              <Send className="h-3 w-3" /> {sent ? "Send again" : "Send from my mailbox"}
            </Button>
            <Button size="sm" variant="outline" onClick={copy} className="h-7 px-2.5 text-[11px] gap-1">
              {copied ? <Check className="h-3 w-3 text-emerald" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <p className="text-[10px] text-muted-foreground ml-auto hidden sm:block">
              Opens your mail app · logged as a touchpoint
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
