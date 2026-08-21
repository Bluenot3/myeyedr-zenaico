import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STAGE_KEYS = ["applied", "screening", "phone_screen", "interview", "assessment", "reference", "offer", "hired"];

// Tools the assistant may PROPOSE. The edge function never executes them — it
// returns them to the client, which runs them only after the admin confirms.
const tools = [
  {
    type: "function",
    function: {
      name: "move_stage",
      description: "Propose moving a candidate to a different pipeline stage.",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "string" },
          candidate_name: { type: "string" },
          stage: { type: "string", enum: STAGE_KEYS },
        },
        required: ["candidate_id", "candidate_name", "stage"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "hire_candidate",
      description: "Propose hiring a candidate. This may auto-close the requisition and pool remaining candidates once seats are filled.",
      parameters: {
        type: "object",
        properties: { candidate_id: { type: "string" }, candidate_name: { type: "string" } },
        required: ["candidate_id", "candidate_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pool_candidate",
      description: "Propose moving a candidate to the talent pool to keep them warm.",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "string" },
          candidate_name: { type: "string" },
          reason: { type: "string" },
          roles: { type: "string", description: "Comma-separated best-fit roles" },
        },
        required: ["candidate_id", "candidate_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reject_candidate",
      description: "Propose archiving/rejecting a candidate (kept on file).",
      parameters: {
        type: "object",
        properties: { candidate_id: { type: "string" }, candidate_name: { type: "string" }, reason: { type: "string" } },
        required: ["candidate_id", "candidate_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_note",
      description: "Propose adding a note to a candidate's profile.",
      parameters: {
        type: "object",
        properties: { candidate_id: { type: "string" }, candidate_name: { type: "string" }, note: { type: "string" } },
        required: ["candidate_id", "candidate_name", "note"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "share_to_location",
      description: "Propose sharing view access of a candidate with another office/location.",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "string" },
          candidate_name: { type: "string" },
          location_id: { type: "string" },
          location_name: { type: "string" },
          note: { type: "string" },
        },
        required: ["candidate_id", "candidate_name", "location_id", "location_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_candidate_info",
      description: "Propose updating basic candidate fields. Only include fields that should change.",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "string" },
          candidate_name: { type: "string" },
          applied_role: { type: "string" },
          headline: { type: "string" },
          current_employer: { type: "string" },
          years_experience: { type: "number" },
          rating: { type: "number", description: "1-5 star rating" },
        },
        required: ["candidate_id", "candidate_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_candidate_status",
      description: "Propose setting a candidate's overall status (e.g. active, withdrawn, on_hold) or restoring an archived candidate to the active pipeline.",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "string" },
          candidate_name: { type: "string" },
          status: { type: "string", enum: ["active", "withdrawn", "on_hold", "rejected", "hired"] },
          stage: { type: "string", enum: STAGE_KEYS },
        },
        required: ["candidate_id", "candidate_name", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_candidate_to_position",
      description: "Propose applying/transferring a candidate to a requisition (position) at an office. Prior applications are preserved as history.",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "string" },
          candidate_name: { type: "string" },
          position_id: { type: "string", description: "Exact requisition id from the requisition dataset" },
          position_title: { type: "string" },
          location_id: { type: "string" },
          location_name: { type: "string" },
        },
        required: ["candidate_id", "candidate_name", "position_id", "position_title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_move_stage",
      description: "Propose moving several candidates to the same pipeline stage at once.",
      parameters: {
        type: "object",
        properties: {
          candidate_ids: { type: "array", items: { type: "string" } },
          candidate_names: { type: "string", description: "Comma-separated names for the confirmation label" },
          stage: { type: "string", enum: STAGE_KEYS },
        },
        required: ["candidate_ids", "candidate_names", "stage"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_position",
      description: "Propose opening a new requisition/position for an office. Use attached or pasted job descriptions to fill the description and requirements in full, well-written prose.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          location_id: { type: "string", description: "Exact office id, or omit for a region-wide/unassigned req" },
          location_name: { type: "string" },
          region: { type: "string" },
          department: { type: "string" },
          employment_type: { type: "string", description: "Full-time, Part-time, or PRN" },
          openings: { type: "number" },
          priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
          status: { type: "string", enum: ["open", "on_hold", "closed", "filled"] },
          description: { type: "string" },
          requirements: { type: "string" },
          pay_range: { type: "string" },
          hiring_manager: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_position",
      description: "Propose editing an existing requisition. Only include the fields that should change.",
      parameters: {
        type: "object",
        properties: {
          position_id: { type: "string" },
          position_title: { type: "string" },
          title: { type: "string" },
          department: { type: "string" },
          employment_type: { type: "string" },
          openings: { type: "number" },
          priority: { type: "string" },
          status: { type: "string" },
          description: { type: "string" },
          requirements: { type: "string" },
          pay_range: { type: "string" },
          hiring_manager: { type: "string" },
          location_id: { type: "string" },
          region: { type: "string" },
        },
        required: ["position_id", "position_title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_position_status",
      description: "Propose opening, putting on hold, filling, or closing a requisition.",
      parameters: {
        type: "object",
        properties: {
          position_id: { type: "string" },
          position_title: { type: "string" },
          status: { type: "string", enum: ["open", "on_hold", "closed", "filled"] },
        },
        required: ["position_id", "position_title", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clone_position",
      description: "Propose duplicating an existing requisition (optionally into a different office and/or with a new title).",
      parameters: {
        type: "object",
        properties: {
          source_position_id: { type: "string" },
          source_title: { type: "string" },
          title: { type: "string", description: "New title (defaults to the source title)" },
          location_id: { type: "string" },
          location_name: { type: "string" },
          openings: { type: "number" },
          status: { type: "string", enum: ["open", "on_hold", "closed", "filled"] },
        },
        required: ["source_position_id", "source_title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_position",
      description: "Propose permanently deleting a requisition. Only use when the user explicitly asks to delete/remove it.",
      parameters: {
        type: "object",
        properties: { position_id: { type: "string" }, position_title: { type: "string" } },
        required: ["position_id", "position_title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_job_template",
      description: "Propose saving a reusable job description to the Job Library (does not open a requisition).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          department: { type: "string" },
          employment_type: { type: "string" },
          description: { type: "string" },
          requirements: { type: "string" },
          pay_range: { type: "string" },
        },
        required: ["title", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_interview",
      description: "Propose scheduling an interview or phone screen on the calendar. starts_at must be a full ISO timestamp.",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "string" },
          candidate_name: { type: "string" },
          title: { type: "string" },
          event_type: { type: "string", description: "phone_screen, interview, working_interview, or final" },
          starts_at: { type: "string", description: "ISO 8601 timestamp" },
          mode: { type: "string", description: "in_person, phone, or video" },
          location_id: { type: "string" },
          location_detail: { type: "string" },
          notes: { type: "string" },
        },
        required: ["candidate_id", "candidate_name", "starts_at"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_email",
      description:
        "Write a ready-to-send email on the admin's behalf (outreach, interview invite, offer congratulations, decline, talent-pool re-engagement, or a note to a hiring manager). The admin can edit it, then send it from their own mailbox in one click — sending is also logged as a touchpoint on the candidate. Always write the full subject and body; never leave placeholders like [Name].",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "string", description: "Include when the email is about/to a candidate so the send is logged as a touchpoint" },
          candidate_name: { type: "string" },
          to: { type: "string", description: "Recipient email address if known" },
          purpose: { type: "string", description: "Short label, e.g. 'Phone screen invite'" },
          subject: { type: "string" },
          body: { type: "string", description: "Full email body, plain text with line breaks, signed 'Alexander Leschik, MyEyeDr'" },
        },
        required: ["subject", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_contact",
      description: "Propose logging a touchpoint (call, email, text) on a candidate so outreach history stays accurate.",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "string" },
          candidate_name: { type: "string" },
          method: { type: "string", description: "email, phone, text, or in_person" },
          outcome: { type: "string", description: "e.g. connected, left_voicemail, no_answer, sent" },
          notes: { type: "string" },
        },
        required: ["candidate_id", "candidate_name", "method"],
      },
    },
  },
];


const ACTION_LABEL: Record<string, (a: any) => string> = {
  move_stage: (a) => `Move ${a.candidate_name} to “${a.stage}”`,
  hire_candidate: (a) => `Hire ${a.candidate_name}`,
  pool_candidate: (a) => `Add ${a.candidate_name} to the talent pool`,
  reject_candidate: (a) => `Archive ${a.candidate_name}`,
  add_note: (a) => `Add a note to ${a.candidate_name}`,
  share_to_location: (a) => `Share ${a.candidate_name} with ${a.location_name}`,
  update_candidate_info: (a) => `Update ${a.candidate_name}'s info`,
  set_candidate_status: (a) => `Set ${a.candidate_name}'s status to “${a.status}”`,
  assign_candidate_to_position: (a) => `Apply ${a.candidate_name} to ${a.position_title}${a.location_name ? ` · ${a.location_name}` : ""}`,
  bulk_move_stage: (a) => `Move ${(a.candidate_ids || []).length} candidates (${a.candidate_names}) to “${a.stage}”`,
  create_position: (a) => `Open requisition: ${a.title}${a.location_name ? ` · ${a.location_name}` : ""}`,
  update_position: (a) => `Edit requisition: ${a.position_title}`,
  set_position_status: (a) => `Set ${a.position_title} to “${a.status}”`,
  clone_position: (a) => `Duplicate ${a.source_title}${a.location_name ? ` → ${a.location_name}` : ""}`,
  delete_position: (a) => `Delete requisition: ${a.position_title}`,
  create_job_template: (a) => `Save “${a.title}” to the Job Library`,
  schedule_interview: (a) => `Schedule ${a.event_type || "interview"} for ${a.candidate_name}`,
  draft_email: (a) => `${a.purpose || "Email draft"}${a.candidate_name ? ` · ${a.candidate_name}` : ""}`,
  log_contact: (a) => `Log ${a.method || "contact"} with ${a.candidate_name}`,
};



serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // User-scoped client → RLS limits candidates to what this user may see.
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const mode: string = body?.mode === "briefing" ? "briefing" : "chat";
    const messages = body?.messages;
    if (mode === "chat" && !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load only what the caller can access (RLS-scoped).
    const [{ data: candidates }, { data: positions }, { data: locations }, { data: goldens }, { data: templates }] = await Promise.all([
      userClient.from("candidates").select(
        "id, full_name, email, phone, applied_role, best_fit_roles, location_id, position_id, stage, status, score, rating, years_experience, current_employer, tags, headline, resume_summary, screening_status, interview_status, in_talent_pool, talent_pool_reason, source, contact_count, last_contacted_at, created_at, updated_at",
      ).order("score", { ascending: false }).limit(250),
      userClient.from("positions").select(
        "id, title, location_id, region, status, req_code, openings, department, employment_type, priority, pay_range, hiring_manager, description, requirements, created_at",
      ),
      userClient.from("locations").select("id, site_name, region, manager, manager_email"),
      userClient.from("golden_profiles").select("position_id, name, is_active, must_have_skills, ideal_years_experience"),
      userClient.from("job_templates").select("id, title, department, employment_type, pay_range"),
    ]);



    const locName = (id: string | null) => (locations ?? []).find((l: any) => l.id === id)?.site_name ?? "Unassigned";
    const posTitle = (id: string | null) => (positions ?? []).find((p: any) => p.id === id)?.title ?? "";

    const compact = (candidates ?? []).map((c: any) => ({
      id: c.id,
      name: c.full_name,
      role: c.applied_role || posTitle(c.position_id) || "—",
      requisition: posTitle(c.position_id),
      office: locName(c.location_id),
      stage: c.stage,
      status: c.status,
      general_score: c.score,
      interview_rating: c.rating,
      years_experience: c.years_experience,
      current_employer: c.current_employer,
      tags: c.tags,
      headline: c.headline,
      summary: c.resume_summary,
      screening: c.screening_status,
      interview: c.interview_status,
      talent_pool: c.in_talent_pool,
      source: c.source,
      touchpoints: c.contact_count,
    }));

    const officeList = (locations ?? []).map((l: any) => ({ location_id: l.id, name: l.site_name, region: l.region }));

    const reqList = (positions ?? []).map((p: any) => ({
      position_id: p.id,
      req_code: p.req_code,
      title: p.title,
      office: locName(p.location_id),
      location_id: p.location_id,
      region: p.region,
      status: p.status,
      openings: p.openings,
      department: p.department,
      employment_type: p.employment_type,
      priority: p.priority,
      pay_range: p.pay_range,
      hiring_manager: p.hiring_manager,
      description_excerpt: typeof p.description === "string" ? p.description.slice(0, 500) : "",
      requirements_excerpt: typeof p.requirements === "string" ? p.requirements.slice(0, 400) : "",
      applicants: (candidates ?? []).filter((c: any) => c.position_id === p.id).length,
    }));

    const templateList = (templates ?? []).map((t: any) => ({
      template_id: t.id, title: t.title, department: t.department, employment_type: t.employment_type, pay_range: t.pay_range,
    }));

    const activeBenchmarks = (goldens ?? [])
      .filter((g: any) => g.is_active)
      .map((g: any) => ({ requisition: posTitle(g.position_id), ideal: g.name, must_have: g.must_have_skills }));

    const system = `You are the MyEyeDr Talent Assistant — an expert recruiting analyst AND operations chief of staff for an admin. You reason about candidates and requisitions, and you drive the system on the admin's behalf.
You can ONLY use the data provided below. It already reflects exactly what this user is permitted to see; never invent candidates, requisitions, scores, or facts not present. If asked about something outside the data, say you don't have that information.

You help with two things:
1) ANSWERING & COMPARING — answer questions, compare candidates side by side, recommend the best fit, spot risks, audit requisition coverage, and suggest next steps. Justify recommendations with the data.
2) TAKING ACTION — you have tools that PROPOSE changes to candidates, requisitions, the job library, and the calendar. Calling a tool never applies the change directly: the admin sees a confirmation card and approves it.

WHAT YOU CAN DO:
- Candidates: move stage (single or bulk), hire, pool, archive/reject, set status, add notes, share with another office, edit their details, apply/transfer them to a requisition, and schedule interviews or phone screens.
- Requisitions: create new ones (including from an attached or pasted job description), edit any field including the full description and requirements, open / hold / fill / close them, duplicate them into other offices, and delete them.
- Job library: save a reusable job description.

REQUISITION AUTHORING:
- When the user attaches or pastes a job description, rewrite it into clean, professional prose for "description" and a concise must-have list for "requirements" — do not paste raw text with artifacts. Never invent a pay range that isn't given.
- If the user names an office, use its exact location_id. If several offices are named, propose one create_position (or clone_position) per office.
- When duplicating, use clone_position with the source requisition's id so all details carry over; only include fields you're intentionally changing.
- Default openings to 1 and status to "open" unless told otherwise.

FORMATTING (write like a polished analyst report):
- Lead with a one-line takeaway, then supporting detail. Keep paragraphs short.
- Use markdown headings (##, ###) to structure longer answers, **bold** for key names/numbers, and bullet or numbered lists for scannability.
- Use GitHub-flavored markdown tables for any comparison of 2+ candidates or requisitions.
- When numeric data would be clearer visually (score comparisons, experience, pipeline counts, source breakdowns), include a chart using a fenced code block with language "chart" containing JSON:
  \`\`\`chart
  {"type":"bar","title":"Match scores","x":"name","series":["score"],"data":[{"name":"Jane D.","score":88},{"name":"Amir K.","score":81}]}
  \`\`\`
  Supported "type" values: "bar", "line", "area", "pie". Use "name" as the x/label field. Only chart real values from the dataset — never invent numbers. Prefer one focused chart over many.
- Be concise and confident; avoid filler.

CRITICAL rules for actions:
- To make ANY change you MUST call a tool. Never describe a change in words alone.
- NEVER claim an action is done, completed, applied, moved, hired, created, or closed. You have not done it — you only propose it. Say things like "I've proposed moving X to interview — confirm below" instead.
- You may propose several actions at once by calling multiple tools. Always add a short sentence explaining what you're proposing and why.
- Always use exact ids from the datasets below (candidate id, position_id, location_id). Never guess or fabricate an id.

Valid pipeline stages: ${STAGE_KEYS.join(", ")}.
Offices (use the exact location_id): ${JSON.stringify(officeList)}

Requisitions visible to this user (${reqList.length}):
${JSON.stringify(reqList)}

Job library templates:
${templateList.length ? JSON.stringify(templateList) : "None saved yet."}

Active best-fit benchmarks by requisition:
${activeBenchmarks.length ? JSON.stringify(activeBenchmarks) : "None set yet."}

Candidate dataset (${compact.length} visible to this user):
${JSON.stringify(compact)}

REMEMBER: If the user's latest message asks you to change anything — candidates or requisitions — you MUST respond by calling the matching tool(s) with exact ids, not with text that claims the change was made.`;



    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, ...messages],
        tools,
        tool_choice: "auto",
        temperature: 0.4,
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached, please retry shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits to continue." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `AI error ${res.status}`);
    }

    const data = await res.json();
    const message = data.choices?.[0]?.message ?? {};
    let reply: string = message.content ?? "";

    const proposed_actions: any[] = [];
    const toolCalls = message.tool_calls ?? [];
    for (const tc of toolCalls) {
      try {
        const name = tc.function?.name;
        const args = JSON.parse(tc.function?.arguments || "{}");
        if (!name || !ACTION_LABEL[name]) continue;
        proposed_actions.push({
          id: tc.id || crypto.randomUUID(),
          type: name,
          label: ACTION_LABEL[name](args),
          args,
        });
      } catch (_e) { /* skip malformed tool call */ }
    }

    if (!reply && proposed_actions.length > 0) {
      reply = `I've prepared ${proposed_actions.length} action${proposed_actions.length === 1 ? "" : "s"} for your confirmation:`;
    }
    if (!reply) reply = "I couldn't produce a response.";

    return new Response(JSON.stringify({ reply, proposed_actions, candidateCount: compact.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
