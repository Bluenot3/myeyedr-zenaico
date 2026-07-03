import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DIM_KEYS = ["availability", "service", "communication", "reliability", "experience", "interview", "skills"];

const SYSTEM = `You are a senior talent strategist for MyEyeDr, an optometry / eye-care company. You define the profile of the PERFECT hire for a given role so a hiring team can benchmark real applicants against it. Roles include Patient Service Coordinator (PSC), Optician, Optometric Technician, Front Desk, and similar eye-care / retail-healthcare positions.

You produce a demanding but realistic "golden standard" — the candidate everyone wishes they could clone. Targets should reflect excellence (mostly 80-95), not perfection across the board. Be specific and concrete. Never invent an actual person's identity.`;

const TOOL = {
  type: "function",
  function: {
    name: "define_golden_profile",
    description: "Define the ideal candidate profile for a role.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Short label for this ideal profile, e.g. 'The Ideal PSC'" },
        summary: { type: "string", description: "2-4 sentence portrait of the perfect candidate for this role" },
        ideal_years_experience: { type: "number", description: "Ideal total relevant years of experience" },
        must_have_skills: { type: "array", items: { type: "string" }, description: "5-8 non-negotiable skills / traits" },
        nice_to_have_skills: { type: "array", items: { type: "string" }, description: "4-6 differentiators that make a candidate exceptional" },
        red_flags: { type: "array", items: { type: "string" }, description: "4-6 warning signs that disqualify or require deep probing" },
        interview_focus: { type: "array", items: { type: "string" }, description: "4-6 specific things interviewers should verify or ask about" },
        dimensions: {
          type: "array",
          description: "Target score (0-100) and weight for each fixed dimension. Include ALL seven keys.",
          items: {
            type: "object",
            properties: {
              key: { type: "string", enum: DIM_KEYS },
              label: { type: "string" },
              target: { type: "number", description: "0-100 ideal level" },
              weight: { type: "number", description: "relative importance 1-10" },
            },
            required: ["key", "target", "weight"],
            additionalProperties: false,
          },
        },
        resume_text: { type: "string", description: "A realistic MOCK résumé (plain text, ~250-400 words) for a fictional perfect candidate for this role, with fabricated but believable name, experience, and skills." },
      },
      required: ["name", "summary", "ideal_years_experience", "must_have_skills", "nice_to_have_skills", "red_flags", "interview_focus", "dimensions"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const mode: string = body.mode || "from_position"; // from_position | from_resume | from_candidate
    const role: string = body.role || "Patient Service Coordinator";
    const context: string = body.context || "";
    const fileBase64: string | undefined = body.fileBase64;
    const mimeType: string | undefined = body.mimeType;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let userContent: any;
    if (mode === "from_resume" && fileBase64) {
      const dataUrl = `data:${mimeType || "application/pdf"};base64,${fileBase64}`;
      userContent = [
        { type: "text", text: `Read this résumé of a candidate the hiring team considers close to ideal for the role of "${role}". Turn it into the GOLDEN STANDARD profile for that role — elevate and generalize their strengths into an ideal benchmark. ${context}` },
        { type: "image_url", image_url: { url: dataUrl } },
      ];
    } else if (mode === "from_candidate") {
      userContent = `Build the GOLDEN STANDARD profile for the role "${role}" using this real strong candidate as inspiration. Generalize their strengths into an ideal benchmark; do not copy their identity.\n\nCandidate details:\n${context}`;
    } else {
      userContent = `Define the GOLDEN STANDARD (perfect candidate) profile for the role "${role}" at an eye-care clinic.${context ? `\n\nRole context / requirements:\n${context}` : ""}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userContent },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "define_golden_profile" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429)
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402)
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const text = await response.text();
      throw new Error(`AI gateway error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("No profile returned by AI");
    const profile = JSON.parse(call.function.arguments);

    // Ensure all 7 dimensions exist with sane defaults
    const byKey: Record<string, any> = {};
    for (const d of profile.dimensions || []) byKey[d.key] = d;
    const LABELS: Record<string, string> = {
      availability: "Availability", service: "Customer Service", communication: "Communication",
      reliability: "Reliability", experience: "Experience", interview: "Interview Fit", skills: "Skill Match",
    };
    profile.dimensions = DIM_KEYS.map((k) => ({
      key: k,
      label: byKey[k]?.label || LABELS[k],
      target: Math.max(0, Math.min(100, Math.round(byKey[k]?.target ?? 85))),
      weight: Math.max(1, Math.min(10, Math.round(byKey[k]?.weight ?? 5))),
    }));

    return new Response(JSON.stringify({ profile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
