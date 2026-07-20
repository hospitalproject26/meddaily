import { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { useAuth, AppRole } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Clock, Ban, LogOut } from "lucide-react";

export function RequireRole({ children, roles }: { children: ReactNode; roles: AppRole[] }) {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (!role || !roles.includes(role)) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-6 rounded-xl border bg-card">
        <h2 className="text-xl font-bold mb-2">Access restricted</h2>
        <p className="text-sm text-muted-foreground">You don't have permission to view this section.</p>
      </div>
    );
  }
  return <>{children}</>;
}

function StatusScreen({ icon: Icon, title, message, tone }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  message: string;
  tone: string;
}) {
  const { signOut, user, refreshStatus } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center p-8 rounded-2xl border bg-card shadow-sm">
        <div className={`h-14 w-14 rounded-full mx-auto flex items-center justify-center mb-4 ${tone}`}>
          <Icon className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="text-xs text-muted-foreground mb-4">Signed in as <span className="font-medium">{user?.email}</span></div>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={refreshStatus}>Check again</Button>
          <Button variant="ghost" onClick={signOut}><LogOut className="h-4 w-4 mr-2" />Sign out</Button>
        </div>
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, status } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  if (status === "pending") {
    return (
      <StatusScreen
        icon={Clock}
        title="Account pending approval"
        message="Your account has been created. A SuperAdmin needs to assign you to a pharmacy before you can access the app."
        tone="bg-amber-500/15 text-amber-600"
      />
    );
  }
  if (status === "suspended") {
    return (
      <StatusScreen
        icon={Ban}
        title="Pharmacy suspended"
        message="Your pharmacy has been suspended. Please contact your SuperAdmin to restore access."
        tone="bg-red-500/15 text-red-600"
      />
    );
  }
  return <>{children}</>;
}
