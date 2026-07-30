import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_app")({
  component: () => (
    <AuthGate>
      <AppShell />
    </AuthGate>
  ),
});
