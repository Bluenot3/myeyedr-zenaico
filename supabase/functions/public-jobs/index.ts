import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isPositionAcceptingApplications } from "../_shared/careers-routing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
  });

/**
 * Public careers feed. Returns only open requisitions and non-identifying
 * aggregate stats — never candidate data.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const [{ data: positions, error: pErr }, { data: locations, error: lErr }] = await Promise.all([
      admin
        .from("positions")
        .select(
          "id, title, department, employment_type, pay_range, description, requirements, region, req_code, openings, location_id, priority, created_at, updated_at, status",
        )
        .eq("status", "open")
        .order("created_at", { ascending: false }),
      admin.from("locations").select("id, site_name, city, state, region, active"),
    ]);
    if (pErr) throw pErr;
    if (lErr) throw lErr;

    const locById = new Map((locations || []).map((l) => [l.id, l]));

    const jobs = (positions || []).filter((p) => {
      const loc = p.location_id ? locById.get(p.location_id) : null;
      return isPositionAcceptingApplications(p, loc);
    }).map((p) => {
      const loc = p.location_id ? locById.get(p.location_id) : null;
      return {
        id: p.id,
        title: p.title,
        department: p.department || "",
        employment_type: p.employment_type || "Full-time",
        pay_range: p.pay_range || "",
        description: p.description || "",
        requirements: p.requirements || "",
        region: p.region || loc?.region || "",
        req_code: p.req_code || "",
        openings: p.openings || 1,
        priority: p.priority || "normal",
        posted_at: p.created_at,
        location: loc
          ? { id: loc.id, site_name: loc.site_name, city: loc.city, state: loc.state, region: loc.region }
          : null,
      };
    });

    const regions = new Set<string>();
    const offices = new Set<string>();
    const byRole = new Map<string, number>();
    let seats = 0;
    for (const j of jobs) {
      if (j.region) regions.add(j.region);
      if (j.location?.id) offices.add(j.location.id);
      seats += j.openings;
      byRole.set(j.title, (byRole.get(j.title) || 0) + j.openings);
    }

    const stats = {
      open_roles: jobs.length,
      seats,
      regions: regions.size,
      offices: offices.size,
      network_offices: (locations || []).filter((l) => l.active !== false).length,
      by_role: [...byRole.entries()]
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      by_region: [...regions].map((r) => ({
        region: r,
        count: jobs.filter((j) => j.region === r).reduce((n, j) => n + j.openings, 0),
      })).sort((a, b) => b.count - a.count),
      by_type: [...new Set(jobs.map((j) => j.employment_type))].map((t) => ({
        type: t,
        count: jobs.filter((j) => j.employment_type === t).length,
      })),
    };

    return json({ success: true, jobs, stats, generated_at: new Date().toISOString() });
  } catch (e) {
    console.error("public-jobs error:", e);
    return json({ error: "Could not load openings" }, 500);
  }
});
