import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Users, Search, Plus, Phone, ShoppingBag, ChevronRight, Pill, BellRing } from "lucide-react";
import { regularCustomers } from "@/data/regular-customers";
import { getRefillStatus } from "@/lib/refill-tracker";
import { Scroll3DPage, Scroll3DSection } from "@/components/scroll-3d";

export const Route = createFileRoute("/_app/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  return (
    <Scroll3DPage className="space-y-6">
      {/* Header Banner */}
      <Scroll3DSection className="p-6 glass-panel rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-900/10">
        <div className="flex items-center gap-2 text-emerald-100 text-xs font-bold mb-1">
          <Users className="w-4 h-4" />
          <span>Patient Database</span>
        </div>
        <h1 className="text-2xl font-black">Manage Customers</h1>
      </Scroll3DSection>

      {/* Action Bar */}
      <Scroll3DSection className="flex gap-4" delay={0.05}>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by name or phone..." className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-2xl" />
        </div>
        <button className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" /> Add Customer
        </button>
      </Scroll3DSection>

      {/* Table */}
      <Scroll3DSection className="glass-panel rounded-3xl bg-white p-5 border border-slate-200/80" delay={0.1}>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-400 font-bold border-b border-slate-100">
              <th className="pb-3 pl-2">Customer Name</th>
              <th className="pb-3">Phone Number</th>
              <th className="pb-3">Regular Medicine</th>
              <th className="pb-3">Visits</th>
              <th className="pb-3">Last Order</th>
              <th className="pb-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {regularCustomers.map((customer) => {
              const refill = customer.regularMedicine ? getRefillStatus(customer.regularMedicine) : null;
              return (
                <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 pl-2 font-bold text-slate-900">{customer.name}</td>
                  <td className="py-4 font-medium text-emerald-600 flex items-center gap-2">
                    <Phone className="w-3 h-3" /> {customer.phone}
                  </td>
                  <td className="py-4">
                    {customer.regularMedicine ? (
                      <div className="space-y-1">
                        <span className="flex items-center gap-1.5 font-medium text-slate-700">
                          <Pill className="w-3.5 h-3.5 text-slate-400" /> {customer.regularMedicine.name}
                        </span>
                        {refill && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              refill.dueSoon
                                ? "bg-amber-100 text-amber-800"
                                : refill.daysRemaining < 0
                                ? "bg-slate-100 text-slate-500"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {refill.dueSoon && <BellRing className="w-3 h-3" />}
                            {refill.daysRemaining < 0
                              ? "Supply likely finished"
                              : `${refill.daysRemaining}d supply left`}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="py-4 text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-slate-400" /> {customer.visits} orders
                    </span>
                  </td>
                  <td className="py-4 text-slate-500">{customer.lastOrder}</td>
                  <td className="py-4 text-right">
                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Scroll3DSection>
    </Scroll3DPage>
  );
}
