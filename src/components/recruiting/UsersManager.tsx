import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Users, UserPlus, Loader2, KeyRound, Trash2, ShieldCheck, MapPin, Copy, Check, Crown, Globe, Building2, Mail,
  Search, MoreHorizontal, Sparkles, ClipboardList,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Role = "admin" | "regional" | "manager";

// Canonical public domain so shared sign-in details and invite redirects
// always point to the branded portal, never a preview host.
const PUBLIC_ORIGIN = "https://myeyedr.zenai.world";
const signInUrl = () => `${PUBLIC_ORIGIN}/auth`;
const resetUrl = () => `${PUBLIC_ORIGIN}/reset-password`;

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

function initials(name: string) {
  return name.split(/[\s.@_-]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export default function UsersManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [credential, setCredential] = useState<{ email: string; password: string; emailed?: boolean } | null>(null);
  const [assignFor, setAssignFor] = useState<ManagedUser | null>(null);
  const [pwFor, setPwFor] = useState<ManagedUser | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [busyBulk, setBusyBulk] = useState(false);

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

  const locName = (id: string) => locations.find((l) => l.id === id)?.site_name ?? "Location";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const primary = (u.roles[0] ?? "manager") as Role;
      if (roleFilter !== "all" && primary !== roleFilter) return false;
      if (!q) return true;
      return [u.full_name, u.email, u.title].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [users, query, roleFilter]);

  const counts = useMemo(() => {
    const c = { admin: 0, regional: 0, manager: 0, pending: 0 };
    users.forEach((u) => {
      c[(u.roles[0] ?? "manager") as Role]++;
      if (u.must_reset_password) c.pending++;
    });
    return c;
  }, [users]);

  const resetPw = async (u: ManagedUser) => {
    try {
      const res = await callAdmin("reset_password", { user_id: u.id });
      setCredential({ email: u.email, password: res.temp_password });
      reload();
    } catch (e: any) { toast.error(e.message); }
  };

  const resendInvite = async (u: ManagedUser) => {
    try {
      const res = await callAdmin("resend_invite", { user_id: u.id, email: u.email, redirect_to: `${window.location.origin}/reset-password` });
      setCredential({ email: u.email, password: res.temp_password, emailed: res.emailed });
      reload();
      if (res.emailed) toast.success("Invite email resent");
    } catch (e: any) { toast.error(e.message); }
  };

  const changeRole = async (u: ManagedUser, role: Role) => {
    try { await callAdmin("set_role", { user_id: u.id, role }); reload(); toast.success("Role updated"); }
    catch (e: any) { toast.error(e.message); }
  };

  const removeUser = async (u: ManagedUser) => {
    if (!confirm(`Remove ${u.full_name || u.email}? This deletes their account.`)) return;
    try { await callAdmin("delete_user", { user_id: u.id }); reload(); toast.success("User removed"); }
    catch (e: any) { toast.error(e.message); }
  };

  const toggleSel = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const selUsers = users.filter((u) => selected.includes(u.id));

  const bulkRole = async (role: Role) => {
    setBusyBulk(true);
    let ok = 0;
    for (const u of selUsers) {
      if (u.id === user?.id) continue;
      try { await callAdmin("set_role", { user_id: u.id, role }); ok++; } catch { /* keep going */ }
    }
    setBusyBulk(false); setSelected([]); reload();
    toast.success(`${ok} ${ok === 1 ? "person" : "people"} set to ${ROLE_META[role].label}`);
  };

  const bulkResend = async () => {
    setBusyBulk(true);
    let ok = 0;
    for (const u of selUsers) {
      try {
        const res = await callAdmin("resend_invite", { user_id: u.id, email: u.email, redirect_to: `${window.location.origin}/reset-password` });
        if (res?.emailed) ok++;
      } catch { /* keep going */ }
    }
    setBusyBulk(false); setSelected([]); reload();
    toast.success(`Invite emails sent to ${ok} of ${selUsers.length}`);
  };

  const bulkLocations = async (ids: string[]) => {
    setBusyBulk(true);
    for (const u of selUsers) {
      try { await callAdmin("assign_locations", { user_id: u.id, location_ids: ids }); } catch { /* keep going */ }
    }
    setBusyBulk(false); setSelected([]); reload();
    toast.success("Locations applied to selected people");
  };

  const pending = users.filter((u) => u.must_reset_password);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight">Team &amp; Access</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Managers only see candidates and openings for their assigned locations. Admins and Regionals see everything.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)} className="tap-target">
            <ClipboardList className="h-4 w-4 mr-1.5" /> Bulk invite
          </Button>
          <Button onClick={() => setInviteOpen(true)} className="btn-optic tap-target">
            <UserPlus className="h-4 w-4 mr-1.5" /> Invite user
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: "Total", value: users.length, icon: Users, color: "emerald" },
          { label: "Admins", value: counts.admin, icon: Crown, color: "gold" },
          { label: "Regionals", value: counts.regional, icon: Globe, color: "emerald" },
          { label: "Managers", value: counts.manager, icon: Building2, color: "cyan" },
        ] as const).map((s) => (
          <div key={s.label} className="control-panel p-3.5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border" style={{ background: `hsl(var(--${s.color})/0.12)`, borderColor: `hsl(var(--${s.color})/0.35)` }}>
              <s.icon className="h-4 w-4" style={{ color: `hsl(var(--${s.color}))` }} />
            </div>
            <div>
              <p className="text-xl font-semibold leading-none">{s.value}</p>
              <p className="micro-label text-[9px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <div className="control-panel p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <Sparkles className="h-4 w-4 text-gold shrink-0" />
          <p className="text-sm flex-1">
            <strong>{pending.length}</strong> {pending.length === 1 ? "person hasn't" : "people haven't"} signed in yet — {pending.map((p) => p.full_name || p.email).join(", ")}.
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={busyBulk}
            onClick={async () => { setSelected(pending.map((p) => p.id)); setTimeout(() => bulkResend(), 0); }}
          >
            <Mail className="h-3.5 w-3.5 mr-1" /> Re-send all invites
          </Button>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email or title" className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as "all" | Role)}>
          <SelectTrigger className="sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {(Object.keys(ROLE_META) as Role[]).map((r) => <SelectItem key={r} value={r}>{ROLE_META[r].label}s</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selected.length > 0 && (
        <div className="control-panel p-3 flex flex-wrap items-center gap-2">
          <span className="text-xs micro-label text-emerald">{selected.length} selected</span>
          <div className="flex-1" />
          {busyBulk && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Select onValueChange={(v) => bulkRole(v as Role)}>
            <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="Set role…" /></SelectTrigger>
            <SelectContent>
              {(Object.keys(ROLE_META) as Role[]).map((r) => <SelectItem key={r} value={r}>{ROLE_META[r].label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-9" disabled={busyBulk} onClick={bulkResend}><Mail className="h-3.5 w-3.5 mr-1" /> Re-send invites</Button>
          <Button size="sm" variant="outline" className="h-9" disabled={busyBulk} onClick={() => setAssignFor({ ...selUsers[0], id: "__bulk__", full_name: `${selected.length} selected`, location_ids: [] })}>
            <MapPin className="h-3.5 w-3.5 mr-1" /> Assign locations
          </Button>
          <Button size="sm" variant="ghost" className="h-9" onClick={() => setSelected([])}>Clear</Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="control-panel p-10 text-center">
          <Users className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No one matches that search.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((u) => {
            const primary = (u.roles[0] ?? "manager") as Role;
            const meta = ROLE_META[primary];
            const RoleIcon = meta.icon;
            const isSelf = u.id === user?.id;
            const name = u.full_name || u.email.split("@")[0];
            const checked = selected.includes(u.id);
            return (
              <div key={u.id} className={`glass-panel rounded-2xl border p-4 sm:p-5 transition-colors ${checked ? "border-emerald/45" : "border-border"}`}>
                <div className="flex items-start gap-3.5">
                  <button
                    onClick={() => toggleSel(u.id)}
                    aria-label={`Select ${name}`}
                    className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${checked ? "bg-emerald border-emerald" : "border-border hover:border-emerald/40"}`}
                  >
                    {checked && <Check className="h-3.5 w-3.5 text-background" />}
                  </button>

                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border font-display text-sm"
                    style={{ background: `hsl(var(--${meta.color})/0.12)`, borderColor: `hsl(var(--${meta.color})/0.4)`, color: `hsl(var(--${meta.color}))` }}
                  >
                    {initials(name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base sm:text-lg font-semibold tracking-tight">{name}</p>
                      {isSelf && <span className="text-[10px] text-muted-foreground">(you)</span>}
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] micro-label"
                        style={{ background: `hsl(var(--${meta.color})/0.12)`, border: `1px solid hsl(var(--${meta.color})/0.3)`, color: `hsl(var(--${meta.color}))` }}
                      >
                        <RoleIcon className="h-2.5 w-2.5" /> {meta.label}
                      </span>
                      {u.must_reset_password && <span className="text-[9px] micro-label text-gold">Hasn't signed in</span>}
                    </div>
                    {u.title && <p className="text-xs text-emerald/90 mt-0.5">{u.title}</p>}
                    <p className="text-sm text-muted-foreground break-all mt-0.5">{u.email}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      {primary === "manager" ? (
                        u.location_ids.length === 0 ? (
                          <span className="text-[10px] text-destructive">No locations assigned — they'll see nothing</span>
                        ) : (
                          u.location_ids.slice(0, 4).map((id) => (
                            <span key={id} className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              <MapPin className="h-2.5 w-2.5" /> {locName(id)}
                            </span>
                          ))
                        )
                      ) : (
                        <span className="text-[10px] text-muted-foreground">All locations · full visibility</span>
                      )}
                      {primary === "manager" && u.location_ids.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">+{u.location_ids.length - 4} more</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={primary} onValueChange={(v) => changeRole(u, v as Role)} disabled={isSelf}>
                      <SelectTrigger className="hidden sm:flex h-9 w-[124px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ROLE_META) as Role[]).map((r) => <SelectItem key={r} value={r}>{ROLE_META[r].label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="h-9 w-9 p-0" aria-label={`Actions for ${name}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => setAssignFor(u)}><MapPin className="h-3.5 w-3.5 mr-2" /> Assigned locations</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPwFor(u)}><KeyRound className="h-3.5 w-3.5 mr-2" /> Set password</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => resendInvite(u)}><Mail className="h-3.5 w-3.5 mr-2" /> Re-send invite email</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => resetPw(u)}><ShieldCheck className="h-3.5 w-3.5 mr-2" /> One-time temp password</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(`Sign in at ${window.location.origin}/auth\nEmail: ${u.email}`); toast.success("Sign-in details copied"); }}>
                          <Copy className="h-3.5 w-3.5 mr-2" /> Copy sign-in details
                        </DropdownMenuItem>
                        {!isSelf && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => removeUser(u)}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove account
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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
      {bulkOpen && (
        <BulkInviteDialog
          locations={locations}
          onClose={() => setBulkOpen(false)}
          onDone={() => { setBulkOpen(false); reload(); }}
        />
      )}
      {assignFor && (
        <AssignLocationsDialog
          user={assignFor}
          locations={locations}
          onClose={() => setAssignFor(null)}
          onSaved={async (ids) => {
            const bulk = assignFor.id === "__bulk__";
            setAssignFor(null);
            if (bulk) await bulkLocations(ids);
            else reload();
          }}
        />
      )}
      {pwFor && <SetPasswordDialog user={pwFor} onClose={() => setPwFor(null)} onSaved={(c) => { setPwFor(null); setCredential(c); reload(); }} />}
      {credential && <CredentialDialog email={credential.email} password={credential.password} emailed={credential.emailed} onClose={() => setCredential(null)} />}
    </div>
  );
}

type Loc = { id: string; site_name: string; region: string | null; city: string | null; state: string | null };

function InviteDialog({ locations, onClose, onInvited }: { locations: Loc[]; onClose: () => void; onInvited: (c: { email: string; password: string; emailed?: boolean }) => void }) {
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
      const res = await callAdmin("invite", { email, full_name: name, title, role, location_ids: role === "manager" ? locIds : [], redirect_to: `${window.location.origin}/reset-password` });
      onInvited({ email: res.email, password: res.temp_password, emailed: res.emailed });
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
          <Button onClick={invite} disabled={busy} className="btn-optic">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />} Create account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BulkInviteDialog({ locations, onClose, onDone }: { locations: Loc[]; onClose: () => void; onDone: () => void }) {
  const [raw, setRaw] = useState("");
  const [role, setRole] = useState<Role>("manager");
  const [locIds, setLocIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ email: string; name: string; ok: boolean; detail: string }[]>([]);

  const toggle = (id: string) => setLocIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const rows = useMemo(() => raw.split("\n").map((line) => {
    const parts = line.split(/[,\t;]/).map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return null;
    const email = parts.find((p) => p.includes("@")) ?? "";
    const name = parts.find((p) => !p.includes("@")) ?? email.split("@")[0];
    const title = parts.filter((p) => p !== email && p !== name)[0] ?? "";
    return email ? { email: email.toLowerCase(), name, title } : null;
  }).filter(Boolean) as { email: string; name: string; title: string }[], [raw]);

  const run = async () => {
    if (!rows.length) { toast.error("Add at least one line with an email address."); return; }
    setBusy(true);
    const out: typeof results = [];
    for (const r of rows) {
      try {
        await callAdmin("invite", { email: r.email, full_name: r.name, title: r.title, role, location_ids: role === "manager" ? locIds : [], redirect_to: `${window.location.origin}/reset-password` });
        out.push({ email: r.email, name: r.name, ok: true, detail: "Invite email sent" });
      } catch (e: any) {
        out.push({ email: r.email, name: r.name, ok: false, detail: e.message });
      }
      setResults([...out]);
    }
    setBusy(false);
    toast.success(`${out.filter((o) => o.ok).length} of ${rows.length} accounts created`);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl glass-panel max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-2xl flex items-center gap-2"><ClipboardList className="h-5 w-5 text-emerald" /> Bulk invite</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Paste one person per line — name, email, job title. Everyone in this batch gets the same role and locations, and each receives their own invite email.
        </p>
        <Textarea
          rows={7}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={"Jane Doe, jane@myeyedr.com, Office Manager\nMike Ruiz, mike@myeyedr.com, General Manager"}
          className="font-mono text-xs"
        />
        <div className="grid sm:grid-cols-3 gap-2">
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
        {role === "manager" && (
          <div>
            <Label className="text-xs mb-1.5 block">Locations for everyone in this batch</Label>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-border p-2 space-y-1">
              {locations.map((l) => (
                <button key={l.id} onClick={() => toggle(l.id)} className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-left ${locIds.includes(l.id) ? "bg-cyan/12 text-foreground" : "hover:bg-muted/40 text-muted-foreground"}`}>
                  <span className={`flex h-4 w-4 items-center justify-center rounded border ${locIds.includes(l.id) ? "bg-cyan border-cyan" : "border-border"}`}>{locIds.includes(l.id) && <Check className="h-3 w-3 text-background" />}</span>
                  <span className="truncate">{l.site_name}<span className="text-muted-foreground/60 text-xs ml-1">{l.region}</span></span>
                </button>
              ))}
            </div>
          </div>
        )}
        {results.length > 0 && (
          <div className="rounded-xl border border-border divide-y divide-border">
            {results.map((r) => (
              <div key={r.email} className="flex items-center gap-2 px-3 py-2 text-xs">
                {r.ok ? <Check className="h-3.5 w-3.5 text-emerald shrink-0" /> : <Trash2 className="h-3.5 w-3.5 text-destructive shrink-0" />}
                <span className="font-medium">{r.name}</span>
                <span className="text-muted-foreground truncate">{r.email}</span>
                <span className="ml-auto text-muted-foreground truncate">{r.detail}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={results.length ? onDone : onClose}>{results.length ? "Done" : "Cancel"}</Button>
          <Button onClick={run} disabled={busy} className="btn-optic">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />} Create {rows.length || ""} account{rows.length === 1 ? "" : "s"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssignLocationsDialog({ user, locations, onClose, onSaved }: { user: ManagedUser; locations: Loc[]; onClose: () => void; onSaved: (ids: string[]) => void }) {
  const [locIds, setLocIds] = useState<string[]>(user.location_ids);
  const [busy, setBusy] = useState(false);
  const isBulk = user.id === "__bulk__";
  const toggle = (id: string) => setLocIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const regions = useMemo(() => Array.from(new Set(locations.map((l) => l.region).filter(Boolean))) as string[], [locations]);
  const selectRegion = (region: string) => setLocIds((p) => Array.from(new Set([...p, ...locations.filter((l) => l.region === region).map((l) => l.id)])));

  const save = async () => {
    if (isBulk) { onSaved(locIds); return; }
    setBusy(true);
    try { await callAdmin("assign_locations", { user_id: user.id, location_ids: locIds }); toast.success("Locations updated"); onSaved(locIds); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md glass-panel">
        <DialogHeader><DialogTitle className="font-display text-xl flex items-center gap-2"><MapPin className="h-5 w-5 text-cyan" /> {user.full_name || user.email}</DialogTitle></DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setLocIds(locations.map((l) => l.id))} className="rounded-full border border-border px-2.5 py-1 text-[10px] micro-label hover:border-cyan/40">Select all</button>
          {regions.map((r) => (
            <button key={r} onClick={() => selectRegion(r)} className="rounded-full border border-border px-2.5 py-1 text-[10px] micro-label hover:border-cyan/40">{r}</button>
          ))}
          <button onClick={() => setLocIds([])} className="rounded-full border border-border px-2.5 py-1 text-[10px] micro-label hover:border-destructive/40">Clear</button>
        </div>
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
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />} Save {locIds.length ? `(${locIds.length})` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CredentialDialog({ email, password, emailed, onClose }: { email: string; password: string; emailed?: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(`Sign in at ${window.location.origin}/auth\nEmail: ${email}\nPassword: ${password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md glass-panel">
        <DialogHeader><DialogTitle className="font-display text-xl flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-gold" /> Sign-in details</DialogTitle></DialogHeader>
        {emailed ? (
          <p className="text-sm text-muted-foreground flex items-start gap-2"><Mail className="h-4 w-4 text-emerald mt-0.5 shrink-0" /> An invite email with a set-password link was sent to <strong>{email}</strong>. The password below is a fallback you can share securely if the email doesn't arrive.</p>
        ) : (
          <p className="text-sm text-muted-foreground">Share these details securely — they can sign in with them right away.</p>
        )}
        <div className="rounded-xl border border-border bg-background/40 p-4 space-y-2 font-mono text-sm">
          <div className="flex justify-between gap-3"><span className="text-muted-foreground">Email</span><span className="truncate">{email}</span></div>
          <div className="flex justify-between gap-3"><span className="text-muted-foreground">Password</span><span className="text-gold">{password}</span></div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={copy}>{copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}{copied ? "Copied" : "Copy"}</Button>
          <Button onClick={onClose} className="btn-optic">Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SetPasswordDialog({
  user,
  onClose,
  onSaved,
}: {
  user: ManagedUser;
  onClose: () => void;
  onSaved: (c: { email: string; password: string; emailed?: boolean }) => void;
}) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const suggest = () => {
    const words = ["Optic", "Lens", "Focus", "Vision", "Frame", "Clarity"];
    const w = words[Math.floor(Math.random() * words.length)];
    setPw(`${w}-${Math.floor(1000 + Math.random() * 9000)}!`);
  };

  const save = async () => {
    if (pw.trim().length < 8) { toast.error("Use at least 8 characters."); return; }
    setBusy(true);
    try {
      await callAdmin("reset_password", { user_id: user.id, password: pw.trim(), force_reset: false });
      toast.success("Password set — they can sign in with it right away.");
      onSaved({ email: user.email, password: pw.trim() });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md glass-panel">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-gold" /> Set password
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Choose a password for <strong>{user.full_name || user.email}</strong>. They can sign in with it immediately and keep using it — no email or extra step needed.
        </p>
        <div>
          <Label className="text-xs">New password</Label>
          <div className="flex gap-2">
            <Input
              autoFocus
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="At least 8 characters"
              onKeyDown={(e) => { if (e.key === "Enter") save(); }}
            />
            <Button variant="outline" onClick={suggest} className="shrink-0"><Sparkles className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy} className="btn-optic">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />} Save password
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
