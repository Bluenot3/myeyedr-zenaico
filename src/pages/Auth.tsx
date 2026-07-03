import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ScanEye, LogIn } from "lucide-react";
import Logo from "@/components/recruiting/Logo";
import ZenSignature from "@/components/recruiting/ZenSignature";

export default function Auth() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      await refresh();
      const { data: prof } = await supabase
        .from("profiles")
        .select("must_reset_password")
        .eq("id", data.user.id)
        .maybeSingle();
      if (prof?.must_reset_password) {
        toast.info("Please set a new password to continue.");
        navigate("/reset-password", { replace: true });
      } else {
        toast.success("Welcome back.");
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      toast.error(err.message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: "radial-gradient(60% 50% at 50% 0%, hsl(214 100% 55% / 0.18), transparent 70%)" }} />
      <div className="w-full max-w-md relative">
        <div className="glass-panel liquid-glass rounded-3xl border border-border p-8 sm:p-10">
          <div className="flex flex-col items-center text-center mb-7">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald/12 border border-emerald/30 mb-4">
              <ScanEye className="h-7 w-7 text-emerald" />
            </div>
            <Logo markSize={30} sub="Talent Command" />
            <p className="text-sm text-muted-foreground mt-3">Sign in to your recruiting command center.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-xs">Work email</Label>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@myeyedr.com"
                required
              />
            </div>
            <div>
              <Label className="text-xs">Password</Label>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-emerald/15 text-emerald border border-emerald/30 hover:bg-emerald/25 tap-target"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <LogIn className="h-4 w-4 mr-1.5" />}
              Sign in
            </Button>
          </form>

          <p className="text-[11px] text-muted-foreground/70 text-center mt-6">
            Access is invite-only. Contact your administrator to be added.
          </p>
        </div>
        <div className="mt-6 flex justify-center">
          <ZenSignature />
        </div>
      </div>
    </div>
  );
}
