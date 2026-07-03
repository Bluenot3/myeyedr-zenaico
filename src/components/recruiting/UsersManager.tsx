import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Users, UserPlus, Loader2, KeyRound, Trash2, ShieldCheck, MapPin, Copy, Check, X, Crown, Globe, Building2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Role = "admin" | "regional" | "manager";

interface ManagedUser {
  id: string;
  email: string;
  full_name: string | null;
  title: string | null;
  must_reset_password: boolean;
  roles: Role[];
  location_ids: string[];
}

const ROLE_META: Record<Role, { label: string; icon: typeof Crown; color: string; desc: string }> = {
  admin: { label: "Admin", icon: Crown, color: "gold", desc: "Full access · AI · invite users" },
  regional: { label: "Regional", icon: Globe, color: "emerald", desc: "All locations & candidates" },
  manager: { label: "Manager", icon: Building2, color: "cyan", desc: "Assigned locations only" },
};

async function callAdmin(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body: { action, ...payload } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function UsersManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null);
  const [assignFor, setAssignFor] = useState<ManagedUser | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["managed-users"],
    queryFn: async () => (await callAdmin("list_users")).users as ManagedUser[],
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["all-locations"],
    queryFn: async () => {
      const { data } = await supabase.from("locations").select("id, site_name, region, city, state").order("region");
      return data ?? [];
    },
  });

  const reload = () => qc.invalidateQueries({ queryKey: ["managed-users"] });

  const resetPw = async (u: ManagedUser) => {
    try {
      const res = await callAdmin("reset_password", { user_id: u.id });
      setCredential({ email: u.email, password: res.temp_password });
      reload();
    } catch (e: any) { toast.error(e.message); }
  };

  const changeRole = async (u: ManagedUser, role: Role) => {
    try { await callAdmin("set_role", { user_id: u.id, role }); reload(); toast.success("Role updated"); }
    catch (e: any) { toast.error(e.message); }
  };

  const removeUser = async (u: ManagedUser) => {
    if (!confirm(`Remove ${u.email}? This deletes their account.`)) return;
    try { await callAdmin("delete_user", { user_id: u.id }); reload(); toast.success("User removed"); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight">Team & Access</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Create accounts with a name, title, role, and locations. Managers only see candidates and openings for their assigned locations — Admins and Regionals see everything.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="bg-emerald/15 text-emerald border border-emerald/30 hover:bg-emerald/25 tap-target">
          <UserPlus className="h-4 w-4 mr-1.5" /> Invite user
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="grid gap-3">
          {users.map((u) => {
            const primary = (u.roles[0] ?? "manager") as Role;
            const meta = ROLE_META[primary];
            const RoleIcon = meta.icon;
            const isSelf = u.id === user?.id;
            return (
              <div key={u.id} className="glass-panel rounded-2xl border border-border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border" style={{ background: `hsl(var(--${meta.color})/0.12)`, borderColor: `hsl(var(--${meta.color})/0.4)` }}>
                    <RoleIcon className="h-5 w-5" style={{ color: `hsl(var(--${meta.color}))` }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{u.full_name || u.email}{isSelf && <span className="text-[10px] text-muted-foreground ml-1.5">(you)</span>}</p>
                    {u.title && <p className="text-[11px] text-emerald/90 truncate">{u.title}</p>}
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] micro-label" style={{ color: `hsl(var(--${meta.color}))` }}>{meta.label}</span>
                      {primary === "manager" && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> {u.location_ids.length} location{u.location_ids.length === 1 ? "" : "s"}</span>
                      )}
                      {u.must_reset_password && <span className="text-[9px] micro-label text-gold">Pending reset</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={primary} onValueChange={(v) => changeRole(u, v as Role)} disabled={isSelf}>
                    <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_META) as Role[]).map((r) => (
                        <SelectItem key={r} value={r}>{ROLE_META[r].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {primary === "manager" && (
                    <Button size="sm" variant="outline" onClick={() => setAssignFor(u)} className="h-9"><MapPin className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Locations</span></Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => resetPw(u)} className="h-9"><KeyRound className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Reset</span></Button>
                  {!isSelf && (
                    <Button size="sm" variant="outline" onClick={() => removeUser(u)} className="h-9 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {inviteOpen && (
        <InviteDialog
          locations={locations}
          onClose={() => setInviteOpen(false)}
          onInvited={(c) => { setInviteOpen(false); setCredential(c); reload(); }}
        />
      )}
      {assignFor && (
        <AssignLocationsDialog
          user={assignFor}
          locations={locations}
          onClose={() => setAssignFor(null)}
          onSaved={() => { setAssignFor(null); reload(); }}
        />
      )}
      {credential && <CredentialDialog email={credential.email} password={credential.password} onClose={() => setCredential(null)} />}
    </div>
  );
}

type Loc = { id: string; site_name: string; region: string | null; city: string | null; state: string | null };

function InviteDialog({ locations, onClose, onInvited }: { locations: Loc[]; onClose: () => void; onInvited: (c: { email: string; password: string }) => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<Role>("manager");
  const [locIds, setLocIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => setLocIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const invite = async () => {
    if (!email.trim() || !name.trim()) { toast.error("Name and email required"); return; }
    setBusy(true);
    try {
      const res = await callAdmin("invite", { email, full_name: name, title, role, location_ids: role === "manager" ? locIds : [] });
      onInvited({ email: res.email, password: res.temp_password });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg glass-panel">
        <DialogHeader><DialogTitle className="font-display text-2xl flex items-center gap-2"><UserPlus className="h-5 w-5 text-emerald" /> Invite user</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" /></div>
            <div><Label className="text-xs">Email (their username)</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@myeyedr.com" /></div>
          </div>
          <div><Label className="text-xs">Job title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Office Manager · Patient Services Coordinator" /></div>
          <div>
            <Label className="text-xs mb-1.5 block">Role</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(ROLE_META) as Role[]).map((r) => {
                const m = ROLE_META[r]; const I = m.icon; const on = role === r;
                return (
                  <button key={r} onClick={() => setRole(r)} className={`rounded-xl border p-3 text-left transition-all ${on ? "border-emerald/50 bg-emerald/10" : "border-border hover:border-emerald/30"}`}>
                    <I className="h-4 w-4 mb-1" style={{ color: `hsl(var(--${m.color}))` }} />
                    <p className="text-xs font-medium">{m.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{m.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
          {role === "manager" && (
            <div>
              <Label className="text-xs mb-1.5 block">Assigned locations</Label>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-border p-2 space-y-1">
                {locations.length === 0 && <p className="text-xs text-muted-foreground p-2">No locations yet.</p>}
                {locations.map((l) => (
                  <button key={l.id} onClick={() => toggle(l.id)} className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-left ${locIds.includes(l.id) ? "bg-cyan/12 text-foreground" : "hover:bg-muted/40 text-muted-foreground"}`}>
                    <span className={`flex h-4 w-4 items-center justify-center rounded border ${locIds.includes(l.id) ? "bg-cyan border-cyan" : "border-border"}`}>{locIds.includes(l.id) && <Check className="h-3 w-3 text-background" />}</span>
                    <span className="truncate">{l.site_name}<span className="text-muted-foreground/60 text-xs ml-1">{l.region}</span></span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={invite} disabled={busy} className="bg-emerald/15 text-emerald border border-emerald/30 hover:bg-emerald/25">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />} Create account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssignLocationsDialog({ user, locations, onClose, onSaved }: { user: ManagedUser; locations: Loc[]; onClose: () => void; onSaved: () => void }) {
  const [locIds, setLocIds] = useState<string[]>(user.location_ids);
  const [busy, setBusy] = useState(false);
  const toggle = (id: string) => setLocIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const save = async () => {
    setBusy(true);
    try { await callAdmin("assign_locations", { user_id: user.id, location_ids: locIds }); toast.success("Locations updated"); onSaved(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md glass-panel">
        <DialogHeader><DialogTitle className="font-display text-xl flex items-center gap-2"><MapPin className="h-5 w-5 text-cyan" /> {user.full_name || user.email}</DialogTitle></DialogHeader>
        <div className="max-h-72 overflow-y-auto rounded-xl border border-border p-2 space-y-1">
          {locations.map((l) => (
            <button key={l.id} onClick={() => toggle(l.id)} className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-left ${locIds.includes(l.id) ? "bg-cyan/12 text-foreground" : "hover:bg-muted/40 text-muted-foreground"}`}>
              <span className={`flex h-4 w-4 items-center justify-center rounded border ${locIds.includes(l.id) ? "bg-cyan border-cyan" : "border-border"}`}>{locIds.includes(l.id) && <Check className="h-3 w-3 text-background" />}</span>
              <span className="truncate">{l.site_name}<span className="text-muted-foreground/60 text-xs ml-1">{l.region}</span></span>
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy} className="bg-cyan/15 text-cyan border border-cyan/30 hover:bg-cyan/25">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />} Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CredentialDialog({ email, password, onClose }: { email: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(`Email: ${email}\nTemporary password: ${password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md glass-panel">
        <DialogHeader><DialogTitle className="font-display text-xl flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-gold" /> Temporary password</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Share these credentials securely. The user will be required to set their own password at first sign-in.</p>
        <div className="rounded-xl border border-border bg-background/40 p-4 space-y-2 font-mono text-sm">
          <div className="flex justify-between gap-3"><span className="text-muted-foreground">Email</span><span className="truncate">{email}</span></div>
          <div className="flex justify-between gap-3"><span className="text-muted-foreground">Password</span><span className="text-gold">{password}</span></div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={copy}>{copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}{copied ? "Copied" : "Copy"}</Button>
          <Button onClick={onClose} className="bg-emerald/15 text-emerald border border-emerald/30 hover:bg-emerald/25">Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
