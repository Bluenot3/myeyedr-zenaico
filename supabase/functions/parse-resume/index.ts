import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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

const candidateSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    full_name: { type: "string", description: "Candidate full name exactly as written" },
    email: { type: "string" },
    phone: { type: "string" },
    address: { type: "string", description: "Full address or City, State from the résumé" },
    applied_role: { type: "string", description: "Best matching role, based only on résumé evidence" },
    headline: { type: "string", description: "One concise professional headline" },
    years_experience: { type: "number", description: "Total relevant years of experience" },
    location: { type: "string", description: "City, State from the résumé" },
    current_employer: { type: "string", description: "Current or most recent employer" },
    summary: { type: "string", description: "Two or three factual sentences" },
    relevant_evidence: { type: "string", description: "Concrete optical, healthcare, service, or sales evidence" },
    skills: { type: "array", items: { type: "string" } },
    job_titles: { type: "array", items: { type: "string" } },
    work_history: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          employer: { type: "string" },
          title: { type: "string" },
          dates: { type: "string" },
        },
        required: ["employer", "title", "dates"],
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          school: { type: "string" },
          credential: { type: "string" },
          dates: { type: "string" },
        },
        required: ["school", "credential", "dates"],
      },
    },
    certifications: { type: "array", items: { type: "string" } },
    raw_text: { type: "string", description: "Complete readable résumé text" },
    confidence: { type: "number", description: "Extraction confidence from 0 to 1" },
  },
  required: [
    "full_name", "email", "phone", "address", "applied_role", "headline",
    "years_experience", "location", "current_employer", "summary",
    "relevant_evidence", "skills", "job_titles", "work_history", "education",
    "certifications", "raw_text", "confidence",
  ],
};

function isImage(mimeType: string, fileName: string) {
  return mimeType.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(fileName);
}

function parseSsePayload(raw: string): { text: string; reasoning: string; error: string } {
  let text = "";
  let reasoning = "";
  let error = "";
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const event = JSON.parse(payload);
      if (event.type === "response.output_text.delta" && typeof event.delta === "string") text += event.delta;
      if (event.type === "response.reasoning_summary_text.delta" && typeof event.delta === "string") reasoning += event.delta;
      if (event.type === "error") error = event.error?.message || event.message || "AI parsing failed.";
      if (event.type === "response.failed") error = event.response?.error?.message || "AI parsing failed.";
      if (event.type === "response.completed" && !text && typeof event.response?.output_text === "string") {
        text = event.response.output_text;
      }
    } catch {
      // Ignore heartbeat and malformed event lines; the terminal event is authoritative.
    }
  }
  return { text, reasoning, error };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fileBase64, fileUrl, fileName, mimeType, resumeText } = await req.json();
    const hasText = typeof resumeText === "string" && resumeText.trim().length > 0;
    const hasFileUrl = typeof fileUrl === "string" && /^https:\/\//i.test(fileUrl);
    if (!fileBase64 && !hasFileUrl && !hasText) {
      return new Response(JSON.stringify({ error: "No file data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const safeFileName = typeof fileName === "string" && fileName.trim() ? fileName.trim().slice(0, 200) : "resume.pdf";
    const safeMimeType = typeof mimeType === "string" && mimeType ? mimeType : "application/pdf";
    const dataUrl = hasFileUrl ? fileUrl : fileBase64 ? `data:${safeMimeType};base64,${fileBase64}` : "";
    const prompt = `Extract this résumé into the required JSON candidate profile. File name: ${safeFileName}. Use only facts present in the résumé. Never infer contact details, employers, dates, credentials, or skills. Use empty strings or arrays when information is absent. Preserve the complete readable résumé in raw_text.`;
    const content = hasText
      ? [{ type: "input_text", text: `${prompt}\n\n--- RESUME TEXT ---\n${resumeText.slice(0, 60000)}` }]
      : isImage(safeMimeType, safeFileName)
        ? [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: dataUrl, detail: "high" },
          ]
        : [
            { type: "input_text", text: prompt },
            { type: "input_file", file_url: dataUrl, filename: safeFileName },
          ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "fetch",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        reasoning: { effort: "medium", summary: "auto" },
        input: [
          {
            role: "developer",
            content: [{ type: "input_text", text: "You are a precision résumé extraction system for an optical healthcare recruiting team. Return only schema-valid JSON. Never invent missing facts." }],
          },
          { role: "user", content },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "candidate_resume",
            strict: true,
            schema: candidateSchema,
          },
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI error:", response.status, text);
      let message = `Résumé parsing failed (${response.status}).`;
      try {
        const upstream = JSON.parse(text);
        message = upstream?.error?.message || upstream?.message || message;
      } catch { /* preserve the status-based message */ }
      return new Response(JSON.stringify({ error: message }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const streamed = parseSsePayload(await response.text());
    if (streamed.error) {
      return new Response(JSON.stringify({ error: streamed.error }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const extracted = extractJson(streamed.text);

    if (!extracted || !extracted.full_name) {
      console.error("Could not extract candidate. Output:", streamed.text.slice(0, 2000));
      return new Response(
        JSON.stringify({ error: "The résumé was read but no clear candidate details were found. Please enter them manually or try a clearer file." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Carry the raw text through so the app can store it on the candidate record.
    if (hasText && !extracted.raw_text) extracted.raw_text = resumeText.slice(0, 60000);

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
