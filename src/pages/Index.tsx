import { useEffect, useState } from "react";
import { ScanEye, GitBranch, Sparkles, ClipboardList, MapPin, Bot, Swords, Glasses, Users, LogOut, Crown, Globe, Building2, CalendarDays, FileText, LineChart as LineChartIcon } from "lucide-react";
import Overview from "@/components/recruiting/Overview";
import PipelineBoard from "@/components/recruiting/PipelineBoard";
import Openings from "@/components/recruiting/Openings";
import JobLibrary from "@/components/recruiting/JobLibrary";
import Insights from "@/components/recruiting/Insights";
import CalendarView from "@/components/recruiting/CalendarView";
import TalentPool from "@/components/recruiting/TalentPool";
import ScreeningLibrary from "@/components/recruiting/ScreeningLibrary";
import LocationsManager from "@/components/recruiting/LocationsManager";
import AgentStudio from "@/components/recruiting/AgentStudio";
import DecisionTool from "@/components/recruiting/DecisionTool";
import UsersManager from "@/components/recruiting/UsersManager";
import CandidateAssistant from "@/components/recruiting/CandidateAssistant";
import FloatingAssistant from "@/components/recruiting/FloatingAssistant";
import MobileNav from "@/components/recruiting/MobileNav";
import Logo from "@/components/recruiting/Logo";
import ZenSignature from "@/components/recruiting/ZenSignature";
import ChangePasswordDialog from "@/components/recruiting/ChangePasswordDialog";
import ThemeToggle from "@/components/recruiting/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

type Tab = "overview" | "pipeline" | "openings" | "jobs" | "calendar" | "insights" | "pool" | "askai" | "agents" | "decision" | "library" | "locations" | "users";

const TAB_KEY = "cc.activeTab";

const NAV: { key: Tab; label: string; icon: typeof ScanEye; adminOnly?: boolean; ownerOnly?: boolean; allAccess?: boolean }[] = [
  { key: "overview", label: "Overview", icon: ScanEye },
  { key: "pipeline", label: "Pipeline", icon: GitBranch },
  { key: "openings", label: "Openings", icon: Glasses },
  { key: "jobs", label: "Job Library", icon: FileText, allAccess: true },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "insights", label: "Insights", icon: LineChartIcon, allAccess: true },
  { key: "pool", label: "Talent Pool", icon: Sparkles },
  { key: "askai", label: "Ask AI", icon: Bot, adminOnly: true },
  { key: "agents", label: "AI Agents", icon: Bot, adminOnly: true },
  { key: "decision", label: "Decision", icon: Swords, adminOnly: true },
  { key: "library", label: "Library", icon: ClipboardList },
  { key: "locations", label: "Locations", icon: MapPin },
  { key: "users", label: "Team & Access", icon: Users, ownerOnly: true },
];

const ROLE_INFO: Record<string, { label: string; icon: typeof Crown }> = {
  admin: { label: "Administrator", icon: Crown },
  regional: { label: "Regional", icon: Globe },
  manager: { label: "Manager", icon: Building2 },
};

const Index = () => {
  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem(TAB_KEY) as Tab) || "overview");
  const { isAdmin, isOwner, hasAllAccess, roles, profile, signOut } = useAuth();

  const nav = NAV.filter((n) =>
    (!n.adminOnly || isAdmin) && (!n.ownerOnly || isOwner) && (!n.allAccess || hasAllAccess));
  const activeTab = nav.some((n) => n.key === tab) ? tab : "overview";

  useEffect(() => { localStorage.setItem(TAB_KEY, activeTab); }, [activeTab]);


  const primaryRole = roles.includes("admin") ? "admin" : roles.includes("regional") ? "regional" : "manager";
  const roleInfo = ROLE_INFO[primaryRole];
  const RoleIcon = roleInfo.icon;
  const displayName = profile?.full_name || profile?.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen flex relative aurora-grain">
      <div className="aurora-bg" aria-hidden />
      {/* Sidebar (desktop) */}
      <aside className="relative z-10 hidden lg:flex w-60 shrink-0 flex-col border-r border-border glass-panel sticky top-0 h-screen">

        <div className="p-5 border-b border-border">
          <Logo markSize={36} wordSize={19} />
          <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
          <p className="mt-2.5 micro-label text-[8.5px] text-gold/90">Talent Command</p>
          <p className="micro-label text-[7px] text-muted-foreground/70 mt-1">Institutional Recruiting Desk</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((n) => {
            const active = activeTab === n.key;
            return (
              <button
                key={n.key}
                onClick={() => setTab(n.key)}
                className={`group relative w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all tap-target ${active ? "liquid-glass text-emerald border border-emerald/35 shadow-[0_0_20px_-10px_hsl(var(--emerald)/0.55)]" : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"}`}
              >
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-full bg-emerald shadow-[0_0_10px_hsl(var(--emerald)/0.8)]" />}
                <n.icon className={`h-4 w-4 transition-transform ${active ? "scale-110 drop-shadow-[0_0_5px_hsl(var(--emerald)/0.7)]" : "group-hover:scale-105"}`} />
                {n.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2.5 rounded-lg bg-background/40 border border-border/60 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 border border-gold/30">
              <RoleIcon className="h-4 w-4 text-gold" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{displayName}</p>
              <p className="text-[9px] micro-label text-emerald">{roleInfo.label}</p>
            </div>
            <ThemeToggle />
            <ChangePasswordDialog />
            <button onClick={signOut} title="Sign out" className="text-muted-foreground hover:text-destructive tap-target">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="px-3 pb-4 pt-1">
          <ZenSignature />
        </div>
      </aside>

      {/* Main */}
      <div className="relative z-10 flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-40 glass-panel border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <Logo markSize={28} wordSize={17} />
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-mono uppercase text-gold" style={{ background: "hsl(var(--gold)/0.12)", border: "1px solid hsl(var(--gold)/0.3)" }}>
                <RoleIcon className="h-2.5 w-2.5" /> {roleInfo.label}
              </span>
              <ThemeToggle />
              <ChangePasswordDialog compact />
              <button onClick={signOut} title="Sign out" className="text-muted-foreground hover:text-destructive tap-target">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {activeTab === "overview" && <Overview />}
          {activeTab === "pipeline" && <PipelineBoard />}
          {activeTab === "openings" && <Openings />}
          {activeTab === "calendar" && <CalendarView />}
          {activeTab === "pool" && <TalentPool />}
          {activeTab === "askai" && isAdmin && <CandidateAssistant />}
          {activeTab === "agents" && isAdmin && <AgentStudio />}
          {activeTab === "decision" && isAdmin && <DecisionTool />}
          {activeTab === "library" && <ScreeningLibrary />}
          {activeTab === "locations" && <LocationsManager />}
          {activeTab === "users" && isAdmin && <UsersManager />}
        </main>
        <footer className="lg:hidden px-4 pb-24 pt-2">
          <ZenSignature />
        </footer>
      </div>

      {/* Bottom nav (mobile) — iOS-style tab bar with a "More" sheet */}
      <MobileNav items={nav} activeKey={activeTab} onSelect={(k) => setTab(k as Tab)} />

      {/* Global AI assistant — admins only, hidden on the dedicated Ask AI tab */}
      {isAdmin && activeTab !== "askai" && <FloatingAssistant />}

    </div>
  );
};

export default Index;
