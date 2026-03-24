import { Users, MapPin, ClipboardList, CheckCircle2 } from "lucide-react";
import LocationDirectory from "@/components/LocationDirectory";
import OnboardingPhases from "@/components/OnboardingPhases";
import HiringTracker from "@/components/HiringTracker";

const stats = [
  { label: "Active Candidates", value: "5", icon: Users },
  { label: "Locations", value: "23", icon: MapPin },
  { label: "Onboarding Phases", value: "8", icon: ClipboardList },
  { label: "Cleared to Start", value: "1", icon: CheckCircle2 },
];

const navLinks = [
  { href: "#tracker", label: "Tracker" },
  { href: "#locations", label: "Locations" },
  { href: "#phases", label: "Phases" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="bg-primary h-8 w-8 rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">
                BG
              </span>
            </div>
            <h1 className="font-display font-bold text-foreground text-lg hidden sm:block">
              BGCGW Hiring & Onboarding
            </h1>
          </div>
          <nav className="flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/60"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card rounded-lg border border-border p-5 flex items-center gap-4 shadow-sm"
            >
              <div className="bg-accent/10 text-accent p-2.5 rounded-lg">
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Tracker */}
        <HiringTracker />

        {/* Locations & Phases side by side on desktop */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          <LocationDirectory />
          <OnboardingPhases />
        </div>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <p className="text-center text-xs text-muted-foreground">
          Boys & Girls Clubs of Greater Washington — Internal Hiring & Onboarding Tracker
        </p>
      </footer>
    </div>
  );
};

export default Index;
