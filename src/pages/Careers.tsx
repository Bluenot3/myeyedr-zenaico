import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Briefcase, Clock, Eye, Loader2, MapPin, Search, ShieldCheck, Sparkles, Users,
} from "lucide-react";
import Logo from "@/components/recruiting/Logo";
import ZenSignature from "@/components/recruiting/ZenSignature";
import EyeChartField from "@/components/recruiting/EyeChartField";
import ApplyDialog from "@/components/careers/ApplyDialog";
import CareersInfographics from "@/components/careers/CareersInfographics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { jobCity, postedAgo, usePublicJobs, type PublicJob } from "@/lib/careers";

const HEAD_TITLE = "MyEyeDr Careers — optical jobs, direct to the hiring manager";
const HEAD_DESC =
  "Live MyEyeDr openings for opticians, patient service coordinators and optometric technicians. Apply direct — no job boards, no résumé black hole.";

function useCareersHead() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = HEAD_TITLE;
    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute("content") || "";
    meta?.setAttribute("content", HEAD_DESC);
    return () => {
      document.title = prevTitle;
      meta?.setAttribute("content", prevDesc);
    };
  }, []);
}

const PROMISES = [
  { icon: Eye, title: "A real person reads it", body: "Every application lands in front of the hiring manager for that office — same day, not a queue." },
  { icon: Clock, title: "Days, not weeks", body: "Phone screen, one interview, decision. We move at the pace good people deserve." },
  { icon: ShieldCheck, title: "Never sold, never scraped", body: "Applying here keeps your details with our hiring team only. No job board resell." },
];

export default function Careers() {
  useCareersHead();
  const { data, isLoading, isError, refetch } = usePublicJobs();
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("all");
  const [applyJob, setApplyJob] = useState<PublicJob | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);

  const jobs = data?.jobs || [];
  const regions = useMemo(
    () => [...new Set(jobs.map((j) => j.region).filter(Boolean))].sort(),
    [jobs],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return jobs.filter((j) => {
      if (region !== "all" && j.region !== region) return false;
      if (!needle) return true;
      return [j.title, j.department, j.region, jobCity(j), j.employment_type]
        .join(" ").toLowerCase().includes(needle);
    });
  }, [jobs, q, region]);

  const openApply = (job: PublicJob | null) => {
    setApplyJob(job);
    setApplyOpen(true);
  };

  return (
    <div className="relative min-h-screen bg-background">
      <div className="aurora-bg aurora-grain pointer-events-none fixed inset-0" aria-hidden />
      <div className="pointer-events-none fixed inset-0 opacity-60" aria-hidden>
        <EyeChartField />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Logo markSize={34} sub="Careers" />
        <Button variant="outline" size="sm" onClick={() => openApply(null)}>
          Join talent network
        </Button>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24">
        {/* Hero */}
        <section className="py-12 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <Sparkles className="h-3 w-3" /> Now hiring across the network
          </span>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.05] text-foreground sm:text-6xl">
            Great optical careers shouldn't cost you a job board.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            MyEyeDr offices hire opticians, patient service coordinators, optometric technicians and managers who
            genuinely care about patients. Apply straight to the hiring manager — no aggregators, no pay-to-play,
            no application vanishing into a portal.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <a href="#openings">
                See {isLoading ? "" : `${jobs.length} `}open roles <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" onClick={() => openApply(null)}>
              <Users className="mr-2 h-4 w-4" /> Join the talent network
            </Button>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {PROMISES.map((p) => (
              <div key={p.title} className="glass-panel hover-lift rounded-2xl p-5">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
                  <p.icon className="h-4 w-4" />
                </div>
                <p className="font-semibold text-foreground">{p.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Infographics */}
        {data?.stats && (
          <div className="pb-16">
            <CareersInfographics stats={data.stats} />
          </div>
        )}

        {/* Openings */}
        <section id="openings" className="scroll-mt-8 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="micro-label text-primary">Open requisitions</p>
              <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Current openings</h2>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search role, city or office"
                className="pl-9"
                aria-label="Search openings"
              />
            </div>
          </div>

          {regions.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {["all", ...regions].map((r) => (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    region === r
                      ? "border-primary/40 bg-primary/12 text-primary"
                      : "border-border bg-card/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  {r === "all" ? "All regions" : r}
                </button>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center gap-3 py-20 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading live openings…
            </div>
          ) : isError ? (
            <div className="glass-panel rounded-2xl p-10 text-center">
              <p className="font-semibold text-foreground">We couldn't load the openings.</p>
              <p className="mt-1 text-sm text-muted-foreground">The listing service is briefly unavailable.</p>
              <Button className="mt-5" variant="outline" onClick={() => refetch()}>Try again</Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-panel rounded-2xl p-10 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25">
                <Briefcase className="h-5 w-5" />
              </div>
              <p className="font-display text-xl font-bold text-foreground">
                {jobs.length ? "No roles match that search" : "No public openings right now"}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Join the talent network and you'll be the first person a manager calls when a seat opens near you.
              </p>
              <Button className="mt-5" onClick={() => openApply(null)}>Join the talent network</Button>
            </div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {filtered.map((job) => (
                <li key={job.id} className="glass-panel hover-lift group relative overflow-hidden rounded-2xl p-5">
                  <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/15 blur-3xl transition-opacity group-hover:opacity-80" />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-display text-xl font-bold leading-tight text-foreground">
                          <Link to={`/careers/${job.id}`} className="transition-colors hover:text-primary">
                            {job.title}
                          </Link>
                        </h3>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {jobCity(job)}
                          </span>
                          <span aria-hidden>·</span>
                          <span>{job.employment_type}</span>
                          {job.department && (<><span aria-hidden>·</span><span>{job.department}</span></>)}
                        </p>
                      </div>
                      {job.openings > 1 && (
                        <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                          {job.openings} seats
                        </span>
                      )}
                    </div>

                    {job.description && (
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                        {job.description.replace(/[#*_>`-]/g, " ").replace(/\s+/g, " ").trim()}
                      </p>
                    )}

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-muted-foreground">
                        {job.pay_range ? job.pay_range : postedAgo(job.posted_at)}
                      </span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/careers/${job.id}`}>Details</Link>
                        </Button>
                        <Button size="sm" onClick={() => openApply(job)}>Apply</Button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Talent network CTA */}
        <section className="mt-20">
          <div className="glass-panel relative overflow-hidden rounded-3xl p-8 sm:p-12">
            <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" aria-hidden />
            <div className="relative max-w-2xl">
              <p className="micro-label text-primary">Talent network</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-foreground sm:text-4xl">
                Not the right role today? Get first call tomorrow.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Tell us the offices you can reach and what you're great at. When a manager in your area opens a
                seat, you're the shortlist — before the role is ever posted anywhere else.
              </p>
              <Button size="lg" className="mt-6" onClick={() => openApply(null)}>
                <Users className="mr-2 h-4 w-4" /> Join the talent network
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
          <Logo markSize={26} />
          <p className="text-[11px] text-muted-foreground">
            MyEyeDr is an equal opportunity employer. © {new Date().getFullYear()}
          </p>
          <ZenSignature />
        </div>
      </footer>

      <ApplyDialog open={applyOpen} onOpenChange={setApplyOpen} job={applyJob} />
    </div>
  );
}
