import { Bot } from "lucide-react";
import AssistantChat from "./AssistantChat";

export default function CandidateAssistant() {
  return (
    <div className="animate-rise h-[calc(100vh-11rem)] flex flex-col">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald/12 border border-emerald/30 shrink-0">
          <Bot className="h-5 w-5 text-emerald" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold">Ask AI</h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
            Your candidate analyst. Ask questions, compare applicants, and surface the best fit for any role — scoped to the candidates you can access.
          </p>
        </div>
      </div>
      <div className="flex-1 min-h-0 glass-panel rounded-2xl border border-border p-3">
        <AssistantChat />
      </div>
    </div>
  );
}
