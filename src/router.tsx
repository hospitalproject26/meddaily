import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth"; // Preserved existing authentication hook
import { Pill, ArrowRight, ShieldCheck, Sparkles, Building2, Lock } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, signUp, loading } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      signUp(email, password);
    } else {
      signIn(email, password);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden p-4 sm:p-6">
      {/* 3D Soft Lighting Orbs */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-orb-green blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-orb-blue blur-3xl pointer-events-none animate-pulse" />

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md glass-card-3d rounded-3xl p-6 sm:p-8 relative z-10"
      >
        {/* Brand Identity Header */}
        <div className="text-center mb-8">
          <motion.div 
            whileHover={{ rotate: 12, scale: 1.05 }}
            className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/25 text-white mb-4 cursor-pointer"
          >
            <Pill className="w-9 h-9" />
          </motion.div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[11px] font-semibold mb-2">
            <Sparkles className="w-3 h-3 text-emerald-500" />
            <span>Smart Pharmacy OS v2.0</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">SRH Smart Pharmacy</h2>
          <p className="text-xs text-slate-500 mt-1">Multi-tenant medical operating system</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl mb-6 border border-slate-200/50">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
              !isSignUp ? "bg-white text-slate-900 shadow-md shadow-slate-200/50" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
              isSignUp ? "bg-white text-slate-900 shadow-md shadow-slate-200/50" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Register Shop
          </button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Pharmacy Email Address</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@medicalshop.com"
              className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200/80 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Security Password</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200/80 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all duration-200 mt-2 disabled:opacity-70"
          >
            <span>{loading ? "Authenticating..." : isSignUp ? "Create Pharmacy Account" : "Access Dashboard"}</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </form>

        {/* Security Isolation Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400 text-[11px] font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Encrypted Row Level Security (RLS) Active</span>
        </div>
      </motion.div>
    </div>
  );
    }
