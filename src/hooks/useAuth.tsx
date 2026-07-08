import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "regional" | "manager";

const OWNER_EMAILS = ["royaltokens@gmail.com", "alexander.leschik@myeyedr.com"];

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  must_reset_password: boolean;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  isAdmin: boolean;
  isOwner: boolean;
  hasAllAccess: boolean;
  mustReset: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  // Only true during the very first context load — keeps token refreshes
  // from ever unmounting the app and resetting navigation.
  const [firstLoading, setFirstLoading] = useState(true);
  const loadedForUser = useRef<string | null>(null);

  const loadContext = async (uid: string) => {
    const [{ data: prof }, { data: roleRows }] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, must_reset_password").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((prof as Profile) ?? null);
    setRoles(((roleRows ?? []) as { role: AppRole }[]).map((r) => r.role));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        // Only reload context when the actual user changes (sign-in / switch),
        // not on background token refreshes for the same user.
        if (loadedForUser.current !== s.user.id) {
          loadedForUser.current = s.user.id;
          setTimeout(() => loadContext(s.user!.id), 0);
        }
      } else {
        loadedForUser.current = null;
        setProfile(null);
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        loadedForUser.current = data.session.user.id;
        await loadContext(data.session.user.id);
      }
      setFirstLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = async () => {
    if (session?.user) await loadContext(session.user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    loadedForUser.current = null;
    setProfile(null);
    setRoles([]);
  };

  const isAdmin = roles.includes("admin");
  const isOwner = !!profile?.email && OWNER_EMAILS.includes(profile.email.toLowerCase());
  const hasAllAccess = roles.includes("admin") || roles.includes("regional");

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        roles,
        isAdmin,
        isOwner,
        hasAllAccess,
        mustReset: !!profile?.must_reset_password,
        loading: firstLoading,
        refresh,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
