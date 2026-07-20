import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "Owner" | "Staff" | "SuperAdmin";
export type AssignmentStatus = "superadmin" | "active" | "pending" | "suspended";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  status: AssignmentStatus | null;
  loading: boolean;
  refreshStatus: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const pickRole = (rows: { role: string }[] | null): AppRole | null => {
  if (!rows || rows.length === 0) return null;
  const roles = rows.map((r) => r.role);
  if (roles.includes("SuperAdmin")) return "SuperAdmin";
  if (roles.includes("Owner")) return "Owner";
  if (roles.includes("Staff")) return "Staff";
  return null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [status, setStatus] = useState<AssignmentStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserContext = async (uid: string) => {
    const [{ data: roleRows }, { data: statusData }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.rpc("my_assignment_status"),
    ]);
    const r = pickRole(roleRows as { role: string }[] | null);
    setRole(r ?? (statusData === "superadmin" ? "SuperAdmin" : statusData === "active" ? "Owner" : null));
    setStatus((statusData as AssignmentStatus) ?? "pending");
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => { loadUserContext(s.user.id); }, 0);
      } else {
        setRole(null);
        setStatus(null);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) await loadUserContext(s.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshStatus = async () => {
    if (user) await loadUserContext(user.id);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/`, data: { name } },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, role, status, loading, refreshStatus, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
