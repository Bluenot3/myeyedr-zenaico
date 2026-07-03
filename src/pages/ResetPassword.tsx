import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, KeyRound, ShieldCheck } from "lucide-react";
import Logo from "@/components/recruiting/Logo";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { refresh, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getUser();
      if (!sess.user) {
        toast.error("Session expired. Please sign in again.");
        navigate("/auth", { replace: true });
        return;
      }
      const { error } = await supabase.auth.updateUser({
        password,
        data: { must_reset_password: false },
      });
      if (error) throw error;
      await supabase.from("profiles").update({ must_reset_password: false }).eq("id", sess.user.id);
      await refresh();
      toast.success("Password updated.");
      navigate("/", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Could not update password");
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
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/12 border border-gold/30 mb-4">
              <ShieldCheck className="h-7 w-7 text-gold" />
            </div>
            <Logo markSize={28} />
            <h1 className="font-display text-2xl mt-3">Set your password</h1>
            <p className="text-sm text-muted-foreground mt-1">Create a new password to secure your account.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-xs">New password</Label>
              <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required />
            </div>
            <div>
              <Label className="text-xs">Confirm password</Label>
              <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" required />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-emerald/15 text-emerald border border-emerald/30 hover:bg-emerald/25 tap-target">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <KeyRound className="h-4 w-4 mr-1.5" />}
              Save password
            </Button>
            <button type="button" onClick={async () => { await signOut(); navigate("/auth", { replace: true }); }} className="w-full text-xs text-muted-foreground hover:text-foreground pt-1">
              Sign out instead
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
