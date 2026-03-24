import { MapPin, ClipboardList } from "lucide-react";
import LocationDirectory from "@/components/LocationDirectory";
import OnboardingPhases from "@/components/OnboardingPhases";
import CommandCenter from "@/components/CommandCenter";

const navLinks = [
  { href: "#command-center", label: "Command Center" },
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
        {/* Command Center */}
        <div id="command-center">
          <CommandCenter />
        </div>

        {/* Locations & Phases */}
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
