import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { 
  IndianRupee, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowUpRight, 
  Pill, 
  Receipt, 
  PackagePlus, 
  UserPlus, 
  Sparkles,
  ShoppingBag
} from "lucide-react";

function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-8 relative overflow-hidden">
      {/* Subtle Ambient Background Lighting */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-orb-green blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-gradient-orb-blue blur-3xl pointer-events-none -z-10" />

      {/* Hero Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card-3d rounded-3xl p-6 relative"
      >
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>Smart Pharmacy Command Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Pharmacy Overview
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Real-time daily metrics, inventory health, and revenue tracking.
          </p>
        </div>

        {/* Quick Billing Action Button */}
        <motion.a
          href="/billing"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 hover:from-emerald-700 hover:to-teal-700 transition-all"
        >
          <Receipt className="w-4 h-4" />
          <span>New Billing Counter</span>
        </motion.a>
      </motion.div>

      {/* 3D Floating Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Metric 1: Today's Sales */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="glass-card-3d rounded-3xl p-6 relative group overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">Today's Sales</span>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
              <IndianRupee className="w-6 h-6" />
            </div>
          </div>
          <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-4 tracking-tight">
            ₹0.00
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50/80 w-fit px-2.5 py-1 rounded-lg border border-emerald-100">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>0% from yesterday</span>
          </div>
        </motion.div>

        {/* Metric 2: Today's Profit */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="glass-card-3d rounded-3xl p-6 relative group overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">Today's Net Profit</span>
            <div className="w-12 h-12 rounded-2xl bg-teal-100/80 text-teal-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-4 tracking-tight">
            ₹0.00
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-teal-600 font-bold bg-teal-50/80 w-fit px-2.5 py-1 rounded-lg border border-teal-100">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>PTR vs MRP Margin calculated</span>
          </div>
        </motion.div>

        {/* Metric 3: Orders Filled */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="glass-card-3d rounded-3xl p-6 relative group overflow-hidden sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">Orders Billed</span>
            <div className="w-12 h-12 rounded-2xl bg-sky-100/80 text-sky-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-4 tracking-tight">
            0
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 font-bold bg-slate-100/80 w-fit px-2.5 py-1 rounded-lg border border-slate-200">
            <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
            <span>Ready for counter sales</span>
          </div>
        </motion.div>
      </div>

      {/* Quick Shortcuts Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>Quick Shortcuts</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <a href="/billing" className="glass-panel p-4 rounded-2xl hover:bg-white hover:shadow-md transition-all flex flex-col items-center text-center group">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">New Bill</span>
          </a>

          <a href="/purchases" className="glass-panel p-4 rounded-2xl hover:bg-white hover:shadow-md transition-all flex flex-col items-center text-center group">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <PackagePlus className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Inward Purchase</span>
          </a>

          <a href="/inventory" className="glass-panel p-4 rounded-2xl hover:bg-white hover:shadow-md transition-all flex flex-col items-center text-center group">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Pill className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Medicine Stock</span>
          </a>

          <a href="/customers" className="glass-panel p-4 rounded-2xl hover:bg-white hover:shadow-md transition-all flex flex-col items-center text-center group">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Add Customer</span>
          </a>
        </div>
      </div>

      {/* Stock Health Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Warning Card */}
        <div className="glass-panel rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Low Stock Alerts</h2>
                <p className="text-[11px] text-slate-500 font-medium">Medicines requiring reorder</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-full text-xs font-bold">
              Action Needed
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="p-3.5 bg-amber-50/50 border border-amber-200/50 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-slate-900">TRUSTYL-BR 100 ML</p>
                <p className="text-[11px] font-medium text-slate-500">Batch: HML0180</p>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-xl text-xs font-black">
                0 Units
              </span>
            </div>
          </div>
        </div>

        {/* Expiring Medicines Warning Card */}
        <div className="glass-panel rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Expiring Soon (30 Days)</h2>
                <p className="text-[11px] text-slate-500 font-medium">Clear or return to distributor</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200/60 rounded-full text-xs font-bold">
              Expiry Warning
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="p-3.5 bg-rose-50/50 border border-rose-200/50 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-slate-900">SUMO GEL PAIN RELIEF</p>
                <p className="text-[11px] font-medium text-slate-500">Batch: SP010E · Stock: 2 Strips</p>
              </div>
              <span className="px-3 py-1 bg-rose-100 text-rose-900 rounded-xl text-xs font-black">
                2026-08-01
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

export default Dashboard;
                  
