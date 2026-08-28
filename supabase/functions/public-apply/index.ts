import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  buildPrimaryCandidatePatch,
  isPositionAcceptingApplications,
  type CareersLocation,
} from "../_shared/careers-routing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BUCKET = "candidate-documents";
const MAX_BYTES = 8 * 1024 * 1024;

function clean(s: unknown, max = 400): string {
  return typeof s === "string" ? s.trim().slice(0, max) : "";
}

/**
 * Public applicant intake. Anonymous applicants POST here; the function
 * writes with the service role so no anon grants exist on candidate tables.
 * Duplicate applicants (same email) are merged instead of duplicated.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const fullName = clean(body.full_name, 120);
    const email = clean(body.email, 160).toLowerCase();
    const phone = clean(body.phone, 40);
    const positionId = clean(body.position_id, 64) || null;
    const desiredRole = clean(body.desired_role, 120);
    const talentPool = !!body.talent_pool || !positionId;
    const message = clean(body.message, 2000);
    const availability = clean(body.availability, 300);
    const certifications = clean(body.certifications, 300);
    const yearsRaw = Number(body.years_experience);
    const years = Number.isFinite(yearsRaw) ? Math.max(0, Math.min(60, Math.round(yearsRaw))) : 0;
    const fileBase64: string = typeof body.file_base64 === "string" ? body.file_base64 : "";
    const fileName = clean(body.file_name, 200) || "resume.pdf";
    const mimeType = clean(body.mime_type, 120) || "application/pdf";

    if (!fullName || fullName.length < 2) return json({ error: "Please enter your full name." }, 400);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Please enter a valid email address." }, 400);
    if (fileBase64 && fileBase64.length * 0.75 > MAX_BYTES) {
      return json({ error: "That résumé is larger than 8 MB. Please upload a smaller file." }, 413);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false },
    });

    /* ---- requisition (must be open) ---- */
    let position: { id: string; title: string; location_id: string | null; region: string; status: string } | null = null;
    if (positionId) {
      const { data, error: positionError } = await admin
        .from("positions")
        .select("id, title, location_id, region, status")
        .eq("id", positionId)
        .maybeSingle();
      if (positionError) throw positionError;
      if (!data) {
        return json({ error: "That opening is no longer accepting applications." }, 409);
      }
      position = data;

      let positionLocation: CareersLocation | null = null;
      if (position.location_id) {
        const { data: location, error: locationError } = await admin
          .from("locations")
          .select("id, active, region")
          .eq("id", position.location_id)
          .maybeSingle();
        if (locationError) throw locationError;
        positionLocation = location;
        position.region = position.region || location?.region || "";
      }
      if (!isPositionAcceptingApplications(position, positionLocation)) {
        return json({ error: "That opening is no longer accepting applications." }, 409);
      }
    }

    /* ---- résumé upload (service role) ---- */
    let resumeUrl = "";
    if (fileBase64) {
      const safe = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `careers/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safe}`;
      const bytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));
      const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, {
        contentType: mimeType,
        upsert: false,
      });
      if (upErr) console.error("resume upload failed:", upErr.message);
      else resumeUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    }

    /* ---- best-effort AI parse (never blocks the application) ---- */
    let parsed: Record<string, any> = {};
    if (fileBase64) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/parse-resume`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
          },
          body: JSON.stringify({ fileBase64, fileName, mimeType }),
        });
        if (res.ok) {
          const out = await res.json();
          if (out?.data && typeof out.data === "object") parsed = out.data;
        }
      } catch (e) {
        console.error("parse-resume call failed:", e);
      }
    }

    const notePieces = [
      message && `Applicant note: ${message}`,
      availability && `Availability: ${availability}`,
      certifications && `Certifications (self-reported): ${certifications}`,
    ].filter(Boolean);

    /* ---- dedupe on email ---- */
    const { data: existing, error: existingError } = await admin
      .from("candidates")
      .select("id, full_name, position_id, in_talent_pool, resume_url, resume_text, resume_summary, years_experience, stage, status")
      .ilike("email", email)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;

    const summary = clean(parsed.summary || parsed.resume_summary, 4000);
    const rawText = typeof parsed.raw_text === "string" ? parsed.raw_text.slice(0, 60000) : "";
    const headline = clean(parsed.headline || desiredRole || position?.title || "", 200);
    const parsedYears = Number(parsed.years_experience);

    let candidateId = existing?.id || "";
    let duplicate = false;

    if (existing) {
      duplicate = true;
      const updates: Record<string, unknown> = {
        full_name: existing.full_name || fullName,
        phone: phone || undefined,
        source: "Careers Site",
        updated_at: new Date().toISOString(),
      };
      if (resumeUrl) updates.resume_url = resumeUrl;
      if (summary && !existing.resume_summary) updates.resume_summary = summary;
      if (rawText && !existing.resume_text) updates.resume_text = rawText;
      if (!existing.years_experience && (years || Number.isFinite(parsedYears))) {
        updates.years_experience = years || parsedYears || 0;
      }
      if (talentPool && !existing.position_id) updates.in_talent_pool = true;
      Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);
      const { error: updateCandidateError } = await admin.from("candidates").update(updates).eq("id", existing.id);
      if (updateCandidateError) throw updateCandidateError;
    } else {
      const insert: Record<string, unknown> = {
        full_name: fullName,
        email,
        phone,
        applied_role: position?.title || desiredRole || "",
        headline,
        source: "Careers Site",
        stage: "applied",
        status: "active",
        position_id: position?.id || null,
        location_id: position?.location_id || null,
        region: position?.region || "",
        in_talent_pool: talentPool,
        talent_pool_reason: talentPool ? "Joined the MyEyeDr talent network via the careers site" : "",
        resume_url: resumeUrl,
        resume_text: rawText,
        resume_summary: summary,
        years_experience: years || (Number.isFinite(parsedYears) ? parsedYears : 0),
        tags: Array.isArray(parsed.skills) ? parsed.skills.slice(0, 12).map((s: unknown) => String(s).slice(0, 40)) : [],
        work_history: Array.isArray(parsed.work_history) ? parsed.work_history.slice(0, 12) : [],
        education: Array.isArray(parsed.education) ? parsed.education.slice(0, 8) : [],
        certifications: Array.isArray(parsed.certifications) ? parsed.certifications.slice(0, 12) : [],
        parse_confidence: typeof parsed.confidence === "number" ? parsed.confidence : null,
        best_fit_roles: clean(parsed.best_fit_roles, 300),
      };
      const { data: created, error: cErr } = await admin.from("candidates").insert(insert).select("id").single();
      if (cErr) throw cErr;
      candidateId = created.id;
    }

    /* ---- application row (parallel applications supported) ---- */
    let alreadyApplied = false;
    if (position) {
      const { data: existingApp, error: existingAppError } = await admin
        .from("candidate_requisitions")
        .select("id")
        .eq("candidate_id", candidateId)
        .eq("position_id", position.id)
        .maybeSingle();
      if (existingAppError) throw existingAppError;

      let applicationId = existingApp?.id || "";
      if (existingApp) {
        alreadyApplied = true;
      } else {
        const { data: createdApp, error: createAppError } = await admin.from("candidate_requisitions").insert({
          candidate_id: candidateId,
          position_id: position.id,
          location_id: position.location_id,
          stage: "applied",
          status: "active",
          source: "Careers Site",
          is_primary: false,
          created_by: "careers-site",
        }).select("id").single();

        if (createAppError?.code === "23505") {
          const { data: concurrentApp, error: concurrentAppError } = await admin
            .from("candidate_requisitions")
            .select("id")
            .eq("candidate_id", candidateId)
            .eq("position_id", position.id)
            .single();
          if (concurrentAppError) throw concurrentAppError;
          applicationId = concurrentApp.id;
          alreadyApplied = true;
        } else if (createAppError) {
          throw createAppError;
        } else {
          applicationId = createdApp?.id || "";
        }
      }

      if (!applicationId) throw new Error("Application record was not created");

      const preserveHiredPlacement = existing?.status === "hired";
      const isCurrentHiredPosition = preserveHiredPlacement && existing?.position_id === position.id;
      const { error: primaryError } = await admin
        .from("candidate_requisitions")
        .update({
          location_id: position.location_id,
          source: "Careers Site",
          ...(!isCurrentHiredPosition ? { stage: "applied", status: "active" } : {}),
          is_primary: preserveHiredPlacement ? isCurrentHiredPosition : true,
        })
        .eq("id", applicationId);
      if (primaryError) throw primaryError;

      if (!preserveHiredPlacement) {
        const { error: demoteError } = await admin
          .from("candidate_requisitions")
          .update({ is_primary: false })
          .eq("candidate_id", candidateId)
          .eq("is_primary", true)
          .neq("id", applicationId);
        if (demoteError) throw demoteError;
      }

      const candidateUpdates = buildPrimaryCandidatePatch(
        position,
        existing?.status,
        new Date().toISOString(),
      );
      if (candidateUpdates) {
        const { error: candidatePointerError } = await admin
          .from("candidates")
          .update(candidateUpdates)
          .eq("id", candidateId);
        if (candidatePointerError) throw candidatePointerError;
      }
    }

    if (notePieces.length) {
      await admin.from("candidate_notes").insert({
        candidate_id: candidateId,
        body: notePieces.join("\n"),
        author: "Careers Site",
      }).then(({ error }) => error && console.error("note insert failed:", error.message));
    }

    await admin.from("candidate_events").insert({
      candidate_id: candidateId,
      event_type: "applied",
      title: position
        ? `${duplicate ? "Re-applied" : "Applied"} to ${position.title} via the careers site`
        : "Joined the talent network via the careers site",
      detail: {
        channel: "careers_site",
        talent_pool: talentPool,
        desired_role: desiredRole,
        availability,
        duplicate,
        already_applied: alreadyApplied,
      },
      requisition_id: position?.id || null,
      location_id: position?.location_id || null,
      actor: "Careers Site",
    }).then(({ error }) => error && console.error("event insert failed:", error.message));

    return json({
      success: true,
      duplicate,
      already_applied: alreadyApplied,
      parsed: !!Object.keys(parsed).length,
      message: alreadyApplied
        ? "You already have an application in for this role — we refreshed your file with the newest résumé."
        : position
          ? "Your application is in front of the hiring manager for this office."
          : "You're in the MyEyeDr talent network.",
    });
  } catch (e) {
    console.error("public-apply error:", e);
    return json({ error: "We couldn't submit your application. Please try again." }, 500);
  }
});
