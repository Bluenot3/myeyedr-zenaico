import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/notion";
const MAX_PAGES = 300; // hard bound on rows pulled per run
const PAGE_SIZE = 100;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/* ---------------------------------- notion --------------------------------- */

async function notion(path: string, init: RequestInit = {}) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const NOTION_API_KEY = Deno.env.get("NOTION_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  if (!NOTION_API_KEY) throw new Error("Notion is not connected for this project");

  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": NOTION_API_KEY,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Notion gateway ${path} failed [${res.status}]: ${text}`);
    throw Object.assign(new Error(`Notion request failed [${res.status}]: ${text}`), { status: res.status });
  }
  return text ? JSON.parse(text) : {};
}

const titleOf = (db: any): string =>
  (db?.title ?? db?.name ?? []).map?.((t: any) => t?.plain_text ?? "").join("").trim() ||
  (typeof db?.title === "string" ? db.title : "") ||
  "Untitled database";

/** Any Notion property → plain string. */
function plain(prop: any): string {
  if (!prop) return "";
  switch (prop.type) {
    case "title":
    case "rich_text":
      return (prop[prop.type] ?? []).map((t: any) => t?.plain_text ?? "").join("").trim();
    case "select":
      return prop.select?.name ?? "";
    case "status":
      return prop.status?.name ?? "";
    case "multi_select":
      return (prop.multi_select ?? []).map((s: any) => s?.name).filter(Boolean).join(", ");
    case "people":
      return (prop.people ?? []).map((p: any) => p?.name).filter(Boolean).join(", ");
    case "email":
      return prop.email ?? "";
    case "phone_number":
      return prop.phone_number ?? "";
    case "url":
      return prop.url ?? "";
    case "number":
      return prop.number === null || prop.number === undefined ? "" : String(prop.number);
    case "checkbox":
      return prop.checkbox ? "true" : "false";
    case "date":
      return prop.date?.start ?? "";
    case "files":
      return (prop.files ?? []).map((f: any) => f?.file?.url ?? f?.external?.url).filter(Boolean).join(", ");
    case "formula":
      return String(prop.formula?.string ?? prop.formula?.number ?? prop.formula?.boolean ?? "");
    case "rollup":
      return (prop.rollup?.array ?? []).map((r: any) => plain(r)).filter(Boolean).join(", ");
    case "created_time":
      return prop.created_time ?? "";
    case "last_edited_time":
      return prop.last_edited_time ?? "";
    default:
      return "";
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Pick a property name for a target field using explicit map first, then aliases. */
function pick(props: Record<string, any>, map: Record<string, string>, field: string, aliases: string[]): string {
  const explicit = map?.[field];
  if (explicit && props[explicit] !== undefined) return plain(props[explicit]);
  const keys = Object.keys(props);
  for (const alias of aliases) {
    const hit = keys.find((k) => norm(k) === norm(alias));
    if (hit) return plain(props[hit]);
  }
  for (const alias of aliases) {
    const hit = keys.find((k) => norm(k).includes(norm(alias)));
    if (hit) return plain(props[hit]);
  }
  return "";
}

const titleProp = (props: Record<string, any>): string => {
  const key = Object.keys(props).find((k) => props[k]?.type === "title");
  return key ? plain(props[key]) : "";
};

/* --------------------------------- mapping --------------------------------- */

const STAGES = ["applied", "screening", "phone_screen", "interview", "assessment", "reference", "offer", "hired"];

function mapStage(raw: string): string {
  const n = norm(raw);
  if (!n) return "applied";
  if (n.includes("hire") || n.includes("onboard") || n.includes("start")) return "hired";
  if (n.includes("offer")) return "offer";
  if (n.includes("reference") || n.includes("background")) return "reference";
  if (n.includes("assessment") || n.includes("test")) return "assessment";
  if (n.includes("phone")) return "phone_screen";
  if (n.includes("interview") || n.includes("onsite")) return "interview";
  if (n.includes("screen") || n.includes("review")) return "screening";
  if (n.includes("new") || n.includes("apply") || n.includes("applied") || n.includes("inbound")) return "applied";
  const direct = STAGES.find((s) => norm(s) === n);
  return direct ?? "applied";
}

function mapStatus(raw: string, stage: string): { status: string; pool: boolean } {
  const n = norm(raw);
  if (n.includes("reject") || n.includes("declin") || n.includes("archiv") || n.includes("withdraw")) {
    return { status: "archived", pool: false };
  }
  if (n.includes("pool") || n.includes("nurtur") || n.includes("future")) return { status: "active", pool: true };
  if (stage === "hired") return { status: "hired", pool: false };
  return { status: "active", pool: false };
}

const num = (v: string, fallback = 0) => {
  const m = String(v).match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : fallback;
};

function mapPositionStatus(raw: string): string {
  const n = norm(raw);
  if (n.includes("fill")) return "filled";
  if (n.includes("hold") || n.includes("paus")) return "on_hold";
  if (n.includes("clos") || n.includes("cancel") || n.includes("archiv")) return "closed";
  return "open";
}

/* ---------------------------------- handler -------------------------------- */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const { data: isAdmin } = await userClient.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) return json({ error: "Admins only" }, 403);

    const admin = createClient(url, service, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const action = body?.action ?? "discover";

    /* ----------------------------- discover ----------------------------- */
    if (action === "discover") {
      const seen = new Map<string, any>();
      for (const filter of [
        { property: "object", value: "data_source" },
        { property: "object", value: "database" },
      ]) {
        try {
          const res = await notion("/v1/search", {
            method: "POST",
            body: JSON.stringify({ filter, page_size: 50 }),
          });
          for (const r of res.results ?? []) {
            const id = r.id;
            if (!id || seen.has(id)) continue;
            seen.set(id, {
              id,
              title: titleOf(r),
              properties: Object.entries(r.properties ?? {}).map(([name, p]: [string, any]) => ({ name, type: p?.type })),
              url: r.url ?? "",
            });
          }
        } catch (e) {
          if ((e as any).status === 400) continue; // older/newer API shape — try the other filter
          throw e;
        }
      }
      return json({ databases: [...seen.values()] });
    }

    /* ------------------------------ preview ----------------------------- */
    if (action === "preview") {
      const dbId = String(body.database_id ?? "");
      if (!dbId) return json({ error: "database_id required" }, 400);
      const res = await notion(`/v1/databases/${dbId}/query`, {
        method: "POST",
        body: JSON.stringify({ page_size: 5 }),
      });
      const rows = (res.results ?? []).map((p: any) => {
        const props = p.properties ?? {};
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(props)) out[k] = plain(v);
        return out;
      });
      const propertyNames = rows.length ? Object.keys(rows[0]) : [];
      return json({ rows, properties: propertyNames, total_preview: rows.length });
    }

    /* ------------------------------- import ----------------------------- */
    if (action === "import") {
      const kind = body.kind === "positions" ? "positions" : "candidates";
      const { data: setting } = await admin
        .from("notion_sync_settings")
        .select("*")
        .eq("kind", kind)
        .maybeSingle();

      const dbId = String(body.database_id ?? setting?.database_id ?? "");
      const map = (body.field_map ?? setting?.field_map ?? {}) as Record<string, string>;
      if (!dbId) return json({ error: "No Notion database configured for this sync" }, 400);

      const { data: run } = await admin
        .from("notion_sync_runs")
        .insert({ kind, status: "running", run_by: user.id })
        .select("id")
        .single();

      let created = 0, updated = 0, skipped = 0;
      const errors: string[] = [];

      try {
        // Pull pages (bounded)
        const pages: any[] = [];
        let cursor: string | undefined;
        while (pages.length < MAX_PAGES) {
          const payload: Record<string, unknown> = { page_size: Math.min(PAGE_SIZE, MAX_PAGES - pages.length) };
          if (cursor) payload.start_cursor = cursor;
          const res = await notion(`/v1/databases/${dbId}/query`, { method: "POST", body: JSON.stringify(payload) });
          pages.push(...(res.results ?? []));
          if (!res.has_more || !res.next_cursor) break;
          cursor = res.next_cursor;
        }

        const [{ data: locations }, { data: positions }] = await Promise.all([
          admin.from("locations").select("id, site_name, region, manager"),
          admin.from("positions").select("id, title, req_code, location_id, region"),
        ]);
        const locs = locations ?? [];
        const poss = positions ?? [];
        const findLoc = (name: string) => {
          const n = norm(name);
          if (!n) return null;
          return locs.find((l: any) => norm(l.site_name) === n) ?? locs.find((l: any) => norm(l.site_name).includes(n) || n.includes(norm(l.site_name))) ?? null;
        };
        const findPos = (name: string, locId: string | null) => {
          const n = norm(name);
          if (!n) return null;
          const byCode = poss.find((p: any) => p.req_code && norm(p.req_code) === n);
          if (byCode) return byCode;
          const matches = poss.filter((p: any) => norm(p.title) === n || norm(p.title).includes(n) || n.includes(norm(p.title)));
          if (!matches.length) return null;
          return matches.find((p: any) => p.location_id === locId) ?? matches[0];
        };

        for (const page of pages) {
          const props = page.properties ?? {};
          try {
            if (kind === "candidates") {
              const name = (pick(props, map, "full_name", ["full name", "name", "candidate", "applicant"]) || titleProp(props)).trim();
              if (!name) { skipped++; continue; }
              const email = pick(props, map, "email", ["email", "e-mail", "email address"]).trim().toLowerCase();
              const roleRaw = pick(props, map, "applied_role", ["role", "position", "applied role", "job title", "req"]);
              const locName = pick(props, map, "location", ["location", "office", "store", "site", "clinic"]);
              const loc = findLoc(locName);
              const pos = findPos(roleRaw, loc?.id ?? null);
              const stage = mapStage(pick(props, map, "stage", ["stage", "pipeline", "status", "step"]));
              const { status, pool } = mapStatus(pick(props, map, "status", ["status", "outcome", "disposition", "stage"]), stage);

              const row: Record<string, unknown> = {
                full_name: name,
                email,
                phone: pick(props, map, "phone", ["phone", "mobile", "cell", "phone number"]),
                applied_role: pos?.title || roleRaw || "",
                position_id: pos?.id ?? null,
                location_id: loc?.id ?? null,
                region: loc?.region ?? pos?.region ?? "",
                stage,
                status,
                in_talent_pool: pool,
                source: pick(props, map, "source", ["source", "channel", "referral"]) || "Notion",
                headline: pick(props, map, "headline", ["headline", "summary", "title", "about"]).slice(0, 300),
                years_experience: Math.max(0, Math.round(num(pick(props, map, "years_experience", ["years", "experience", "yoe"])))),
                resume_url: pick(props, map, "resume_url", ["resume", "cv", "resume url", "attachment"]),
                notion_page_id: page.id,
              };

              // Dedupe: notion page → email → name+phone
              let existing: any = null;
              const byPage = await admin.from("candidates").select("id").eq("notion_page_id", page.id).maybeSingle();
              existing = byPage.data;
              if (!existing && email) {
                const byEmail = await admin.from("candidates").select("id").ilike("email", email).limit(1);
                existing = byEmail.data?.[0] ?? null;
              }
              if (!existing && row.phone) {
                const byName = await admin.from("candidates").select("id").ilike("full_name", name).eq("phone", row.phone as string).limit(1);
                existing = byName.data?.[0] ?? null;
              }

              if (existing) {
                const { error } = await admin.from("candidates").update(row).eq("id", existing.id);
                if (error) throw error;
                updated++;
              } else {
                const { data: ins, error } = await admin.from("candidates").insert(row).select("id").single();
                if (error) throw error;
                created++;
                await admin.from("candidate_events").insert({
                  candidate_id: ins.id,
                  event_type: "imported",
                  title: "Imported from Notion",
                  actor: "Notion sync",
                  detail: { notion_page_id: page.id, notion_url: page.url ?? "" },
                  location_id: (row.location_id as string) ?? null,
                  requisition_id: (row.position_id as string) ?? null,
                });
              }
            } else {
              const title = (pick(props, map, "title", ["title", "position", "role", "job title"]) || titleProp(props)).trim();
              if (!title) { skipped++; continue; }
              const locName = pick(props, map, "location", ["location", "office", "store", "site", "clinic"]);
              const loc = findLoc(locName);
              const row: Record<string, unknown> = {
                title,
                location_id: loc?.id ?? null,
                region: loc?.region ?? pick(props, map, "region", ["region", "market", "district"]),
                department: pick(props, map, "department", ["department", "team", "function"]),
                employment_type: pick(props, map, "employment_type", ["employment", "type", "schedule"]) || "Full-time",
                openings: Math.max(1, Math.round(num(pick(props, map, "openings", ["openings", "headcount", "seats", "positions"]), 1))),
                status: mapPositionStatus(pick(props, map, "status", ["status", "state", "stage"])),
                priority: (pick(props, map, "priority", ["priority", "urgency"]) || "medium").toLowerCase().includes("high")
                  ? "high"
                  : (pick(props, map, "priority", ["priority", "urgency"]) || "").toLowerCase().includes("low") ? "low" : "medium",
                description: pick(props, map, "description", ["description", "summary", "overview", "about"]),
                requirements: pick(props, map, "requirements", ["requirements", "qualifications", "must have", "skills"]),
                pay_range: pick(props, map, "pay_range", ["pay", "salary", "compensation", "rate"]),
                hiring_manager: pick(props, map, "hiring_manager", ["hiring manager", "manager", "owner", "recruiter"]) || loc?.manager || "",
                notion_page_id: page.id,
              };

              const byPage = await admin.from("positions").select("id").eq("notion_page_id", page.id).maybeSingle();
              let existing = byPage.data;
              if (!existing) {
                const same = poss.find((p: any) => norm(p.title) === norm(title) && p.location_id === (loc?.id ?? null));
                existing = same ? { id: same.id } : null;
              }

              if (existing) {
                const { error } = await admin.from("positions").update(row).eq("id", existing.id);
                if (error) throw error;
                updated++;
              } else {
                const { error } = await admin.from("positions").insert(row);
                if (error) throw error;
                created++;
              }
            }
          } catch (e) {
            errors.push(`${page.id}: ${(e as Error).message}`.slice(0, 300));
            if (errors.length > 25) break;
          }
        }

        await admin.from("notion_sync_settings").upsert(
          {
            kind,
            database_id: dbId,
            database_title: String(body.database_title ?? setting?.database_title ?? ""),
            field_map: map,
            enabled: true,
            last_synced_at: new Date().toISOString(),
            created_by: setting?.created_by ?? user.id,
          },
          { onConflict: "kind" },
        );

        if (run?.id) {
          await admin.from("notion_sync_runs").update({
            status: errors.length ? "completed_with_errors" : "completed",
            created_count: created,
            updated_count: updated,
            skipped_count: skipped,
            errors,
            message: `${pages.length} Notion rows read`,
          }).eq("id", run.id);
        }

        return json({ ok: true, kind, read: pages.length, created, updated, skipped, errors });
      } catch (e) {
        if (run?.id) {
          await admin.from("notion_sync_runs").update({
            status: "failed",
            created_count: created,
            updated_count: updated,
            skipped_count: skipped,
            errors: [...errors, (e as Error).message].slice(0, 25),
            message: (e as Error).message.slice(0, 500),
          }).eq("id", run.id);
        }
        throw e;
      }
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    const status = (e as any).status && (e as any).status >= 400 ? (e as any).status : 500;
    console.error("notion-sync failed:", (e as Error).message);
    return json({ error: (e as Error).message || "Notion sync failed" }, status);
  }
});
