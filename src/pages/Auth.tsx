import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, LogIn, ShieldCheck, Lock } from "lucide-react";
import Logo from "@/components/recruiting/Logo";
import ZenSignature from "@/components/recruiting/ZenSignature";
import EyeChartField from "@/components/recruiting/EyeChartField";

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
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden aurora-grain">
      {/* Institutional backdrop */}
      <div className="aurora-bg" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden
        style={{ background: "radial-gradient(58% 46% at 50% -6%, hsl(214 100% 55% / 0.16), transparent 68%)" }}
      />

      <div className="w-full max-w-[420px] relative animate-rise">
        <div className="glass-panel liquid-glass rounded-3xl border border-border overflow-hidden">
          {/* Top hairline accent */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          <div className="p-8 sm:p-10">
            {/* Header — the wordmark itself is the hero mark */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="relative mb-4 mt-1">
                <div className="absolute -inset-6 rounded-3xl bg-primary/20 blur-2xl animate-breathe" aria-hidden />
                <div className="relative animate-float">
                  <Logo markSize={66} className="items-center [&_img]:drop-shadow-[0_4px_28px_rgba(58,155,255,0.5)]" />
                </div>
              </div>
              <p className="micro-label text-[9px] text-muted-foreground/80 mt-2">
                Talent Command
              </p>
              <p className="text-sm text-muted-foreground mt-3 max-w-[15rem]">
                Secure access to your recruiting command center.
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-7">
              <div className="h-px flex-1 bg-border" />
              <span className="micro-label text-[8px] text-muted-foreground/60">Sign in</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Work email</Label>
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@myeyedr.com"
                  className="h-11 transition-shadow focus-visible:ring-2 focus-visible:ring-primary/40"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Password</Label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 transition-shadow focus-visible:ring-2 focus-visible:ring-primary/40"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="w-full h-11 btn-optic tap-target text-[13px] font-semibold tracking-wide"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <LogIn className="h-4 w-4 mr-1.5" />}
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            {/* Trust row */}
            <div className="mt-6 flex items-center justify-center gap-4 text-[10px] text-muted-foreground/70">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald/80" />
                Enterprise-grade
              </span>
              <span className="h-3 w-px bg-border" />
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-emerald/80" />
                Encrypted access
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground/70 text-center mt-5 leading-relaxed">
              Access is invite-only. Contact your administrator to be added.
            </p>
          </div>
        </div>

        <div className="mt-7 flex justify-center">
          <ZenSignature />
        </div>
      </div>
    </div>
  );
}
