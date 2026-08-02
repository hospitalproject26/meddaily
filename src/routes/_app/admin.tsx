import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ShieldCheck,
  Users,
  Store,
  Key,
  Save,
  UserPlus,
  Settings,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import { Scroll3DSection } from "@/components/scroll-3d";

export const Route = createFileRoute("/_app/admin")({
  component: AdminPage,
});

function AdminPage() {
  const [storeName, setStoreName] = useState("SRH Medical");
  const [gstin, setGstin] = useState("27AAAAA0000A1Z5");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [address, setAddress] = useState("Main Road, Maharashtra, India");

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Store configuration updated successfully!");
  };

  return (
    <Scroll3DSection className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 glass-panel rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl shadow-emerald-900/10 relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Control Center</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Super Admin Panel</h1>
          <p className="text-xs text-emerald-100/80">
            Manage pharmacy store details, staff access permissions, and database settings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Store Profile Settings */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleSaveStore}
            className="glass-panel p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-5"
          >
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Store className="w-4 h-4 text-emerald-600" />
              Pharmacy Store Profile
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600">Store Name</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">GSTIN Number</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Store Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Store Settings</span>
            </button>
          </form>

          {/* Database Info Card */}
          <div className="glass-panel p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Database className="w-4 h-4 text-emerald-600" />
              Cloud Database Status
            </h3>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-800">Supabase Connection</span>
                <p className="text-[11px] text-slate-500">Ready to link real-time database tables</p>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full">
                Pending Setup
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Staff & Roles */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Staff Accounts
              </h3>
              <button
                type="button"
                onClick={() => toast.info("Add User form coming with Supabase Auth!")}
                className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-900">Super Admin (You)</p>
                  <p className="text-[10px] text-slate-500">Full Access Control</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg">
                  Owner
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-900">Counter Pharmacist</p>
                  <p className="text-[10px] text-slate-500">Billing & Sales Only</p>
                </div>
                <span className="px-2.5 py-1 bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg">
                  Staff
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Scroll3DSection>
  );
}
