import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Search, Bell, Sparkles, Building2, User, LogOut } from "lucide-react";
import { motion } from "framer-motion";

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="w-full h-16 glass-panel border-b border-slate-200/60 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 bg-white/70 backdrop-blur-md">
      {/* Left Section: Mobile Menu Toggle & Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors"
          aria-label="Toggle Sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="relative w-full hidden sm:block">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Quick search medicines, bills, or customers..."
            className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-100/70 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right Section: Pharmacy Badge, Notifications & Profile */}
      <div className="flex items-center gap-3">
        {/* Pharmacy Shop Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/50 text-emerald-800 text-xs font-bold">
          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>SRH Smart Pharmacy</span>
        </div>

        {/* Notifications Icon */}
        <button className="p-2.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 relative transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500" />
        </button>

        {/* Profile Pill & Sign Out */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200/80">
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-100/80">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
              <User className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800 hidden sm:inline max-w-[100px] truncate">
              {user?.email?.split("@")[0] || "Owner"}
            </span>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => signOut()}
            title="Sign out"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
