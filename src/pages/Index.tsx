import { useState } from "react";
import { LayoutDashboard, GitBranch, Briefcase, Sparkles, ClipboardList, MapPin, ShieldCheck, Bot, Swords } from "lucide-react";
import Overview from "@/components/recruiting/Overview";
import PipelineBoard from "@/components/recruiting/PipelineBoard";
import Openings from "@/components/recruiting/Openings";
import TalentPool from "@/components/recruiting/TalentPool";
import ScreeningLibrary from "@/components/recruiting/ScreeningLibrary";
import LocationsManager from "@/components/recruiting/LocationsManager";
import AgentStudio from "@/components/recruiting/AgentStudio";
import DecisionTool from "@/components/recruiting/DecisionTool";
import Logo from "@/components/recruiting/Logo";
import ZenSignature from "@/components/recruiting/ZenSignature";

type Tab = "overview" | "pipeline" | "openings" | "pool" | "agents" | "decision" | "library" | "locations";

const NAV: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "pipeline", label: "Pipeline", icon: GitBranch },
  { key: "openings", label: "Openings", icon: Briefcase },
  { key: "pool", label: "Talent Pool", icon: Sparkles },
  { key: "agents", label: "AI Agents", icon: Bot },
  { key: "decision", label: "Decision", icon: Swords },
  { key: "library", label: "Library", icon: ClipboardList },
  { key: "locations", label: "Locations", icon: MapPin },
];

const Index = () => {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="min-h-screen flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border glass-panel sticky top-0 h-screen">
        <div className="p-5 border-b border-border">
          <Logo markSize={36} sub="Talent Command" wordSize={19} />

        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => {
            const active = tab === n.key;
            return (
              <button
                key={n.key}
                onClick={() => setTab(n.key)}
                className={`group relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all tap-target ${active ? "liquid-glass text-emerald border border-emerald/40 shadow-[0_0_24px_-8px_hsl(214_100%_60%/0.6)]" : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"}`}
              >
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-full bg-emerald shadow-[0_0_10px_hsl(214_100%_60%)]" />}
                <n.icon className={`h-4 w-4 transition-transform ${active ? "scale-110 drop-shadow-[0_0_6px_hsl(214_100%_60%/0.8)]" : "group-hover:scale-105"}`} />
                {n.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2.5 rounded-lg bg-background/40 border border-border/60 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 border border-gold/30">
              <ShieldCheck className="h-4 w-4 text-gold" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">Administrator</p>
              <p className="text-[9px] micro-label text-emerald">Full Access</p>
            </div>
          </div>
        </div>
        <div className="px-3 pb-4 pt-1">
          <ZenSignature />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-40 glass-panel border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <Logo markSize={28} wordSize={17} />
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-mono uppercase text-gold" style={{ background: "hsl(var(--gold)/0.12)", border: "1px solid hsl(var(--gold)/0.3)" }}>
              <ShieldCheck className="h-2.5 w-2.5" /> Admin
            </span>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {tab === "overview" && <Overview />}
          {tab === "pipeline" && <PipelineBoard />}
          {tab === "openings" && <Openings />}
          {tab === "pool" && <TalentPool />}
          {tab === "agents" && <AgentStudio />}
          {tab === "decision" && <DecisionTool />}
          {tab === "library" && <ScreeningLibrary />}
          {tab === "locations" && <LocationsManager />}
        </main>
        <footer className="lg:hidden px-4 pb-24 pt-2">
          <ZenSignature />
        </footer>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-border safe-bottom">
        <div className="flex items-center justify-around h-16 overflow-x-auto">
          {NAV.map((n) => {
            const active = tab === n.key;
            return (
              <button
                key={n.key}
                onClick={() => setTab(n.key)}
                className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 tap-target transition-colors ${active ? "text-emerald" : "text-muted-foreground"}`}
              >
                <n.icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition-transform`} />
                <span className="text-[9px] font-medium">{n.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Index;
