import { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { useAuth, AppRole } from "@/hooks/use-auth";

export function RequireRole({ children, roles }: { children: ReactNode; roles: AppRole[] }) {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (!role || !roles.includes(role)) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-6 rounded-xl border bg-card">
        <h2 className="text-xl font-bold mb-2">Access restricted</h2>
        <p className="text-sm text-muted-foreground">This section is for Owners only.</p>
      </div>
    );
  }
  return <>{children}</>;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}
