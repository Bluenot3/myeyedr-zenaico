import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Curated fallback voices (used if the account has none / key missing).
const FALLBACK = [
  { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", labels: { accent: "American", gender: "female" } },
  { voice_id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", labels: { accent: "American", gender: "female" } },
  { voice_id: "JBFqnCBsd6RMkjVDRZzb", name: "George", labels: { accent: "British", gender: "male" } },
  { voice_id: "nPczCjzI2devNBz1zQrb", name: "Brian", labels: { accent: "American", gender: "male" } },
  { voice_id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", labels: { accent: "British", gender: "female" } },
  { voice_id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", labels: { accent: "American", gender: "female" } },
  { voice_id: "iP95p4xoKVk53GoZ742B", name: "Chris", labels: { accent: "American", gender: "male" } },
  { voice_id: "cjVigY5qzO86Huf0OWal", name: "Eric", labels: { accent: "American", gender: "male" } },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ voices: FALLBACK, source: "fallback" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.elevenlabs.io/v2/voices?page_size=100", {
      headers: { "xi-api-key": apiKey },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ voices: FALLBACK, source: "fallback" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const voices = (data.voices ?? []).map((v: any) => ({
      voice_id: v.voice_id,
      name: v.name,
      category: v.category,
      preview_url: v.preview_url,
      labels: v.labels ?? {},
    }));

    return new Response(
      JSON.stringify({ voices: voices.length ? voices : FALLBACK, source: "elevenlabs" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ voices: FALLBACK, source: "fallback", error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
