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
      description: "Propose TRANSFERRING a candidate's primary application to a different requisition. Prior applications are preserved as history. Use apply_to_additional_position when they should stay in their current pipeline too.",
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
      name: "apply_to_additional_position",
      description: "Propose ALSO applying a candidate to another open requisition, in parallel with the ones they are already in. Their existing primary application and pipeline stage are untouched. Use this whenever a candidate matches more than one opening.",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "string" },
          candidate_name: { type: "string" },
          position_id: { type: "string", description: "Exact requisition id from the requisition dataset" },
          position_title: { type: "string" },
          location_id: { type: "string" },
          location_name: { type: "string" },
          reason: { type: "string", description: "One short line on why they fit this second opening" },
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
  {
    type: "function",
    function: {
      name: "bulk_set_position_status",
      description:
        "Propose changing the status of MANY requisitions in one action. ALWAYS prefer this over repeating set_position_status when more than one requisition is affected (e.g. 'close every filled req', 'reopen all Tampa roles').",
      parameters: {
        type: "object",
        properties: {
          position_ids: { type: "array", items: { type: "string" } },
          summary: { type: "string", description: "Short human summary of which reqs are included" },
          status: { type: "string", enum: ["open", "on_hold", "closed", "filled"] },
        },
        required: ["position_ids", "summary", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_update_positions",
      description:
        "Propose applying the same field edits to MANY requisitions at once (priority, seats, employment type, pay range, hiring manager, department, status). Use this instead of many update_position calls.",
      parameters: {
        type: "object",
        properties: {
          position_ids: { type: "array", items: { type: "string" } },
          summary: { type: "string", description: "Short human summary of which reqs are included" },
          priority: { type: "string" },
          openings: { type: "number" },
          employment_type: { type: "string" },
          pay_range: { type: "string" },
          hiring_manager: { type: "string" },
          department: { type: "string" },
          status: { type: "string", enum: ["open", "on_hold", "closed", "filled"] },
        },
        required: ["position_ids", "summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_candidate",
      description: "Create a brand new candidate record and place them on a requisition's pipeline.",
      parameters: {
        type: "object",
        properties: {
          full_name: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          applied_role: { type: "string" },
          position_id: { type: "string" },
          position_title: { type: "string" },
          location_id: { type: "string" },
          location_name: { type: "string" },
          current_employer: { type: "string" },
          years_experience: { type: "number" },
          headline: { type: "string" },
          source: { type: "string" },
          stage: { type: "string", enum: STAGE_KEYS },
        },
        required: ["full_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_candidate",
      description: "Permanently delete a candidate record. Only use when the admin explicitly asks to delete, not to archive.",
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
      name: "bulk_set_candidate_status",
      description:
        "Set status (active / talent pool / rejected / hired) for MANY candidates at once. Prefer this over repeating single-candidate actions.",
      parameters: {
        type: "object",
        properties: {
          candidate_ids: { type: "array", items: { type: "string" } },
          candidate_names: { type: "string", description: "Short human summary of who is included" },
          status: { type: "string", enum: ["active", "talent_pool", "rejected", "hired"] },
          reason: { type: "string" },
        },
        required: ["candidate_ids", "candidate_names", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_share_candidates",
      description: "Share many candidates with another office at once so that location's manager can see them.",
      parameters: {
        type: "object",
        properties: {
          candidate_ids: { type: "array", items: { type: "string" } },
          candidate_names: { type: "string" },
          location_id: { type: "string" },
          location_name: { type: "string" },
          note: { type: "string" },
        },
        required: ["candidate_ids", "candidate_names", "location_id", "location_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_apply_to_position",
      description: "Add many candidates as additional applications on one requisition (e.g. pull matching talent-pool people into a new opening).",
      parameters: {
        type: "object",
        properties: {
          candidate_ids: { type: "array", items: { type: "string" } },
          candidate_names: { type: "string" },
          position_id: { type: "string" },
          position_title: { type: "string" },
          location_id: { type: "string" },
          reason: { type: "string" },
        },
        required: ["candidate_ids", "candidate_names", "position_id", "position_title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_signal_scan",
      description: "Run the AI signal scanner on a candidate to surface gaps, patterns and targeted follow-up questions.",
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
      name: "record_decision",
      description: "Record a formal hiring decision with rationale on a candidate's file.",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "string" },
          candidate_name: { type: "string" },
          decision: { type: "string", enum: ["hire", "hold", "reject", "talent_pool"] },
          rationale: { type: "string" },
        },
        required: ["candidate_id", "candidate_name", "decision"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_onboarding",
      description:
        "Set or update a hired candidate's onboarding readiness: trainer, first day, coverage plan and notes. Never handles offer letters, payroll, background checks or I-9.",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "string" },
          candidate_name: { type: "string" },
          trainer_name: { type: "string" },
          first_day_date: { type: "string", description: "ISO date, e.g. 2026-10-05" },
          coverage_plan: { type: "string" },
          notes: { type: "string" },
        },
        required: ["candidate_id", "candidate_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_location",
      description: "Add a new office/location to the network.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          city: { type: "string" },
          state: { type: "string" },
          region: { type: "string" },
          manager: { type: "string" },
          manager_email: { type: "string" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_location",
      description: "Edit an existing office: name, city, state, region, or assigned manager.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string" },
          location_name: { type: "string" },
          name: { type: "string" },
          city: { type: "string" },
          state: { type: "string" },
          region: { type: "string" },
          manager: { type: "string" },
          manager_email: { type: "string" },
        },
        required: ["location_id", "location_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "invite_user",
      description:
        "Invite a teammate by email with a role and the offices they may see. Only the owner accounts can complete this action.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string" },
          full_name: { type: "string" },
          title: { type: "string" },
          role: { type: "string", enum: ["admin", "regional", "manager"] },
          location_ids: { type: "array", items: { type: "string" } },
          location_names: { type: "string" },
        },
        required: ["email", "full_name", "role"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_job_template",
      description: "Edit a saved job description in the Job Library.",
      parameters: {
        type: "object",
        properties: {
          template_id: { type: "string" },
          template_title: { type: "string" },
          title: { type: "string" },
          department: { type: "string" },
          employment_type: { type: "string" },
          description: { type: "string" },
          requirements: { type: "string" },
          pay_range: { type: "string" },
        },
        required: ["template_id", "template_title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_job_template",
      description: "Remove a saved job description from the Job Library.",
      parameters: {
        type: "object",
        properties: { template_id: { type: "string" }, template_title: { type: "string" } },
        required: ["template_id", "template_title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_recurring_task",
      description:
        "Create a standing task the assistant runs on a cadence (e.g. every morning summarise new candidates and aging reqs).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          prompt: { type: "string", description: "The exact instruction to run each time" },
          cadence: { type: "string", enum: ["hourly", "daily", "weekdays", "weekly", "once"] },
        },
        required: ["title", "prompt", "cadence"],
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
  assign_candidate_to_position: (a) => `Move ${a.candidate_name}'s application to ${a.position_title}${a.location_name ? ` · ${a.location_name}` : ""}`,
  apply_to_additional_position: (a) => `Also apply ${a.candidate_name} to ${a.position_title}${a.location_name ? ` · ${a.location_name}` : ""}`,
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
  bulk_set_position_status: (a) => `Set ${(a.position_ids || []).length} requisitions to “${a.status}” — ${a.summary}`,
  bulk_update_positions: (a) => `Update ${(a.position_ids || []).length} requisitions — ${a.summary}`,
  create_candidate: (a) => `Add candidate: ${a.full_name}${a.position_title ? ` → ${a.position_title}` : ""}`,
  delete_candidate: (a) => `Delete ${a.candidate_name} permanently`,
  bulk_set_candidate_status: (a) => `Set ${(a.candidate_ids || []).length} candidates to “${a.status}” — ${a.candidate_names}`,
  bulk_share_candidates: (a) => `Share ${(a.candidate_ids || []).length} candidates with ${a.location_name}`,
  bulk_apply_to_position: (a) => `Apply ${(a.candidate_ids || []).length} candidates to ${a.position_title}`,
  run_signal_scan: (a) => `Run signal scan on ${a.candidate_name}`,
  record_decision: (a) => `Record “${a.decision}” decision for ${a.candidate_name}`,
  update_onboarding: (a) => `Update onboarding readiness for ${a.candidate_name}`,
  create_location: (a) => `Add office: ${a.name}`,
  update_location: (a) => `Edit office: ${a.location_name}`,
  invite_user: (a) => `Invite ${a.full_name} (${a.email}) as ${a.role}`,
  update_job_template: (a) => `Edit job description: ${a.template_title}`,
  delete_job_template: (a) => `Remove job description: ${a.template_title}`,
  schedule_recurring_task: (a) => `Schedule standing task: ${a.title} (${a.cadence})`,

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
    const wantsStream: boolean = body?.stream === true;
    const prefs = {
      length: ["brief", "standard", "deep"].includes(body?.prefs?.length) ? body.prefs.length : "standard",
      style: ["analyst", "executive", "coach", "direct"].includes(body?.prefs?.style) ? body.prefs.style : "analyst",
      charts: body?.prefs?.charts === false ? false : true,
      tables: body?.prefs?.tables === false ? false : true,
      proactive: body?.prefs?.proactive === false ? false : true,
      autoActions: body?.prefs?.autoActions === false ? false : true,
      temperature: typeof body?.prefs?.temperature === "number"
        ? Math.min(1, Math.max(0, body.prefs.temperature))
        : 0.4,
    };

    /* ---- Model routing: workspace-managed models, or the user's own key ---- */
    const MANAGED_MODELS = [
      "google/gemini-2.5-pro",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-lite",
      "openai/gpt-5",
      "openai/gpt-5-mini",
    ];
    const BYOK_ENDPOINT: Record<string, string> = {
      openai: "https://api.openai.com/v1/chat/completions",
      openrouter: "https://openrouter.ai/api/v1/chat/completions",
      groq: "https://api.groq.com/openai/v1/chat/completions",
    };
    const byokKey: string = typeof body?.byok?.key === "string" ? body.byok.key.trim() : "";
    const byokProvider: string = BYOK_ENDPOINT[body?.byok?.provider] ? body.byok.provider : "openai";
    const useByok = byokKey.length > 20;
    const endpoint = useByok ? BYOK_ENDPOINT[byokProvider] : "https://ai.gateway.lovable.dev/v1/chat/completions";
    const authKey = useByok ? byokKey : LOVABLE_API_KEY;
    const chosenModel = useByok
      ? (typeof body?.byok?.model === "string" && body.byok.model.trim() ? body.byok.model.trim() : "gpt-4.1")
      : MANAGED_MODELS.includes(body?.model) ? body.model : "google/gemini-2.5-flash";

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

    const DAY = 86400000;
    const days = (iso: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / DAY) : null);

    const compact = (candidates ?? []).map((c: any) => ({
      id: c.id,
      name: c.full_name,
      email: c.email,
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
      best_fit_roles: c.best_fit_roles,
      source: c.source,
      touchpoints: c.contact_count,
      days_since_applied: days(c.created_at),
      days_since_contact: days(c.last_contacted_at),
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

    /* ---------- Proactive intelligence: what needs the admin today ---------- */
    const openReqs = reqList.filter((r) => r.status === "open");
    const agingReqs = openReqs
      .map((r) => {
        const src = (positions ?? []).find((p: any) => p.id === r.position_id);
        return { ...r, age_days: days(src?.created_at) ?? 0 };
      })
      .filter((r) => r.age_days >= 14)
      .sort((a, b) => b.age_days - a.age_days)
      .slice(0, 8);

    const starvedReqs = openReqs
      .filter((r) => r.applicants === 0 || r.applicants < (r.openings || 1))
      .map((r) => ({ position_id: r.position_id, title: r.title, office: r.office, applicants: r.applicants, openings: r.openings }))
      .slice(0, 8);

    const activeCands = compact.filter(
      (c) => c.status === "active" && !c.talent_pool && !["hired", "rejected", "withdrawn"].includes(c.stage),
    );


    const goingCold = activeCands
      .filter((c) => (c.days_since_contact ?? c.days_since_applied ?? 0) >= 5)
      .sort((a, b) => (b.days_since_contact ?? b.days_since_applied ?? 0) - (a.days_since_contact ?? a.days_since_applied ?? 0))
      .slice(0, 12)
      .map((c) => ({ id: c.id, name: c.name, email: c.email, role: c.role, stage: c.stage, days_quiet: c.days_since_contact ?? c.days_since_applied, score: c.general_score }));

    const neverContacted = activeCands
      .filter((c) => !c.touchpoints)
      .sort((a, b) => (b.general_score || 0) - (a.general_score || 0))
      .slice(0, 12)
      .map((c) => ({ id: c.id, name: c.name, email: c.email, role: c.role, stage: c.stage, score: c.general_score }));

    const norm = (s: unknown) => String(s ?? "").toLowerCase();
    const poolCands = compact.filter((c) => c.talent_pool);
    const poolMatches = openReqs
      .map((r) => {
        const words = norm(r.title).split(/[^a-z]+/).filter((w) => w.length > 3);
        const matches = poolCands
          .filter((c) => {
            const hay = `${norm(c.role)} ${norm(c.best_fit_roles)} ${norm(c.headline)} ${(c.tags || []).map(norm).join(" ")}`;
            return words.some((w) => hay.includes(w));
          })
          .sort((a, b) => (b.general_score || 0) - (a.general_score || 0))
          .slice(0, 4)
          .map((c) => ({ id: c.id, name: c.name, email: c.email, score: c.general_score, prior_role: c.role }));
        return matches.length ? { position_id: r.position_id, title: r.title, office: r.office, location_id: r.location_id, pool_candidates: matches } : null;
      })
      .filter(Boolean)
      .slice(0, 6);

    const awaitingScorecard = activeCands
      .filter((c) => (c.stage === "interview" || c.stage === "assessment") && c.interview !== "completed" && !c.interview_rating)
      .slice(0, 10)
      .map((c) => ({ id: c.id, name: c.name, role: c.role, stage: c.stage, office: c.office }));

    const readyToDecide = activeCands
      .filter((c) => ["interview", "assessment", "reference", "offer"].includes(c.stage) && (c.general_score || 0) >= 75)
      .sort((a, b) => (b.general_score || 0) - (a.general_score || 0))
      .slice(0, 8)
      .map((c) => ({ id: c.id, name: c.name, email: c.email, role: c.role, stage: c.stage, score: c.general_score, office: c.office }));

    const intel = {
      open_requisitions: openReqs.length,
      aging_open_requisitions: agingReqs.map((r) => ({ position_id: r.position_id, title: r.title, office: r.office, age_days: r.age_days, applicants: r.applicants })),
      under_supplied_requisitions: starvedReqs,
      candidates_going_cold: goingCold,
      never_contacted: neverContacted,
      talent_pool_matches_for_open_reqs: poolMatches,
      awaiting_scorecard: awaitingScorecard,
      ready_for_a_decision: readyToDecide,
      offices: officeList.length,
    };

    // Deterministic starter prompts for the admin's home screen — no AI spend.
    const suggestions: { label: string; prompt: string; tone: string }[] = [];
    if (intel.aging_open_requisitions.length) {
      const r = intel.aging_open_requisitions[0];
      suggestions.push({
        tone: "urgent",
        label: `${r.title} · ${r.office} open ${r.age_days}d`,
        prompt: `The ${r.title} requisition at ${r.office} has been open ${r.age_days} days with ${r.applicants} applicants. Give me a recovery plan and propose the actions to fix it.`,
      });
    }
    if (poolMatches.length) {
      const m: any = poolMatches[0];
      suggestions.push({
        tone: "opportunity",
        label: `${m.pool_candidates.length} talent-pool fits for ${m.title}`,
        prompt: `Pull the best talent-pool candidates for ${m.title} at ${m.office}, apply them to that requisition, and draft re-engagement emails for each.`,
      });
    }
    if (neverContacted.length) {
      suggestions.push({
        tone: "action",
        label: `${neverContacted.length} strong candidates never contacted`,
        prompt: `List my highest-scoring candidates who have never been contacted, then draft a first-outreach email for the top three.`,
      });
    }
    if (goingCold.length) {
      suggestions.push({
        tone: "warn",
        label: `${goingCold.length} candidates going cold`,
        prompt: `Which candidates are going cold? Draft follow-up emails and propose the stage moves you'd make.`,
      });
    }
    if (readyToDecide.length) {
      suggestions.push({
        tone: "opportunity",
        label: `${readyToDecide.length} ready for a decision`,
        prompt: `Who is ready for a hire/pass decision right now? Compare them and propose the actions plus the emails to send.`,
      });
    }
    suggestions.push({ tone: "plan", label: "Build my hiring plan for this week", prompt: "Build my hiring plan for this week: what to do, in what order, and propose every action and email you can handle for me." });

    if (mode === "briefing") {
      return new Response(JSON.stringify({ intel, suggestions, candidateCount: compact.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const system = `You are the MyEyeDr Talent Assistant — an expert recruiting analyst AND operations chief of staff for an admin. You reason about candidates and requisitions, and you drive the system on the admin's behalf.
You can ONLY use the data provided below. It already reflects exactly what this user is permitted to see; never invent candidates, requisitions, scores, or facts not present. If asked about something outside the data, say you don't have that information.

You help with two things:
1) ANSWERING & COMPARING — answer questions, compare candidates side by side, recommend the best fit, spot risks, audit requisition coverage, and suggest next steps. Justify recommendations with the data.
2) TAKING ACTION — you have tools that PROPOSE changes to candidates, requisitions, the job library, and the calendar. Calling a tool never applies the change directly: the admin sees a confirmation card and approves it.

WHAT YOU CAN DO:
- Candidates: move stage (single or bulk), hire, pool, archive/reject, set status, add notes, share with another office, edit their details, transfer their application (assign_candidate_to_position), apply them to ADDITIONAL openings in parallel (apply_to_additional_position), and schedule interviews or phone screens.
- Requisitions: create new ones (including from an attached or pasted job description), edit any field including the full description and requirements, open / hold / fill / close them, duplicate them into other offices, and delete them.
- Job library: save a reusable job description.
- Communication: write finished emails with draft_email and log touchpoints with log_contact.

MULTI-REQUISITION MATCHING (do this unprompted):
- A candidate can be active on several requisitions at once. Whenever you review or discuss a candidate, scan the open requisitions for other openings they fit — same role family, same or nearby office, comparable experience — and propose apply_to_additional_position with a one-line reason for each.
- Use apply_to_additional_position (parallel) unless the admin clearly wants to MOVE them off their current requisition, which is assign_candidate_to_position.
- Never propose an opening that is not "open", and never propose one they are already applied to.
- When a requisition is short of applicants, work the reverse direction too: name the existing candidates from other pipelines and the talent pool who fit it, and propose applying them.

BE PROACTIVE (this is what the admin values most):
- The "Attention now" block below is pre-computed from live data. Use it. When the admin asks something open-ended ("what should I do", "what's next", "any updates"), lead with the 2-4 highest-leverage items from it and immediately propose the tool calls that resolve them.
- Even when answering a narrow question, close with a short "Recommended next steps" list — and propose the tools for the ones you can handle.
- Requisitions open 14+ days, requisitions with fewer applicants than openings, candidates going cold, strong candidates never contacted, interviews without a scorecard, and top candidates parked mid-pipeline are all things you should raise unprompted.
- When a stale open requisition has matching talent-pool candidates, propose applying them to it AND draft each re-engagement email in the same reply.

EMAIL DRAFTING (draft_email):
- Write the complete, ready-to-send email: real subject line, warm professional MyEyeDr tone, specific to the candidate, role and office. Never leave bracketed placeholders — use the actual names and details from the data.
- Keep it tight (under ~150 words), one clear ask, and sign off as "Alexander Leschik\\nMyEyeDr".
- Always pass candidate_id and the candidate's email from the dataset when the email is to a candidate, so the send is logged as a touchpoint automatically.
- The admin reviews and edits your draft, then sends it from their own MyEyeDr mailbox in one click. Say "I've drafted it — review and send below", never "I sent it".
- Batch outreach is fine: propose one draft_email per recipient.


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
- Your reach covers the whole system: candidates (create, edit, move, hire, pool, reject, delete, share, apply to more reqs, signal scans, decisions, onboarding readiness), requisitions and the job library (create, clone, edit, open/hold/close/fill, delete, save/edit/remove templates), offices (add, edit, assign a manager), teammates (invite with a role and office access), scheduling, contact logging, email drafts, and standing recurring tasks. If the admin asks for something you have a tool for, call it — never say you cannot act.
- If a request needs several different kinds of change, propose all of them in one reply (e.g. create the requisition, apply three pooled candidates, draft their emails, and schedule the screens).

Valid pipeline stages: ${STAGE_KEYS.join(", ")}.

Offices (use the exact location_id): ${JSON.stringify(officeList)}

ATTENTION NOW — pre-computed from live data, use this to be proactive:
${JSON.stringify(intel)}


Requisitions visible to this user (${reqList.length}):
${JSON.stringify(reqList)}

Job library templates:
${templateList.length ? JSON.stringify(templateList) : "None saved yet."}

Active best-fit benchmarks by requisition:
${activeBenchmarks.length ? JSON.stringify(activeBenchmarks) : "None set yet."}

Candidate dataset (${compact.length} visible to this user):
${JSON.stringify(compact)}

REMEMBER: If the user's latest message asks you to change anything — candidates or requisitions — you MUST respond by calling the matching tool(s) with exact ids, not with text that claims the change was made.`;


    const LENGTH_RULES: Record<string, string> = {
      brief: "RESPONSE LENGTH: Be extremely economical. Lead with the answer in one sentence, then at most 3-5 bullets. No headings unless essential. Never exceed ~120 words of prose.",
      standard: "RESPONSE LENGTH: Balanced analyst brief — a one-line takeaway, then the supporting structure the question deserves. Aim for 150-350 words.",
      deep: "RESPONSE LENGTH: Full working document. Use headings, comparison tables, risk callouts, and an explicit sequenced plan. Cover second-order effects and edge cases. Long is fine when every line earns its place.",
    };
    const STYLE_RULES: Record<string, string> = {
      analyst: "VOICE: Precise recruiting analyst. Evidence first, quantified, neutral tone.",
      executive: "VOICE: Board-level brief for a trillion-dollar operator. Decision-first, crisp, zero hedging, always state the recommendation and the risk.",
      coach: "VOICE: Warm operating partner. Explain the reasoning so the manager learns the judgment, not just the answer.",
      direct: "VOICE: Blunt and telegraphic. Answer, reason, action. No pleasantries, no restating the question.",
    };
    const prefDirective = `OUTPUT PREFERENCES set by this user — follow them exactly.
${LENGTH_RULES[prefs.length]}
${STYLE_RULES[prefs.style]}
${prefs.tables ? "Use markdown tables for any comparison of 2+ records." : "Do NOT use markdown tables; use compact bullet lists instead."}
${prefs.charts ? "Include a ```chart JSON block whenever numeric comparison would be clearer visually (real dataset values only)." : "Do NOT include chart blocks."}
${prefs.proactive ? "Close with a short \"Recommended next steps\" list and raise unprompted risks from the ATTENTION NOW block." : "Answer only what was asked; do not append proactive suggestions unless requested."}
${prefs.autoActions ? "Propose the tool calls that carry out the work whenever the request implies a change." : "Only call tools when the user explicitly asks you to change something."}
LARGE TASKS: If the request spans many records or several steps, do not refuse or ask to narrow it. Work it end to end: state a short plan, execute the analysis over the whole dataset, group results by requisition or office, and propose every action needed — batching with bulk tools where possible.
BATCHING IS MANDATORY: when the same change applies to more than one record, emit ONE bulk tool call (bulk_set_position_status, bulk_update_positions, bulk_move_stage) covering every affected id. Never emit a series of single-record calls for work that a bulk tool can express — the user must never confirm the same change one row at a time.`;

    const gatewayBody: Record<string, unknown> = {
      model: chosenModel,
      messages: [
        { role: "system", content: system },
        { role: "system", content: prefDirective },
        ...messages,
      ],
      tools,
      tool_choice: "auto",
      temperature: prefs.temperature,
      stream: wantsStream,
    };

    const callGateway = (model: string) =>
      fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...gatewayBody, model }),
      });

    let res = await callGateway(chosenModel);

    // A busy or unavailable upstream model must never surface as a dead assistant.
    // Fall back once to the fast workspace model so the request still completes.
    const FALLBACK_MODEL = "google/gemini-2.5-flash";
    if (!useByok && !res.ok && res.status >= 500 && chosenModel !== FALLBACK_MODEL) {
      console.error(`Model ${chosenModel} failed with ${res.status} — retrying on ${FALLBACK_MODEL}`);
      res = await callGateway(FALLBACK_MODEL);
    }
    if (!useByok && (res.status === 400 || res.status === 404) && chosenModel !== FALLBACK_MODEL) {
      console.error(`Model ${chosenModel} rejected (${res.status}) — retrying on ${FALLBACK_MODEL}`);
      res = await callGateway(FALLBACK_MODEL);
    }



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
    if (useByok && (res.status === 401 || res.status === 403)) {
      return new Response(JSON.stringify({ error: `Your ${byokProvider} API key was rejected — check the key and model id in Assistant controls.` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (useByok && res.status === 404) {
      return new Response(JSON.stringify({ error: `Model “${chosenModel}” is not available on your ${byokProvider} key.` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const err = await res.text();
      console.error(`AI gateway ${res.status}: ${err}`);
      let msg = `The AI service returned ${res.status}.`;
      try {
        const parsed = JSON.parse(err);
        msg = parsed?.error?.message || parsed?.message || msg;
      } catch { if (err) msg = err.slice(0, 400); }
      return new Response(JSON.stringify({ error: msg }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const buildActions = (toolCalls: any[]) => {
      const proposed_actions: any[] = [];
      for (const tc of toolCalls ?? []) {
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
      return proposed_actions;
    };

    /* ---------------- Streaming path: token-by-token SSE ---------------- */
    if (wantsStream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const emit = (obj: unknown) =>
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let text = "";
          const calls: Record<number, { id?: string; name: string; args: string }> = {};
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";
              for (const line of lines) {
                const t = line.trim();
                if (!t.startsWith("data:")) continue;
                const payload = t.slice(5).trim();
                if (!payload || payload === "[DONE]") continue;
                let json: any;
                try { json = JSON.parse(payload); } catch { continue; }
                const delta = json.choices?.[0]?.delta;
                if (!delta) continue;
                if (typeof delta.content === "string" && delta.content) {
                  text += delta.content;
                  emit({ t: "delta", v: delta.content });
                }
                for (const tc of delta.tool_calls ?? []) {
                  const i = tc.index ?? 0;
                  calls[i] ??= { name: "", args: "" };
                  if (tc.id) calls[i].id = tc.id;
                  if (tc.function?.name) calls[i].name += tc.function.name;
                  if (tc.function?.arguments) calls[i].args += tc.function.arguments;
                }
              }
            }
            const toolCalls = Object.values(calls)
              .filter((c) => c.name)
              .map((c) => ({ id: c.id, function: { name: c.name, arguments: c.args } }));
            const actions = buildActions(toolCalls);
            if (!text && actions.length) {
              const filler = `I've prepared ${actions.length} action${actions.length === 1 ? "" : "s"} for your confirmation:`;
              emit({ t: "delta", v: filler });
            }
            emit({ t: "done", actions, candidateCount: compact.length });
          } catch (e) {
            emit({ t: "error", message: String(e) });
          } finally {
            controller.close();
          }
        },
      });
      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const data = await res.json();
    const message = data.choices?.[0]?.message ?? {};
    let reply: string = message.content ?? "";
    const proposed_actions = buildActions(message.tool_calls ?? []);

    if (!reply && proposed_actions.length > 0) {
      reply = `I've prepared ${proposed_actions.length} action${proposed_actions.length === 1 ? "" : "s"} for your confirmation:`;
    }
    if (!reply) reply = "I couldn't produce a response.";

    return new Response(JSON.stringify({ reply, proposed_actions, candidateCount: compact.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("candidate-assistant failed:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

});

