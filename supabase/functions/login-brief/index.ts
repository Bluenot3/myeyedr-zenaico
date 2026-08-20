import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const CACHE_MS = 6 * 60 * 60 * 1000; // regenerate at most every 6h per user
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // RLS-scoped client → the brief can only ever describe what this user may see.
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const force = body?.force === true;

    const admin = createClient(url, service, { auth: { persistSession: false } });

    const { data: cached } = await admin
      .from("login_briefs")
      .select("brief, headline, stats, generated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!force && cached?.generated_at && Date.now() - new Date(cached.generated_at).getTime() < CACHE_MS) {
      return json({ ...cached, cached: true });
    }

    const [{ data: profile }, { data: roleRows }, { data: candidates }, { data: positions }, { data: locations }, { data: events }] =
      await Promise.all([
        userClient.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
        userClient.from("user_roles").select("role").eq("user_id", user.id),
        userClient
          .from("candidates")
          .select("id, full_name, applied_role, stage, status, score, rating, source, in_talent_pool, location_id, position_id, headline, years_experience, created_at, last_contacted_at, contact_count, screening_status, interview_status")
          .order("created_at", { ascending: false })
          .limit(300),
        userClient.from("positions").select("id, title, req_code, status, openings, priority, location_id"),
        userClient.from("locations").select("id, site_name, region"),
        userClient
          .from("interview_events")
          .select("id, candidate_id, title, event_type, starts_at, status, location_id")
          .gte("starts_at", hoursAgo(2))
          .order("starts_at", { ascending: true })
          .limit(40),
      ]);

    const cands = candidates ?? [];
    const poss = positions ?? [];
    const locs = locations ?? [];
    const roles = (roleRows ?? []).map((r: any) => r.role);
    const roleLabel = roles.includes("admin") ? "Administrator" : roles.includes("regional") ? "Regional manager" : "Office manager";
    const locName = (id: string | null) => locs.find((l: any) => l.id === id)?.site_name ?? "Unassigned";
    const posTitle = (id: string | null) => poss.find((p: any) => p.id === id)?.title ?? "";

    const isNew = (c: any) => c.created_at && new Date(c.created_at).getTime() > Date.now() - 7 * 86400_000;
    const active = cands.filter((c: any) => c.status === "active");
    const newCands = cands.filter(isNew);
    const stale = active.filter(
      (c: any) => c.stage !== "hired" && (!c.last_contacted_at || new Date(c.last_contacted_at).getTime() < Date.now() - 48 * 3600_000),
    );
    const top = [...active]
      .sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 6)
      .map((c: any) => ({
        name: c.full_name,
        role: c.applied_role || posTitle(c.position_id) || "—",
        office: locName(c.location_id),
        stage: c.stage,
        score: c.score,
        interview_rating: c.rating,
        experience_years: c.years_experience,
        headline: (c.headline ?? "").slice(0, 160),
        new_this_week: isNew(c),
      }));

    const stats = {
      visible_candidates: cands.length,
      active: active.length,
      new_last_7_days: newCands.length,
      awaiting_first_contact: active.filter((c: any) => (c.contact_count ?? 0) === 0).length,
      stale_over_48h: stale.length,
      interviews_upcoming: (events ?? []).length,
      open_seats: poss.filter((p: any) => p.status === "open").reduce((n: number, p: any) => n + (p.openings ?? 0), 0),
      open_requisitions: poss.filter((p: any) => p.status === "open").length,
      talent_pool: cands.filter((c: any) => c.in_talent_pool).length,
      offers_out: cands.filter((c: any) => c.stage === "offer").length,
      hired_last_30_days: cands.filter(
        (c: any) => c.stage === "hired" && c.created_at && new Date(c.created_at).getTime() > Date.now() - 30 * 86400_000,
      ).length,
    };

    const payload = {
      viewer: { name: profile?.full_name || profile?.email?.split("@")[0] || "there", role: roleLabel },
      stats,
      top_candidates: top,
      new_this_week: newCands.slice(0, 12).map((c: any) => ({
        name: c.full_name,
        role: c.applied_role || posTitle(c.position_id) || "—",
        office: locName(c.location_id),
        source: c.source,
        score: c.score,
        stage: c.stage,
      })),
      upcoming: (events ?? []).slice(0, 8).map((e: any) => ({
        title: e.title,
        type: e.event_type,
        when: e.starts_at,
        office: locName(e.location_id),
        candidate: cands.find((c: any) => c.id === e.candidate_id)?.full_name ?? "",
      })),
      open_requisitions: poss
        .filter((p: any) => p.status === "open")
        .slice(0, 15)
        .map((p: any) => ({
          req: p.req_code,
          title: p.title,
          office: locName(p.location_id),
          seats: p.openings,
          priority: p.priority,
          applicants: cands.filter((c: any) => c.position_id === p.id && c.status === "active").length,
        })),
      needs_attention: stale.slice(0, 8).map((c: any) => ({
        name: c.full_name,
        stage: c.stage,
        office: locName(c.location_id),
        last_contacted: c.last_contacted_at,
      })),
    };

    const system = `You are the MyEyeDr Talent Assistant writing a short, personal login briefing for one user.
Write ONLY from the JSON provided — it already reflects exactly what this user is permitted to see. Never invent candidates, offices, numbers, or requisitions.
Audience: ${payload.viewer.role} named ${payload.viewer.name}.

Format (markdown, tight and scannable, no preamble, no closing pleasantries):
- Open with one bold sentence naming the single most important thing today.
- "### New candidates" — who arrived recently, best first, with role and office. If none, say so in one line.
- "### Best right now" — 2-3 standouts with the specific reason (score, experience, interview rating). Name them.
- "### Needs you today" — concrete actions (uncontacted, stale over 48h, interviews upcoming, offers out). Use a short numbered list.
- Close with one line of trend or coverage insight tied to open seats.

Rules: under 220 words. Use **bold** for names and numbers. No tables. No charts. No headings other than the three above. If the dataset is empty, say the pipeline is quiet and suggest the one useful next step.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(payload) },
        ],
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error(`login-brief AI call failed [${res.status}]: ${detail}`);
      const message =
        res.status === 429
          ? "Rate limit reached — your brief will refresh shortly."
          : res.status === 402
          ? "AI credits exhausted — add credits to refresh briefings."
          : res.status === 403
          ? "Lovable AI is blocked for this workspace — an admin needs to re-enable it."
          : "Could not generate the briefing right now.";
      if (cached?.brief) return json({ ...cached, cached: true, stale: true, warning: message });
      return json({ error: message, status: res.status, details: detail }, res.status);
    }

    const data = await res.json();
    const brief: string = data?.choices?.[0]?.message?.content?.trim() || "";
    if (!brief) throw new Error("Empty briefing returned");

    const headline =
      brief
        .split("\n")
        .find((l: string) => l.trim() && !l.trim().startsWith("#"))
        ?.replace(/[*_`]/g, "")
        .trim()
        .slice(0, 180) || "Your pipeline briefing";

    const record = {
      user_id: user.id,
      brief,
      headline,
      stats,
      model: "google/gemini-2.5-flash",
      generated_at: new Date().toISOString(),
    };
    await admin.from("login_briefs").upsert(record, { onConflict: "user_id" });

    return json({ brief, headline, stats, generated_at: record.generated_at, cached: false });
  } catch (e) {
    console.error("login-brief failed:", (e as Error).message);
    return json({ error: (e as Error).message || "Could not generate the briefing" }, 500);
  }
});
