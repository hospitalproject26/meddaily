import { Link, useRouterState, Outlet, useNavigate } from "@tanstack/react-router";
import { Home, Receipt, Package, Users, Truck, BarChart3, LogOut, Pill, ShoppingCart, History, Shield } from "lucide-react";
import { useAuth, AppRole } from "@/hooks/use-auth";
import { useCurrentShop } from "@/hooks/use-current-shop";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
}

const NAV: NavItem[] = [
  { to: "/", label: "Home", icon: Home, roles: ["Owner", "Staff", "SuperAdmin"] },
  { to: "/billing", label: "Billing", icon: Receipt, roles: ["Owner", "Staff"] },
  { to: "/sales", label: "Sales", icon: History, roles: ["Owner", "Staff"] },
  { to: "/purchases", label: "Purchases", icon: ShoppingCart, roles: ["Owner", "Staff"] },
  { to: "/inventory", label: "Inventory", icon: Package, roles: ["Owner"] },
  { to: "/customers", label: "Customers", icon: Users, roles: ["Owner"] },
  { to: "/distributors", label: "Distributors", icon: Truck, roles: ["Owner"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["Owner"] },
  { to: "/admin", label: "Admin", icon: Shield, roles: ["SuperAdmin"] },
];


export function AppShell() {
  const { role, signOut, user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = NAV.filter((n) => role && n.roles.includes(role));
  const { data: shop } = useCurrentShop();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col fixed inset-y-0 z-30 glass border-r">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border/60">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-[0_8px_20px_-10px_color-mix(in_oklab,var(--primary)_80%,transparent)]">
            <Pill className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm leading-tight truncate">{shop?.name || "Smart Pharmacy"}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              {shop?.code ? <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5">{shop.code}</Badge> : "Manager"}
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((it) => {
            const active = pathname === it.to;
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary text-primary-foreground shadow-[0_10px_24px_-14px_color-mix(in_oklab,var(--primary)_90%,transparent)]"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:translate-x-0.5",
                )}
              >
                <Icon className={cn("h-4 w-4 transition-transform duration-200", !active && "group-hover:scale-110")} />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border/60">
          <div className="px-3 py-2 mb-2">
            <div className="text-xs text-muted-foreground">Signed in as</div>
            <div className="text-sm font-medium truncate">{user?.email}</div>
            <div className="text-xs text-primary font-medium">{role}</div>
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-64 pb-24 md:pb-0">
        <header className="md:hidden h-14 flex items-center justify-between px-4 border-b glass sticky top-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Pill className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm truncate">{shop?.name || "Smart Pharmacy"}</span>
            {shop?.code && <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5 shrink-0">{shop.code}</Badge>}
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <div key={pathname} className="p-4 md:p-8 page-enter">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 glass border-t z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="grid overflow-x-auto" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((it) => {
            const active = pathname === it.to;
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex flex-col items-center justify-center py-2.5 gap-1 text-xs transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className={cn("flex h-7 w-11 items-center justify-center rounded-full transition-colors", active && "bg-primary/12")}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[10px] font-medium">{it.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
