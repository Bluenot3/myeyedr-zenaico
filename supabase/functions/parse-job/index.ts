import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Pull a JSON object out of an LLM response that may be fenced or prose-wrapped. */
function extractJson(raw: string): Record<string, unknown> | null {
  if (!raw || typeof raw !== "string") return null;
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
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
    const { fileBase64, fileName, mimeType, jobText } = await req.json();
    const hasText = typeof jobText === "string" && jobText.trim().length > 0;
    if (!fileBase64 && !hasText) {
      return new Response(JSON.stringify({ error: "No job description provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const dataUrl = fileBase64 ? `data:${mimeType || "application/pdf"};base64,${fileBase64}` : "";
    const userContent = hasText
      ? [{ type: "text", text: `Extract a structured job description. Source: ${fileName || "pasted text"}\n\n---JOB TEXT---\n${jobText.slice(0, 60000)}` }]
      : [
          { type: "text", text: `Extract a structured job description from this file. File name: ${fileName || "job.pdf"}` },
          { type: "image_url", image_url: { url: dataUrl } },
        ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You extract clean, structured job descriptions for MyEyeDr, an optometry / eye care company. Roles include Patient Service Coordinator (PSC), Optician, Optometric Technician, Front Desk, General Manager, Assistant General Manager, and similar eye-care / retail-healthcare positions.

Read the provided job posting and produce a clean, reusable job template. Rewrite the description into clear, well-structured prose (responsibilities, schedule, what makes a great fit). Keep requirements as a concise list of must-haves. Never invent a pay range if none is present — return an empty string. You MUST call the extract_job function.`,
          },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_job",
              description: "Extract a structured, reusable job description",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Job title, e.g. 'Patient Services Coordinator'" },
                  department: { type: "string", description: "e.g. Front Office, Optical, Management" },
                  employment_type: { type: "string", description: "One of: Full-time, Part-time, PRN" },
                  description: { type: "string", description: "Clean role summary, responsibilities, schedule, what makes a great fit" },
                  requirements: { type: "string", description: "Concise must-haves, certifications, availability" },
                  pay_range: { type: "string", description: "Pay range if present, else empty string" },
                  tags: { type: "array", items: { type: "string" }, description: "Short skill/keyword tags" },
                },
                required: ["title"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_job" } },
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
      return new Response(JSON.stringify({ error: "Failed to parse job description" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message ?? {};
    let extracted: Record<string, unknown> | null = null;

    const toolCall = message.tool_calls?.[0];
    if (toolCall?.function?.arguments) extracted = extractJson(toolCall.function.arguments);
    if (!extracted?.title && typeof message.content === "string") {
      const fromContent = extractJson(message.content);
      if (fromContent?.title) extracted = fromContent;
    }
    if (!extracted?.title && Array.isArray(message.content)) {
      const joined = message.content.map((p: { text?: string }) => p?.text || "").join("\n");
      const fromParts = extractJson(joined);
      if (fromParts?.title) extracted = fromParts;
    }

    if (!extracted || !extracted.title) {
      console.error("Could not extract job. Raw message:", JSON.stringify(message).slice(0, 2000));
      return new Response(
        JSON.stringify({ error: "The job was read but no clear details were found. Please enter them manually or try a clearer file." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-job error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
