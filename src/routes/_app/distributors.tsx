import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Search, Plus, Phone, Mail, MapPin } from "lucide-react";
import { Scroll3DPage, Scroll3DSection } from "@/components/scroll-3d";

export const Route = createFileRoute("/_app/distributors")({
  component: DistributorsPage,
});

const mockDistributors = [
  { id: 1, name: "Apollo Pharma Distributors", contact: "Rajesh Kumar", phone: "+91 98220 11223", email: "orders@apollopharma.com", city: "Mumbai" },
  { id: 2, name: "Wellness Wholesale Agency", contact: "Suresh Patil", phone: "+91 94221 44556", email: "sales@wellnesswholesale.in", city: "Pune" },
];

function DistributorsPage() {
  return (
    <Scroll3DPage className="space-y-6">
      {/* Header Banner */}
      <Scroll3DSection className="p-6 glass-panel rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-900/10">
        <div className="flex items-center gap-2 text-emerald-100 text-xs font-bold mb-1">
          <Building2 className="w-4 h-4" />
          <span>Vendor Directory</span>
        </div>
        <h1 className="text-2xl font-black">Medical Distributors</h1>
      </Scroll3DSection>

      {/* Action Bar */}
      <Scroll3DSection className="flex gap-4" delay={0.05}>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search distributors..." className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-2xl" />
        </div>
        <button className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" /> Add Agency
        </button>
      </Scroll3DSection>

      {/* Table */}
      <Scroll3DSection className="glass-panel rounded-3xl bg-white p-5 border border-slate-200/80" delay={0.1}>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-400 font-bold border-b border-slate-100">
              <th className="pb-3 pl-2">Agency Name</th>
              <th className="pb-3">Contact Person</th>
              <th className="pb-3">Phone</th>
              <th className="pb-3">City</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockDistributors.map((dist) => (
              <tr key={dist.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-4 pl-2 font-bold text-slate-900">{dist.name}</td>
                <td className="py-4 font-medium text-slate-600">{dist.contact}</td>
                <td className="py-4 font-medium text-emerald-600 flex items-center gap-1.5">
                  <Phone className="w-3 h-3" /> {dist.phone}
                </td>
                <td className="py-4 text-slate-500 font-medium">{dist.city}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Scroll3DSection>
    </Scroll3DPage>
  );
}

