import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Robustly pull a JSON object out of an LLM response that may be wrapped in
 * markdown fences, prose, or contain trailing commas / control characters. */
function extractJson(raw: string): Record<string, unknown> | null {
  if (!raw || typeof raw !== "string") return null;
  let cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  cleaned = cleaned.substring(start, end + 1);

  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      const repaired = cleaned
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\u0000-\u001F\u007F]/g, " ");
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fileBase64, fileName, mimeType, resumeText } = await req.json();
    const hasText = typeof resumeText === "string" && resumeText.trim().length > 0;
    if (!fileBase64 && !hasText) {
      return new Response(JSON.stringify({ error: "No file data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const dataUrl = fileBase64 ? `data:${mimeType || "application/pdf"};base64,${fileBase64}` : "";

    // Prefer pre-extracted text (e.g. DOCX parsed in the browser); otherwise send the file itself.
    const userContent = hasText
      ? [{ type: "text", text: `Parse this résumé text and extract the candidate profile. File name: ${fileName || "resume"}\n\n---RESUME TEXT---\n${resumeText.slice(0, 60000)}` }]
      : [
          { type: "text", text: `Parse this résumé and extract the candidate profile. File name: ${fileName || "resume"}` },
          { type: "image_url", image_url: { url: dataUrl } },
        ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are an expert recruiting assistant for MyEyeDr, an optometry / eye care company. You read candidate résumés and extract clean, structured data for a hiring pipeline. Roles include Patient Service Coordinator (PSC), Optician, Optometric Technician, Front Desk, and similar eye-care / retail-healthcare positions.

Extract the candidate's information accurately. Never invent data — if a field is not present, return an empty string (or 0 for years_experience, or an empty array for lists). Write concise, professional prose for headline, summary, and evidence.

You MUST call the extract_candidate function with the data. If for any reason you cannot call the function, respond with ONLY a raw JSON object with the same fields — no markdown, no prose.`,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_candidate",
              description: "Extract a structured candidate profile from a résumé",
              parameters: {
                type: "object",
                properties: {
                  full_name: { type: "string", description: "Candidate full name" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  address: { type: "string", description: "Full address or City, State from résumé" },
                  applied_role: { type: "string", description: "Most likely role they are applying for (e.g. Patient Service Coordinator, Optician)" },
                  headline: { type: "string", description: "One short line, e.g. 'Front-desk PSC, 4 yrs healthcare admin'" },
                  years_experience: { type: "number", description: "Total relevant years of experience, integer" },
                  location: { type: "string", description: "City, State from résumé" },
                  current_employer: { type: "string", description: "Current or most recent employer name" },
                  summary: { type: "string", description: "2-3 sentence professional summary" },
                  relevant_evidence: { type: "string", description: "Concrete PSC/eye-care/healthcare/customer-service/sales evidence found on the résumé" },
                  skills: { type: "array", items: { type: "string" }, description: "Key skills / tags" },
                  job_titles: { type: "array", items: { type: "string" }, description: "All job titles held" },
                  work_history: {
                    type: "array",
                    description: "Employment history, most recent first",
                    items: {
                      type: "object",
                      properties: {
                        employer: { type: "string" },
                        title: { type: "string" },
                        dates: { type: "string", description: "e.g. 'Jan 2021 - Present'" },
                      },
                    },
                  },
                  education: {
                    type: "array",
                    description: "Education entries",
                    items: {
                      type: "object",
                      properties: {
                        school: { type: "string" },
                        credential: { type: "string", description: "Degree / diploma / certificate" },
                        dates: { type: "string" },
                      },
                    },
                  },
                  certifications: { type: "array", items: { type: "string" }, description: "Certifications or licenses (e.g. ABO, NCLE, CPR)" },
                  confidence: { type: "number", description: "Your confidence 0-1 that the extracted fields are accurate" },
                },
                required: ["full_name"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_candidate" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      return new Response(JSON.stringify({ error: "Failed to parse résumé" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message ?? {};
    let extracted: Record<string, unknown> | null = null;

    // Path 1: structured tool call (preferred)
    const toolCall = message.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      extracted = extractJson(toolCall.function.arguments);
    }

    // Path 2: model returned JSON in the message content instead
    if (!extracted?.full_name && typeof message.content === "string") {
      const fromContent = extractJson(message.content);
      if (fromContent?.full_name) extracted = fromContent;
    }

    // Path 3: content is an array of parts (multimodal responses)
    if (!extracted?.full_name && Array.isArray(message.content)) {
      const joined = message.content
        .map((p: { text?: string }) => p?.text || "")
        .join("\n");
      const fromParts = extractJson(joined);
      if (fromParts?.full_name) extracted = fromParts;
    }

    if (!extracted || !extracted.full_name) {
      console.error("Could not extract candidate. Raw message:", JSON.stringify(message).slice(0, 2000));
      return new Response(
        JSON.stringify({ error: "The résumé was read but no clear candidate details were found. Please enter them manually or try a clearer file." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-resume error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
