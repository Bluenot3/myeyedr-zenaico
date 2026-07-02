import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript, candidate, goals } = await req.json();
    if (!transcript || typeof transcript !== "string") {
      return new Response(JSON.stringify({ error: "transcript is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const extraction = {
      type: "object",
      properties: {
        summary: { type: "string", description: "3-4 sentence recap of the screening." },
        sentiment: { type: "string", description: "one of: positive, neutral, negative, mixed" },
        fit_score: { type: "number", description: "0-100 overall fit for the role" },
        recommendation: { type: "string", description: "one of: advance, hold, reject" },
        highlights: { type: "array", items: { type: "string" } },
        concerns: { type: "array", items: { type: "string" } },
        extracted: {
          type: "object",
          properties: {
            availability: { type: "string" },
            years_experience: { type: "string" },
            certifications: { type: "string" },
            salary_expectation: { type: "string" },
            start_date: { type: "string" },
            location_preference: { type: "string" },
            key_skills: { type: "array", items: { type: "string" } },
            notable_quotes: { type: "array", items: { type: "string" } },
          },
        },
      },
      required: ["summary", "sentiment", "fit_score", "recommendation", "extracted"],
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert MyEyeDr recruiting analyst. Analyze an interview/phone-screen transcript and extract structured intelligence about the candidate. Be objective and cite what the candidate actually said. ${
              candidate ? `Candidate: ${candidate.full_name}, applied for ${candidate.applied_role || "a role"}.` : ""
            } ${goals?.length ? `Prioritize extracting: ${goals.join(", ")}.` : ""}`,
          },
          { role: "user", content: `Transcript:\n\n${transcript.slice(0, 24000)}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "record_analysis",
              description: "Record the structured candidate analysis.",
              parameters: extraction,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "record_analysis" } },
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached, please retry shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `AI error ${res.status}`);
    }

    const data = await res.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    let result: any = {};
    if (call?.function?.arguments) {
      try { result = JSON.parse(call.function.arguments); } catch { result = {}; }
    }

    return new Response(JSON.stringify({ analysis: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
