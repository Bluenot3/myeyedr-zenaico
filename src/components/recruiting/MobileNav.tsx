import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { LucideIcon } from "lucide-react";

export interface MobileNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

interface Props {
  items: MobileNavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}

/** Number of tabs shown inline before collapsing the rest into "More". */
const PRIMARY_COUNT = 4;

/**
 * iOS-style bottom tab bar: a small set of primary tabs plus a "More"
 * sheet that reveals the remaining destinations in a clean grid.
 */
export default function MobileNav({ items, activeKey, onSelect }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);

  const needsMore = items.length > PRIMARY_COUNT + 1;
  const primary = needsMore ? items.slice(0, PRIMARY_COUNT) : items;
  const overflow = needsMore ? items.slice(PRIMARY_COUNT) : [];
  const overflowActive = overflow.some((i) => i.key === activeKey);

  const Tab = ({
    item,
    active,
    onClick,
  }: {
    item: MobileNavItem;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className="relative flex flex-1 flex-col items-center justify-center gap-1 min-h-[54px] tap-target press-spring"
    >
      <span
        className={`relative flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-300 ${
          active ? "text-emerald" : "text-muted-foreground scale-95"
        }`}
      >
        {active && (
          <span
            className="mnav-pill absolute inset-0 rounded-2xl bg-emerald/15 border border-emerald/25 shadow-[0_6px_20px_-8px_hsl(var(--emerald)/0.7)]"
            aria-hidden
          />
        )}
        <item.icon className={`relative h-[22px] w-[22px] transition-transform duration-300 ${active ? "scale-110" : ""}`} />
      </span>
      <span
        className={`text-[10px] leading-none tracking-tight transition-all duration-300 ${
          active ? "text-emerald font-semibold" : "text-muted-foreground font-medium"
        }`}
      >
        {item.label}
      </span>
    </button>
  );

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-border safe-bottom">
        <div className="flex items-stretch px-1.5 pt-1.5 pb-1">
          {primary.map((n) => (
            <Tab key={n.key} item={n} active={activeKey === n.key} onClick={() => onSelect(n.key)} />
          ))}
          {needsMore && (
            <button
              onClick={() => setMoreOpen(true)}
              aria-label="More"
              className="relative flex flex-1 flex-col items-center justify-center gap-1 min-h-[52px] tap-target"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-300 ${
                  overflowActive
                    ? "bg-emerald/15 text-emerald shadow-[0_4px_16px_-6px_hsl(var(--emerald)/0.6)]"
                    : "text-muted-foreground scale-95"
                }`}
              >
                <MoreHorizontal className="h-[22px] w-[22px]" />
              </span>
              <span
                className={`text-[10px] font-medium leading-none tracking-tight ${
                  overflowActive ? "text-emerald" : "text-muted-foreground"
                }`}
              >
                More
              </span>
            </button>
          )}
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="lg:hidden rounded-t-3xl border-t border-border glass-panel px-5 pb-8 pt-3"
        >
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted-foreground/25" />
          <p className="text-base font-semibold text-foreground mb-4">More</p>
          <div className="grid grid-cols-3 gap-3">
            {overflow.map((n) => {
              const active = activeKey === n.key;
              return (
                <button
                  key={n.key}
                  onClick={() => {
                    onSelect(n.key);
                    setMoreOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-4 tap-target transition-all ${
                    active
                      ? "liquid-glass border-emerald/40 text-emerald"
                      : "border-border/60 bg-background/40 text-foreground/80 active:scale-95"
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                      active ? "bg-emerald/15 text-emerald" : "bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <n.icon className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-medium leading-tight text-center">{n.label}</span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
