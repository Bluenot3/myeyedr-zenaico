import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const targets = ["royaltokens@gmail.com", "alexander.leschik@myeyedr.com"];
  const results: Record<string, string> = {};

  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const email of targets) {
    const u = list?.users.find((x) => (x.email ?? "").toLowerCase() === email);
    if (!u) { results[email] = "not found"; continue; }
    const { error } = await db.auth.admin.updateUserById(u.id, {
      password: "Password1",
      email_confirm: true,
      user_metadata: { ...u.user_metadata, must_reset_password: false },
    });
    if (error) { results[email] = "error: " + error.message; continue; }
    await db.from("profiles").update({ must_reset_password: false }).eq("id", u.id);
    results[email] = "ok";
  }

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
