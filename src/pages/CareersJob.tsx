import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Briefcase, Building2, Clock, Loader2, MapPin, Users, Wallet } from "lucide-react";
import Logo from "@/components/recruiting/Logo";
import ZenSignature from "@/components/recruiting/ZenSignature";
import ApplyDialog from "@/components/careers/ApplyDialog";
import { Button } from "@/components/ui/button";
import { jobCity, postedAgo, usePublicJobs } from "@/lib/careers";

/** Render plain/markdown-ish requisition copy as readable paragraphs and bullets. */
function RichText({ text }: { text: string }) {
  const blocks = useMemo(() => {
    return text
      .split(/\n{2,}|\r\n{2,}/)
      .map((b) => b.trim())
      .filter(Boolean);
  }, [text]);

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const bulletish = lines.length > 1 && lines.every((l) => /^([-*•]|\d+[.)])\s+/.test(l));
        if (bulletish) {
          return (
            <ul key={i} className="space-y-2">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{l.replace(/^([-*•]|\d+[.)])\s+/, "")}</span>
                </li>
              ))}
            </ul>
          );
        }
        const heading = /^#{1,4}\s+/.test(block);
        if (heading) {
          return (
            <h3 key={i} className="font-display text-xl font-bold text-foreground">
              {block.replace(/^#{1,4}\s+/, "")}
            </h3>
          );
        }
        return (
          <p key={i} className="text-sm leading-relaxed text-muted-foreground">
            {block.replace(/\*\*/g, "")}
          </p>
        );
      })}
    </div>
  );
}

export default function CareersJob() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = usePublicJobs();
  const [applyOpen, setApplyOpen] = useState(false);

  const job = data?.jobs.find((j) => j.id === id) || null;
  const related = (data?.jobs || []).filter((j) => j.id !== id && (j.region === job?.region || j.title === job?.title)).slice(0, 3);

  useEffect(() => {
    if (!job) return;
    const prev = document.title;
    document.title = `${job.title} — ${jobCity(job)} | MyEyeDr Careers`;
    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute("content") || "";
    meta?.setAttribute(
      "content",
      `${job.title} at MyEyeDr in ${jobCity(job)}. ${job.employment_type}. Apply direct to the hiring manager.`,
    );
    return () => {
      document.title = prev;
      meta?.setAttribute("content", prevDesc);
    };
  }, [job]);

  return (
    <div className="relative min-h-screen bg-background">
      <div className="aurora-bg aurora-grain pointer-events-none fixed inset-0" aria-hidden />

      <header className="relative z-10 mx-auto flex max-w-4xl items-center justify-between px-5 py-6">
        <Link to="/careers" className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All openings
        </Link>
        <Logo markSize={28} />
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-5 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-32 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading this role…
          </div>
        ) : !job ? (
          <div className="glass-panel mt-10 rounded-2xl p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25">
              <Briefcase className="h-5 w-5" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">This role is no longer open</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              It may have been filled or closed. Browse what's open now, or join the talent network so a manager
              reaches you first next time.
            </p>
            <Button className="mt-6" asChild><Link to="/careers">See open roles</Link></Button>
          </div>
        ) : (
          <article className="space-y-8 pt-6">
            <header>
              <p className="micro-label text-primary">{job.department || "MyEyeDr"}{job.req_code ? ` · ${job.req_code}` : ""}</p>
              <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl">{job.title}</h1>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { icon: MapPin, label: jobCity(job) },
                  { icon: Clock, label: job.employment_type },
                  ...(job.pay_range ? [{ icon: Wallet, label: job.pay_range }] : []),
                  ...(job.openings > 1 ? [{ icon: Users, label: `${job.openings} seats open` }] : []),
                  ...(job.location?.site_name ? [{ icon: Building2, label: job.location.site_name }] : []),
                ].map((chip) => (
                  <span key={chip.label} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground">
                    <chip.icon className="h-3.5 w-3.5 text-primary" /> {chip.label}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button size="lg" onClick={() => setApplyOpen(true)}>Apply for this role</Button>
                <span className="text-xs text-muted-foreground">{postedAgo(job.posted_at)} · reviewed by the hiring manager</span>
              </div>
            </header>

            {job.description && (
              <section className="glass-panel rounded-2xl p-6 sm:p-8">
                <h2 className="micro-label mb-4 text-muted-foreground">About the role</h2>
                <RichText text={job.description} />
              </section>
            )}

            {job.requirements && (
              <section className="glass-panel rounded-2xl p-6 sm:p-8">
                <h2 className="micro-label mb-4 text-muted-foreground">What we're looking for</h2>
                <RichText text={job.requirements} />
              </section>
            )}

            <section className="glass-panel rounded-2xl p-6 sm:p-8">
              <h2 className="micro-label mb-4 text-muted-foreground">How hiring works here</h2>
              <ol className="space-y-4">
                {[
                  ["Apply", "Two minutes. Upload a résumé and we read it for you — no re-typing your history."],
                  ["Phone screen", "A short call about availability, experience and what you want next."],
                  ["Office interview", "Meet the manager and the team you'd actually work with."],
                  ["Decision", "A clear yes or no, quickly — and a start date you can plan around."],
                ].map(([step, body], i) => (
                  <li key={step} className="flex gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 font-mono text-xs font-bold text-primary ring-1 ring-primary/25">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">{step}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <div className="glass-panel flex flex-col items-start gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-xl font-bold text-foreground">Ready when you are</p>
                <p className="mt-1 text-sm text-muted-foreground">Applications go straight to {job.location?.site_name || "the hiring office"}.</p>
              </div>
              <Button size="lg" onClick={() => setApplyOpen(true)}>Apply now</Button>
            </div>

            {related.length > 0 && (
              <section>
                <h2 className="micro-label mb-3 text-muted-foreground">Other openings you may like</h2>
                <ul className="grid gap-3 sm:grid-cols-3">
                  {related.map((r) => (
                    <li key={r.id}>
                      <Link to={`/careers/${r.id}`} className="glass-panel hover-lift block rounded-xl p-4">
                        <p className="font-semibold leading-snug text-foreground">{r.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{jobCity(r)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>
        )}
      </main>

      <footer className="relative z-10 border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
          <p className="text-[11px] text-muted-foreground">MyEyeDr is an equal opportunity employer.</p>
          <ZenSignature />
        </div>
      </footer>

      <ApplyDialog open={applyOpen} onOpenChange={setApplyOpen} job={job} />
    </div>
  );
}
