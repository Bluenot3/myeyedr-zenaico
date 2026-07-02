import { useState } from "react";
import { LayoutDashboard, GitBranch, Briefcase, Sparkles, ClipboardList, MapPin, ShieldCheck } from "lucide-react";
import Overview from "@/components/recruiting/Overview";
import PipelineBoard from "@/components/recruiting/PipelineBoard";
import Openings from "@/components/recruiting/Openings";
import TalentPool from "@/components/recruiting/TalentPool";
import ScreeningLibrary from "@/components/recruiting/ScreeningLibrary";
import LocationsManager from "@/components/recruiting/LocationsManager";
import Medallion from "@/components/recruiting/Medallion";

type Tab = "overview" | "pipeline" | "openings" | "pool" | "library" | "locations";

const NAV: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "pipeline", label: "Pipeline", icon: GitBranch },
  { key: "openings", label: "Openings", icon: Briefcase },
  { key: "pool", label: "Talent Pool", icon: Sparkles },
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
          <div className="flex items-center gap-2.5">
            <Medallion size={38} />
            <div>
              <p className="font-display text-lg font-bold leading-none text-foil">MyEyeDr</p>
              <p className="micro-label text-[8px] text-muted-foreground mt-1">Talent Command</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => {
            const active = tab === n.key;
            return (
              <button
                key={n.key}
                onClick={() => setTab(n.key)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all tap-target ${active ? "bg-emerald/12 text-emerald border border-emerald/30" : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"}`}
              >
                <n.icon className="h-4 w-4" />
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
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-40 glass-panel border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <Medallion size={30} />
              <span className="font-display text-lg font-bold text-foil">MyEyeDr Talent</span>
            </div>
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
          {tab === "library" && <ScreeningLibrary />}
          {tab === "locations" && <LocationsManager />}
        </main>
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
