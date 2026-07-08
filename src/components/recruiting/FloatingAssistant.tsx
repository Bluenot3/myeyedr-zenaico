import { useState } from "react";
import { Bot, X } from "lucide-react";
import AssistantChat from "./AssistantChat";

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open Talent Assistant"
        className="fixed z-50 bottom-20 right-4 lg:bottom-6 lg:right-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald text-primary-foreground shadow-[0_8px_30px_-6px_hsl(var(--emerald)/0.6)] hover:scale-105 transition-transform"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed z-50 bottom-36 right-4 lg:bottom-24 lg:right-6 w-[calc(100vw-2rem)] sm:w-[400px] h-[70vh] max-h-[600px] rounded-2xl glass-panel border border-border shadow-2xl flex flex-col overflow-hidden animate-rise">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-emerald/5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald/12 border border-emerald/30">
              <Bot className="h-4 w-4 text-emerald" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">Talent Assistant</p>
              <p className="text-[10px] text-muted-foreground">Ask about your candidates</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <AssistantChat compact />
          </div>
        </div>
      )}
    </>
  );
}
