import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function guessMime(url: string, fallback = "application/pdf"): string {
  const u = url.toLowerCase().split("?")[0];
  if (u.endsWith(".pdf")) return "application/pdf";
  if (u.endsWith(".png")) return "image/png";
  if (u.endsWith(".jpg") || u.endsWith(".jpeg")) return "image/jpeg";
  if (u.endsWith(".webp")) return "image/webp";
  if (u.endsWith(".doc")) return "application/msword";
  if (u.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (u.endsWith(".txt")) return "text/plain";
  return fallback;
}

async function fetchAsDataUrl(url: string, contentType?: string | null): Promise<{ dataUrl: string; mime: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    // base64 encode
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      binary += String.fromCharCode(...buf.subarray(i, i + chunk));
    }
    const b64 = btoa(binary);
    const mime = contentType || guessMime(url);
    return { dataUrl: `data:${mime};base64,${b64}`, mime };
  } catch (_e) {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE = Deno.env.get("LOVABLE_API_KEY");

  try {
    if (!LOVABLE) return json({ error: "AI is not configured" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Not signed in" }, 401);

    const { candidateId, evaluatorName } = await req.json();
    if (!candidateId) return json({ error: "Missing candidateId" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });

    // RLS-scoped read — confirms this user may access the candidate.
    const { data: candidate, error: cErr } = await userClient
      .from("candidates").select("*").eq("id", candidateId).single();
    if (cErr || !candidate) return json({ error: "Candidate not found or access denied" }, 403);

    // Gather context (also RLS-scoped so we only read what the user can see).
    const [{ data: notes }, { data: media }] = await Promise.all([
      userClient.from("candidate_notes").select("body, author, created_at").eq("candidate_id", candidateId).order("created_at", { ascending: true }),
      userClient.from("candidate_media").select("label, media_type, transcript, summary").eq("candidate_id", candidateId),
    ]);

    const docs: any[] = Array.isArray(candidate.documents) ? candidate.documents : [];
    const resumeDoc = docs.find((d) => d?.kind === "resume") || docs[0];
    const resumeUrl = resumeDoc?.url || candidate.resume_url || "";

    let resumeContent: { dataUrl: string; mime: string } | null = null;
    if (resumeUrl) resumeContent = await fetchAsDataUrl(resumeUrl, resumeDoc?.type);

    const today = new Date().toISOString().slice(0, 10);
    const contextLines = [
      `Today's date: ${today}`,
      `Candidate: ${candidate.full_name}`,
      `Applied role: ${candidate.applied_role || "unknown"}`,
      `Headline: ${candidate.headline || "n/a"}`,
      `Stated years of experience: ${candidate.years_experience ?? "unknown"}`,
      `Source: ${candidate.source || "n/a"}`,
      `Best-fit roles: ${candidate.best_fit_roles || "n/a"}`,
      `Tags: ${(candidate.tags || []).join(", ") || "none"}`,
    ];
    const notesText = (notes || []).map((n: any) => `- (${n.author}) ${n.body}`).join("\n") || "none";
    const mediaText = (media || [])
      .map((m: any) => `- ${m.label || m.media_type}: ${m.summary || ""}${m.transcript ? " | transcript excerpt: " + String(m.transcript).slice(0, 1500) : ""}`)
      .join("\n") || "none";

    const systemPrompt = `You are an expert recruiting analyst for MyEyeDr (optometry / eye-care). You review a candidate's résumé and file to surface non-obvious patterns a busy human reviewer might miss, and to arm the interviewer with specific, fair questions.

Look hard for things such as:
- Employment gaps (unexplained months/years out of work) — estimate duration.
- Job-hopping / short tenures (repeated <12 month stints).
- Career trajectory oddities (demotions, lateral moves, going backwards, unexplained title inflation).
- Industry switches or misaligned experience for an eye-care/patient-service role.
- Overqualification or underqualification risk.
- Internal inconsistencies (dates that don't add up, overlapping jobs, stated vs. shown experience).
- Frequent relocation / long commute risk.
- Gaps between graduation and first job, or return-to-work signals.
- Anything unusual worth a follow-up.

RULES:
- Base findings ONLY on evidence in the provided material. If the résumé is unreadable or thin, say so and lower confidence — never fabricate specifics.
- Be fair and bias-aware: never infer or flag protected characteristics (age, race, gender, family status, disability, national origin, religion). Frame gaps and patterns neutrally and give the candidate room to explain.
- For each finding, write a plain-English observation, why it matters for this role, and 1-3 concrete, respectful interview questions to explore it.
- Keep it concise and skimmable.`;

    const userContent: any[] = [
      {
        type: "text",
        text: `Analyze this candidate for hidden patterns and produce interview questions.\n\nCONTEXT\n${contextLines.join("\n")}\n\nNOTES\n${notesText}\n\nINTERVIEW / MEDIA\n${mediaText}\n\n${resumeContent ? "The résumé file is attached as an image/document below." : "No résumé file was available — analyze from the context above and clearly note the limited evidence."}`,
      },
    ];
    if (resumeContent) {
      userContent.push({ type: "image_url", image_url: { url: resumeContent.dataUrl } });
    }

    const model = "google/gemini-2.5-flash";
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_signals",
              description: "Report non-obvious candidate patterns and targeted interview questions.",
              parameters: {
                type: "object",
                properties: {
                  risk_level: { type: "string", enum: ["low", "medium", "high"], description: "Overall follow-up risk based on the number/severity of findings" },
                  headline: { type: "string", description: "One short line summarizing the biggest thing to probe" },
                  summary: { type: "string", description: "2-3 sentence neutral summary of the candidate's profile shape and what to verify" },
                  signals: {
                    type: "array",
                    description: "Individual findings. Empty array if nothing notable.",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string", description: "e.g. Employment gap, Short tenure / job-hopping, Trajectory, Industry switch, Over/under-qualified, Inconsistency, Relocation, Other" },
                        title: { type: "string", description: "Short label for the finding" },
                        severity: { type: "string", enum: ["low", "medium", "high"] },
                        observation: { type: "string", description: "What was noticed, with specifics (dates/roles) when available" },
                        why_it_matters: { type: "string", description: "Why this matters for the role — neutral framing" },
                        questions: { type: "array", items: { type: "string" }, description: "1-3 respectful interview questions to explore it" },
                      },
                      required: ["category", "title", "severity", "observation", "why_it_matters", "questions"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["risk_level", "headline", "summary", "signals"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_signals" } },
      }),
    });

    if (aiRes.status === 429) return json({ error: "AI rate limit reached — please try again shortly." }, 429);
    if (aiRes.status === 402) return json({ error: "AI credits exhausted — add credits in workspace settings." }, 402);
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return json({ error: `AI error: ${aiRes.status} ${t.slice(0, 300)}` }, 500);
    }

    const aiData = await aiRes.json();
    const call = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) return json({ error: "AI returned no analysis" }, 500);
    let parsed: any;
    try { parsed = JSON.parse(call.function.arguments); } catch { return json({ error: "AI returned malformed analysis" }, 500); }

    const signals = Array.isArray(parsed.signals) ? parsed.signals : [];
    const record = {
      candidate_id: candidateId,
      risk_level: parsed.risk_level || "low",
      headline: parsed.headline || "",
      summary: parsed.summary || "",
      signals,
      model,
      generated_by: evaluatorName || user.email || "AI",
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error: upErr } = await admin
      .from("candidate_signals")
      .upsert(record, { onConflict: "candidate_id" })
      .select()
      .single();
    if (upErr) return json({ error: `Save failed: ${upErr.message}` }, 500);

    return json({ ok: true, signals: saved });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
