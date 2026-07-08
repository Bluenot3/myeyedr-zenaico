import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // User-scoped client → RLS limits candidates to what this user may see.
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load only what the caller can access (RLS-scoped).
    const [{ data: candidates }, { data: positions }, { data: locations }, { data: goldens }] = await Promise.all([
      userClient.from("candidates").select(
        "id, full_name, applied_role, best_fit_roles, location_id, position_id, stage, status, score, rating, years_experience, current_employer, tags, headline, resume_summary, screening_status, interview_status, in_talent_pool, source, contact_count",
      ).order("score", { ascending: false }).limit(250),
      userClient.from("positions").select("id, title, location_id, region, status, req_code"),
      userClient.from("locations").select("id, site_name, region"),
      userClient.from("golden_profiles").select("position_id, name, is_active, must_have_skills, ideal_years_experience"),
    ]);

    const locName = (id: string | null) => (locations ?? []).find((l: any) => l.id === id)?.site_name ?? "Unassigned";
    const posTitle = (id: string | null) => (positions ?? []).find((p: any) => p.id === id)?.title ?? "";

    const compact = (candidates ?? []).map((c: any) => ({
      name: c.full_name,
      role: c.applied_role || posTitle(c.position_id) || "—",
      requisition: posTitle(c.position_id),
      office: locName(c.location_id),
      stage: c.stage,
      status: c.status,
      general_score: c.score,
      interview_rating: c.rating,
      years_experience: c.years_experience,
      current_employer: c.current_employer,
      tags: c.tags,
      headline: c.headline,
      summary: c.resume_summary,
      screening: c.screening_status,
      interview: c.interview_status,
      talent_pool: c.in_talent_pool,
      source: c.source,
      touchpoints: c.contact_count,
    }));

    const activeBenchmarks = (goldens ?? [])
      .filter((g: any) => g.is_active)
      .map((g: any) => ({ requisition: posTitle(g.position_id), ideal: g.name, must_have: g.must_have_skills }));

    const system = `You are the MyEyeDr Talent Assistant — an expert recruiting analyst helping a hiring manager reason about candidates.
You can ONLY use the candidate data provided below. It already reflects exactly what this user is permitted to see (their locations and shared candidates); never invent candidates, scores, or facts not present. If asked about something outside the data, say you don't have that information.

What you help with: answering questions about candidates, comparing candidates side by side, recommending the best fit for a role, spotting risks and gaps, and suggesting next steps. Be concise and decisive. Use markdown — short paragraphs, bullet points, and small tables for comparisons. When you recommend someone, briefly justify it with the data (general score, experience, availability/stage, requisition fit).

Active best-fit benchmarks by requisition:
${activeBenchmarks.length ? JSON.stringify(activeBenchmarks) : "None set yet."}

Candidate dataset (${compact.length} visible to this user):
${JSON.stringify(compact)}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, ...messages],
        temperature: 0.4,
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached, please retry shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits to continue." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `AI error ${res.status}`);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ reply, candidateCount: compact.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
