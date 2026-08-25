import {
  Bar, BarChart, Cell, PolarAngleAxis, RadialBar, RadialBarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Building2, MapPin, Sparkles, Users } from "lucide-react";
import type { PublicStats } from "@/lib/careers";

const SERIES = ["214 100% 62%", "196 100% 74%", "186 100% 72%", "222 100% 66%", "202 100% 68%"];

function Metric({ icon: Icon, value, label, sub }: { icon: typeof Users; value: string | number; label: string; sub: string }) {
  return (
    <div className="glass-panel hover-lift relative overflow-hidden rounded-2xl p-5">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/20 blur-3xl" />
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
        <Icon className="h-4 w-4" />
      </div>
      <p className="font-display text-4xl font-bold leading-none text-foreground">{value}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

export default function CareersInfographics({ stats }: { stats: PublicStats }) {
  const roleData = stats.by_role.map((r, i) => ({
    name: r.title.length > 26 ? `${r.title.slice(0, 25)}…` : r.title,
    count: r.count,
    fill: `hsl(${SERIES[i % SERIES.length]})`,
  }));
  const regionData = stats.by_region.slice(0, 5).map((r, i) => ({
    name: r.region || "Network-wide",
    count: r.count,
    fill: `hsl(${SERIES[i % SERIES.length]})`,
  }));
  const maxRegion = Math.max(1, ...regionData.map((r) => r.count));

  return (
    <section aria-labelledby="hiring-snapshot" className="space-y-6">
      <div>
        <p className="micro-label text-primary">Live hiring snapshot</p>
        <h2 id="hiring-snapshot" className="font-display text-3xl font-bold text-foreground sm:text-4xl">
          Where the openings actually are
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Pulled live from our requisition system the moment a manager opens a seat — not a scraped job-board feed.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Sparkles} value={stats.open_roles} label="Open roles" sub="Actively interviewing right now" />
        <Metric icon={Users} value={stats.seats} label="Seats to fill" sub="Total headcount across openings" />
        <Metric icon={Building2} value={stats.offices} label="Offices hiring" sub="Across our 1,200+ office network" />
        <Metric icon={MapPin} value={stats.regions} label="Regions" sub="Counties currently recruiting" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="glass-panel rounded-2xl p-5 lg:col-span-3">
          <p className="micro-label text-muted-foreground">Openings by role</p>
          <div className="mt-4 h-[260px]">
            {roleData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roleData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" hide domain={[0, "dataMax"]} />
                  <YAxis
                    type="category" dataKey="name" width={150} axisLine={false} tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--primary) / 0.06)" }}
                    contentStyle={{
                      background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))",
                      borderRadius: 12, fontSize: 12, color: "hsl(var(--popover-foreground))",
                    }}
                    formatter={(v: number) => [`${v} seat${v === 1 ? "" : "s"}`, "Hiring"]}
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={16}>
                    {roleData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No openings posted at the moment.
              </p>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 lg:col-span-2">
          <p className="micro-label text-muted-foreground">Seats by region</p>
          <div className="mt-4 h-[260px]">
            {regionData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={regionData} innerRadius="34%" outerRadius="100%"
                  startAngle={90} endAngle={-270} barSize={12}
                >
                  <PolarAngleAxis type="number" domain={[0, maxRegion]} tick={false} />
                  <RadialBar dataKey="count" cornerRadius={8} background={{ fill: "hsl(var(--muted) / 0.5)" }}>
                    {regionData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                  </RadialBar>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))",
                      borderRadius: 12, fontSize: 12, color: "hsl(var(--popover-foreground))",
                    }}
                    formatter={(v: number, _n, p) => [`${v} seat${v === 1 ? "" : "s"}`, (p?.payload as { name?: string })?.name || ""]}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Nothing posted yet.</p>
            )}
          </div>
          <ul className="mt-3 space-y-1.5">
            {regionData.map((r) => (
              <li key={r.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: r.fill }} />
                <span className="min-w-0 flex-1 truncate text-foreground">{r.name}</span>
                <span className="font-mono text-[11px]">{r.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
