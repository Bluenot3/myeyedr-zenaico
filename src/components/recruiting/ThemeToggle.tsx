import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
      className={`relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-background/40 text-muted-foreground transition-all hover:text-emerald hover:border-emerald/50 tap-target ${className}`}
    >
      <Sun className={`h-4 w-4 absolute transition-all duration-300 ${isDark ? "opacity-0 scale-50 rotate-90" : "opacity-100 scale-100 rotate-0 text-gold"}`} />
      <Moon className={`h-4 w-4 absolute transition-all duration-300 ${isDark ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-50 -rotate-90"}`} />
    </button>
  );
}
