import React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Receipt,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Building2,
  BarChart3,
  Settings,
  User,
  Pill,
  Sparkles,
  ChevronRight,
  ShieldCheck
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Billing Counter", to: "/billing", icon: Receipt },
  { label: "Inventory Stock", to: "/inventory", icon: Package },
  { label: "Sales History", to: "/sales", icon: ShoppingCart },
  { label: "Purchases", to: "/purchases", icon: Truck },
  { label: "Customers", to: "/customers", icon: Users },
  { label: "Distributors", to: "/distributors", icon: Building2 },
  { label: "Reports & Analytics", to: "/reports", icon: BarChart3 },
  { label: "Settings", to: "/settings", icon: Settings },
  { label: "Profile", to: "/profile", icon: User },
];

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  return (
    <aside
      className={`fixed lg:static top-0 left-0 z-40 h-screen w-64 glass-panel border-r border-slate-200/60 p-4 flex flex-col justify-between transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      {/* Brand & Pharmacy Badge Header */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 tracking-tight leading-none">
              SRH Medical
            </h2>
            <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-600">
              <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
              <span>Pharmacy OS v2.0</span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.to;

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className="block relative group"
              >
                <div
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400 group-hover:text-emerald-600"}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && (
                    <motion.div layoutId="activeIndicator">
                      <ChevronRight className="w-3.5 h-3.5 text-white/80" />
                    </motion.div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Multi-Tenant Security Footer */}
      <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-center space-y-1">
        <div className="flex items-center justify-center gap-1.5 text-emerald-700 text-[11px] font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Tenant Isolated</span>
        </div>
        <p className="text-[10px] font-medium text-slate-500">Encrypted Drug License Session</p>
      </div>
    </aside>
  );
}
