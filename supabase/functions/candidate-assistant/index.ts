import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STAGE_KEYS = ["applied", "screening", "phone_screen", "interview", "assessment", "reference", "offer", "hired"];

// Tools the assistant may PROPOSE. The edge function never executes them — it
// returns them to the client, which runs them only after the admin confirms.
const tools = [
  {
    type: "function",
    function: {
      name: "move_stage",
      description: "Propose moving a candidate to a different pipeline stage.",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "string" },
          candidate_name: { type: "string" },
          stage: { type: "string", enum: STAGE_KEYS },
        },
        required: ["candidate_id", "candidate_name", "stage"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "hire_candidate",
      description: "Propose hiring a candidate. This may auto-close the requisition and pool remaining candidates once seats are filled.",
      parameters: {
        type: "object",
        properties: { candidate_id: { type: "string" }, candidate_name: { type: "string" } },
        required: ["candidate_id", "candidate_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pool_candidate",
      description: "Propose moving a candidate to the talent pool to keep them warm.",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "string" },
          candidate_name: { type: "string" },
          reason: { type: "string" },
          roles: { type: "string", description: "Comma-separated best-fit roles" },
        },
        required: ["candidate_id", "candidate_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reject_candidate",
      description: "Propose archiving/rejecting a candidate (kept on file).",
      parameters: {
        type: "object",
        properties: { candidate_id: { type: "string" }, candidate_name: { type: "string" }, reason: { type: "string" } },
        required: ["candidate_id", "candidate_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_note",
      description: "Propose adding a note to a candidate's profile.",
      parameters: {
        type: "object",
        properties: { candidate_id: { type: "string" }, candidate_name: { type: "string" }, note: { type: "string" } },
        required: ["candidate_id", "candidate_name", "note"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "share_to_location",
      description: "Propose sharing view access of a candidate with another office/location.",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "string" },
          candidate_name: { type: "string" },
          location_id: { type: "string" },
          location_name: { type: "string" },
          note: { type: "string" },
        },
        required: ["candidate_id", "candidate_name", "location_id", "location_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_candidate_info",
      description: "Propose updating basic candidate fields. Only include fields that should change.",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "string" },
          candidate_name: { type: "string" },
          applied_role: { type: "string" },
          headline: { type: "string" },
          current_employer: { type: "string" },
          years_experience: { type: "number" },
          rating: { type: "number", description: "1-5 star rating" },
        },
        required: ["candidate_id", "candidate_name"],
      },
    },
  },
];

const ACTION_LABEL: Record<string, (a: any) => string> = {
  move_stage: (a) => `Move ${a.candidate_name} to “${a.stage}”`,
  hire_candidate: (a) => `Hire ${a.candidate_name}`,
  pool_candidate: (a) => `Add ${a.candidate_name} to the talent pool`,
  reject_candidate: (a) => `Archive ${a.candidate_name}`,
  add_note: (a) => `Add a note to ${a.candidate_name}`,
  share_to_location: (a) => `Share ${a.candidate_name} with ${a.location_name}`,
  update_candidate_info: (a) => `Update ${a.candidate_name}'s info`,
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
      userClient.from("positions").select("id, title, location_id, region, status, req_code, openings"),
      userClient.from("locations").select("id, site_name, region"),
      userClient.from("golden_profiles").select("position_id, name, is_active, must_have_skills, ideal_years_experience"),
    ]);

    const locName = (id: string | null) => (locations ?? []).find((l: any) => l.id === id)?.site_name ?? "Unassigned";
    const posTitle = (id: string | null) => (positions ?? []).find((p: any) => p.id === id)?.title ?? "";

    const compact = (candidates ?? []).map((c: any) => ({
      id: c.id,
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

    const officeList = (locations ?? []).map((l: any) => ({ location_id: l.id, name: l.site_name, region: l.region }));

    const activeBenchmarks = (goldens ?? [])
      .filter((g: any) => g.is_active)
      .map((g: any) => ({ requisition: posTitle(g.position_id), ideal: g.name, must_have: g.must_have_skills }));

    const system = `You are the MyEyeDr Talent Assistant — an expert recruiting analyst and operator helping an admin reason about candidates and act on them.
You can ONLY use the candidate data provided below. It already reflects exactly what this user is permitted to see; never invent candidates, scores, or facts not present. If asked about something outside the data, say you don't have that information.

You help with two things:
1) ANSWERING & COMPARING — answer questions, compare candidates side by side, recommend the best fit, spot risks, and suggest next steps. Use markdown: short paragraphs, bullet points, and small tables for comparisons. Justify recommendations with the data.
2) TAKING ACTION — when the user asks you to move, hire, pool, reject, note, share, or update a candidate, call the matching tool with the exact candidate id from the dataset. You are ONLY proposing the action; the admin will confirm before anything happens. You may propose multiple actions at once. Always also write a short sentence explaining what you're proposing and why.

Valid pipeline stages: ${STAGE_KEYS.join(", ")}.
Offices for sharing (use the exact location_id): ${JSON.stringify(officeList)}

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
        tools,
        tool_choice: "auto",
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
    const message = data.choices?.[0]?.message ?? {};
    let reply: string = message.content ?? "";

    const proposed_actions: any[] = [];
    const toolCalls = message.tool_calls ?? [];
    for (const tc of toolCalls) {
      try {
        const name = tc.function?.name;
        const args = JSON.parse(tc.function?.arguments || "{}");
        if (!name || !ACTION_LABEL[name]) continue;
        proposed_actions.push({
          id: tc.id || crypto.randomUUID(),
          type: name,
          label: ACTION_LABEL[name](args),
          args,
        });
      } catch (_e) { /* skip malformed tool call */ }
    }

    if (!reply && proposed_actions.length > 0) {
      reply = `I've prepared ${proposed_actions.length} action${proposed_actions.length === 1 ? "" : "s"} for your confirmation:`;
    }
    if (!reply) reply = "I couldn't produce a response.";

    return new Response(JSON.stringify({ reply, proposed_actions, candidateCount: compact.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
