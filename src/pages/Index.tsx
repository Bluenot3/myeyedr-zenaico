import { useState } from "react";
import { ClipboardList, MapPin, LayoutDashboard } from "lucide-react";
import CommandCenter from "@/components/CommandCenter";
import OnboardingPhases from "@/components/OnboardingPhases";
import AdminLocationManager from "@/components/AdminLocationManager";

type Tab = "pipeline" | "phases" | "admin";

const Index = () => {
  const [tab, setTab] = useState<Tab>("pipeline");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between h-12 sm:h-14">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-xs sm:text-sm">
                BG
              </span>
            </div>
            <h1 className="font-display font-bold text-foreground text-sm sm:text-lg">
              <span className="hidden sm:inline">BGCGW Hiring & Onboarding</span>
              <span className="sm:hidden">BGCGW</span>
            </h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {tab === "pipeline" && <CommandCenter onOpenAdmin={() => setTab("admin")} />}
        {tab === "phases" && <OnboardingPhases />}
        {tab === "admin" && <AdminLocationManager />}
      </main>

      {/* Bottom nav — mobile-first, always visible */}
      <nav className="sticky bottom-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom">
        <div className="max-w-6xl mx-auto flex items-center justify-around h-14 sm:h-16">
          {([
            { key: "pipeline" as Tab, label: "Pipeline", icon: LayoutDashboard },
            { key: "phases" as Tab, label: "Phases", icon: ClipboardList },
            { key: "admin" as Tab, label: "Admin", icon: MapPin },
          ]).map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-colors touch-manipulation ${
                tab === item.key
                  ? "text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 ${tab === item.key ? "text-accent" : ""}`} />
              <span className="text-[10px] sm:text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Index;
