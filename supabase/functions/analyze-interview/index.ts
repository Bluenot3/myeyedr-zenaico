import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface Word { text: string; start: number; end: number; speaker?: string }

/** Locate the start/end time of a quote by fuzzy-matching its opening words. */
function locateQuote(words: Word[], quote: string): { start: number; end: number } | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const q = norm(quote).split(" ").filter(Boolean);
  if (!q.length || !words.length) return null;
  const tokens = words.map((w) => ({ t: norm(w.text), start: w.start, end: w.end }));
  const probe = q.slice(0, Math.min(5, q.length));
  for (let i = 0; i <= tokens.length - probe.length; i++) {
    let ok = true;
    for (let j = 0; j < probe.length; j++) {
      if (tokens[i + j].t !== probe[j]) { ok = false; break; }
    }
    if (ok) {
      const endIdx = Math.min(tokens.length - 1, i + q.length - 1);
      return { start: tokens[i].start, end: tokens[endIdx].end };
    }
  }
  // fallback: match just the first distinctive word
  const first = q.find((w) => w.length > 4);
  if (first) {
    const hit = tokens.findIndex((t) => t.t === first);
    if (hit >= 0) return { start: tokens[hit].start, end: tokens[Math.min(tokens.length - 1, hit + 6)].end };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ELEVEN = Deno.env.get("ELEVENLABS_API_KEY");
  const LOVABLE = Deno.env.get("LOVABLE_API_KEY");

  const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });

  let mediaId: string | undefined;
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Not signed in" }, 401);

    const body = await req.json();
    const { candidateId, url, candidate } = body;
    mediaId = body.mediaId;
    if (!mediaId || !candidateId || !url) return json({ error: "mediaId, candidateId and url are required" }, 400);

    // Access check
    const { data: canAccess } = await admin.rpc("can_access_candidate", { _user_id: user.id, _candidate_id: candidateId });
    if (!canAccess) return json({ error: "You do not have access to this candidate" }, 403);

    if (!ELEVEN) return json({ error: "Interview transcription is not connected." }, 500);

    // 1) Fetch the uploaded audio
    const audioRes = await fetch(url);
    if (!audioRes.ok) throw new Error(`Could not read uploaded audio (${audioRes.status})`);
    const audioBlob = await audioRes.blob();

    // 2) Transcribe with ElevenLabs Scribe (word timestamps + diarization)
    const transcribe = async (modelId: string) => {
      const fd = new FormData();
      fd.append("file", audioBlob, "interview.audio");
      fd.append("model_id", modelId);
      fd.append("diarize", "true");
      fd.append("tag_audio_events", "false");
      return fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: { "xi-api-key": ELEVEN },
        body: fd,
      });
    };
    let sttRes = await transcribe("scribe_v2");
    if (!sttRes.ok && sttRes.status === 422) {
      // Some accounts only have the earlier Scribe model — fall back.
      sttRes = await transcribe("scribe_v1");
    }
    if (!sttRes.ok) {
      const t = await sttRes.text();
      throw new Error(`Transcription failed: ${sttRes.status} ${t.slice(0, 300)}`);
    }
    const stt = await sttRes.json();
    const transcript: string = stt.text ?? "";
    const rawWords: Word[] = Array.isArray(stt.words)
      ? stt.words
          .filter((w: any) => w.type ? w.type === "word" : true)
          .map((w: any) => ({ text: w.text ?? w.word ?? "", start: Number(w.start) || 0, end: Number(w.end) || 0, speaker: w.speaker_id ?? w.speaker }))
      : [];
    const duration = rawWords.length ? rawWords[rawWords.length - 1].end : null;

    if (!transcript.trim()) {
      await admin.from("candidate_media").update({ status: "ready", transcript: "", words: rawWords, error: "No speech detected." }).eq("id", mediaId);
      return json({ ok: true, transcript: "", soundbites: [] });
    }

    // 3) Identify soundbites + decision signals with Lovable AI
    let soundbites: any[] = [];
    let summary = "", sentiment = "", recommendation = "", fitScore: number | null = null;
    if (LOVABLE) {
      const schema = {
        type: "object",
        properties: {
          summary: { type: "string", description: "3-4 sentence recap of the interview." },
          sentiment: { type: "string", description: "one of: positive, neutral, negative, mixed" },
          recommendation: { type: "string", description: "one of: advance, hold, reject" },
          fit_score: { type: "number", description: "0-100 overall fit" },
          soundbites: {
            type: "array",
            description: "6-12 of the most decision-relevant moments actually said by the candidate.",
            items: {
              type: "object",
              properties: {
                quote: { type: "string", description: "the candidate's words, copied verbatim from the transcript" },
                label: { type: "string", description: "one of: strength, concern, skill, red_flag, logistics, culture" },
                note: { type: "string", description: "one short line on why this matters for the hire" },
              },
              required: ["quote", "label", "note"],
            },
          },
        },
        required: ["summary", "sentiment", "recommendation", "soundbites"],
      };
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an expert MyEyeDr interview analyst. From an interview transcript, pick the most decision-relevant soundbites the candidate actually said, quoting verbatim so they can be located in the audio. Be objective. ${candidate ? `Candidate: ${candidate.full_name}, role: ${candidate.applied_role || "n/a"}.` : ""}`,
            },
            { role: "user", content: `Transcript:\n\n${transcript.slice(0, 24000)}` },
          ],
          tools: [{ type: "function", function: { name: "record", description: "Record analysis.", parameters: schema } }],
          tool_choice: { type: "function", function: { name: "record" } },
        }),
      });
      if (aiRes.ok) {
        const data = await aiRes.json();
        const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (args) {
          try {
            const parsed = JSON.parse(args);
            summary = parsed.summary ?? "";
            sentiment = parsed.sentiment ?? "";
            recommendation = parsed.recommendation ?? "";
            fitScore = typeof parsed.fit_score === "number" ? parsed.fit_score : null;
            soundbites = (parsed.soundbites ?? []).map((s: any) => {
              const loc = locateQuote(rawWords, s.quote || "");
              return { quote: s.quote, label: s.label, note: s.note, start: loc?.start ?? null, end: loc?.end ?? null };
            });
          } catch { /* ignore */ }
        }
      }
    }

    // 4) Persist
    await admin.from("candidate_media").update({
      status: "ready",
      transcript,
      words: rawWords,
      soundbites,
      summary,
      sentiment,
      recommendation,
      fit_score: fitScore,
      duration_seconds: duration,
      error: null,
    }).eq("id", mediaId);

    return json({ ok: true, transcript, soundbites, summary, sentiment, recommendation });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (mediaId) {
      try { await admin.from("candidate_media").update({ status: "error", error: msg }).eq("id", mediaId); } catch { /* ignore */ }
    }
    return json({ error: msg }, 500);
  }
});
