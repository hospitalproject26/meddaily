import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/use-auth";
import { AnimatePresence } from "framer-motion";
import { CinematicIntro, hasSeenIntro, markIntroSeen } from "@/components/CinematicIntro";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Smart Pharmacy Manager" },
      { name: "description", content: "Pharmacy management — billing, inventory, customers & reports." },
      { property: "og:title", content: "Smart Pharmacy Manager" },
      { name: "twitter:title", content: "Smart Pharmacy Manager" },
      { property: "og:description", content: "Pharmacy management — billing, inventory, customers & reports." },
      { name: "twitter:description", content: "Pharmacy management — billing, inventory, customers & reports." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/09c5a326-bf4f-4dd2-a4ec-e84ca10c2b28" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/09c5a326-bf4f-4dd2-a4ec-e84ca10c2b28" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [showIntro, setShowIntro] = React.useState(false);

  React.useEffect(() => {
    if (!hasSeenIntro()) {
      setShowIntro(true);
    }
  }, []);

  const finishIntro = () => {
    markIntroSeen();
    setShowIntro(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AnimatePresence>{showIntro && <CinematicIntro onComplete={finishIntro} />}</AnimatePresence>
        <Outlet />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
