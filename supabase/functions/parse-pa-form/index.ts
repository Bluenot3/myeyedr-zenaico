import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fileBase64, fileName } = await req.json();
    if (!fileBase64) {
      return new Response(JSON.stringify({ error: "No file data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
            content: `You are an HR document parser for Boys & Girls Clubs of Greater Washington (BGCGW). Extract candidate information from Personnel Action (PA) forms. Return a JSON object with these fields:
- candidate_name (string, full name)
- position (string, job title)
- region (string, one of: DC, Maryland, Virginia, Virtual)
- site (string, club/site name)
- hiring_manager (string, manager name)
- requisition_id (string, if found)
- clearance_type (string, based on region: "DC CPR + Suitability" for DC, "MD CPS" for Maryland, "VA State Licensing" for Virginia)
- dc_suitability_needed (boolean, true if DC region)

If a field cannot be determined, use an empty string or false for booleans. Always return valid JSON only, no markdown.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Parse this PA form document and extract the candidate information. File name: ${fileName}`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${fileBase64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_candidate_info",
              description: "Extract candidate information from a PA form",
              parameters: {
                type: "object",
                properties: {
                  candidate_name: { type: "string" },
                  position: { type: "string" },
                  region: { type: "string", enum: ["DC", "Maryland", "Virginia", "Virtual"] },
                  site: { type: "string" },
                  hiring_manager: { type: "string" },
                  requisition_id: { type: "string" },
                  clearance_type: { type: "string" },
                  dc_suitability_needed: { type: "boolean" },
                },
                required: ["candidate_name", "position"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_candidate_info" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      return new Response(JSON.stringify({ error: "Failed to parse document" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let extracted: Record<string, unknown> = {};

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        extracted = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    // Fallback: try parsing content directly
    if (!extracted.candidate_name) {
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        try {
          extracted = JSON.parse(content);
        } catch {
          console.error("Failed to parse content as JSON");
        }
      }
    }

    return new Response(JSON.stringify({ success: true, data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-pa-form error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
