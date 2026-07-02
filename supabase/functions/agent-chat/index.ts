import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { agent, messages, candidate } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const questions: string[] = Array.isArray(agent?.questions)
      ? agent.questions.map((q: any) => (typeof q === "string" ? q : q?.text)).filter(Boolean)
      : [];
    const goals: string[] = Array.isArray(agent?.extraction_goals) ? agent.extraction_goals : [];

    const system = `You are "${agent?.name || "Screening Agent"}", an AI voice screener for MyEyeDr recruiting.
Role focus: ${agent?.role_focus || "General Screening"}.
Persona / speaking style: ${agent?.persona || "warm, professional, concise"}.
${candidate ? `You are speaking with candidate ${candidate.full_name} who applied for ${candidate.applied_role || "a role"}.` : "You are running a test conversation with a simulated candidate."}

Your goal is to run a natural, spoken phone screening. Speak like a real person on a call: short, conversational turns, one question at a time. Never dump all questions at once. Acknowledge answers briefly before moving on.

Cover these screening questions naturally over the conversation:
${questions.map((q, i) => `${i + 1}. ${q}`).join("\n") || "- Confirm availability, interest, relevant experience, and pay expectations."}

Try to surface this information: ${goals.join(", ") || "availability, experience, certifications, salary expectations, start date, location preference"}.

${agent?.system_prompt ? `Additional instructions: ${agent.system_prompt}` : ""}

Open the very first turn with (paraphrased naturally): "${agent?.opening_line || "Hi, this is the MyEyeDr recruiting team."}"
When the screening is complete, wrap up with (paraphrased): "${agent?.closing_line || "Thanks for your time."}"
Keep every reply under 60 words.`;

    const chatMessages = [
      { role: "system", content: system },
      ...(Array.isArray(messages) ? messages : []),
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: chatMessages,
        temperature: typeof agent?.temperature === "number" ? agent.temperature : 0.6,
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
    const reply = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
