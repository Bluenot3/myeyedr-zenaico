import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const ROLES = ["admin", "regional", "manager"] as const;
type Role = (typeof ROLES)[number];

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
}

function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const rnd = crypto.getRandomValues(new Uint32Array(10));
  for (let i = 0; i < 10; i++) out += chars[rnd[i] % chars.length];
  return "Zen-" + out;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const action: string = body.action;
    const db = admin();

    // ---- bootstrap: only allowed when there are zero admins ----
    if (action === "bootstrap") {
      const { count } = await db.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
      if ((count ?? 0) > 0) return json({ error: "Already initialized" }, 400);
      const seeds = [
        { email: "royaltokens@gmail.com", full_name: "Owner Admin" },
        { email: "alexander.leschik@myeyedr.com", full_name: "Alexander Leschik" },
      ];
      const created: { email: string; password: string }[] = [];
      for (const s of seeds) {
        const pw = tempPassword();
        const { error } = await db.auth.admin.createUser({
          email: s.email,
          password: pw,
          email_confirm: true,
          user_metadata: { full_name: s.full_name, must_reset_password: true },
        });
        // role granted automatically by DB trigger for these emails
        if (!error) created.push({ email: s.email, password: pw });
      }
      return json({ ok: true, created });
    }

    // ---- everything else requires an admin caller ----
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Not authenticated" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    const caller = userData?.user;
    if (!caller) return json({ error: "Not authenticated" }, 401);

    const { data: adminRole } = await db
      .from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle();
    if (!adminRole) return json({ error: "Admins only" }, 403);

    switch (action) {
      case "list_users": {
        const { data: profiles } = await db.from("profiles").select("*").order("created_at", { ascending: true });
        const { data: roles } = await db.from("user_roles").select("user_id, role");
        const { data: locs } = await db.from("user_locations").select("user_id, location_id");
        const users = (profiles ?? []).map((p) => ({
          ...p,
          roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
          location_ids: (locs ?? []).filter((l) => l.user_id === p.id).map((l) => l.location_id),
        }));
        return json({ users });
      }

      case "invite": {
        const email = String(body.email ?? "").trim().toLowerCase();
        const full_name = String(body.full_name ?? "").trim();
        const role: Role = ROLES.includes(body.role) ? body.role : "manager";
        const location_ids: string[] = Array.isArray(body.location_ids) ? body.location_ids : [];
        if (!email || !email.includes("@")) return json({ error: "Valid email required" }, 400);
        if (!full_name) return json({ error: "Name required" }, 400);

        const pw = tempPassword();
        const { data: newUser, error } = await db.auth.admin.createUser({
          email,
          password: pw,
          email_confirm: true,
          user_metadata: { full_name, must_reset_password: true },
        });
        if (error || !newUser?.user) return json({ error: error?.message ?? "Could not create user" }, 400);
        const uid = newUser.user.id;

        await db.from("user_roles").delete().eq("user_id", uid);
        await db.from("user_roles").insert({ user_id: uid, role });
        if (role === "manager" && location_ids.length) {
          await db.from("user_locations").insert(location_ids.map((location_id) => ({ user_id: uid, location_id })));
        }
        return json({ ok: true, email, temp_password: pw });
      }

      case "reset_password": {
        const user_id = String(body.user_id ?? "");
        if (!user_id) return json({ error: "user_id required" }, 400);
        const pw = tempPassword();
        const { error } = await db.auth.admin.updateUserById(user_id, {
          password: pw,
          user_metadata: { must_reset_password: true },
        });
        if (error) return json({ error: error.message }, 400);
        await db.from("profiles").update({ must_reset_password: true }).eq("id", user_id);
        return json({ ok: true, temp_password: pw });
      }

      case "set_role": {
        const user_id = String(body.user_id ?? "");
        const role: Role = ROLES.includes(body.role) ? body.role : "manager";
        if (!user_id) return json({ error: "user_id required" }, 400);
        await db.from("user_roles").delete().eq("user_id", user_id);
        await db.from("user_roles").insert({ user_id, role });
        if (role !== "manager") await db.from("user_locations").delete().eq("user_id", user_id);
        return json({ ok: true });
      }

      case "assign_locations": {
        const user_id = String(body.user_id ?? "");
        const location_ids: string[] = Array.isArray(body.location_ids) ? body.location_ids : [];
        if (!user_id) return json({ error: "user_id required" }, 400);
        await db.from("user_locations").delete().eq("user_id", user_id);
        if (location_ids.length) {
          await db.from("user_locations").insert(location_ids.map((location_id) => ({ user_id, location_id })));
        }
        return json({ ok: true });
      }

      case "delete_user": {
        const user_id = String(body.user_id ?? "");
        if (!user_id) return json({ error: "user_id required" }, 400);
        if (user_id === caller.id) return json({ error: "You cannot delete yourself" }, 400);
        const { error } = await db.auth.admin.deleteUser(user_id);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

// Deno serve shim
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
