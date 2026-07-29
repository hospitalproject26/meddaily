import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart, Search, Calendar, Filter, Eye, Download, MoreVertical } from "lucide-react";

export const Route = createFileRoute("/_app/sales")({
  component: SalesPage,
});

const mockSales = [
  { id: "INV-2026-001", customer: "Rahul Sharma", date: "2026-07-29", items: 3, total: 450.00, status: "Paid" },
  { id: "INV-2026-002", customer: "Anita Desai", date: "2026-07-28", items: 1, total: 125.50, status: "Paid" },
  { id: "INV-2026-003", customer: "Vijay Patil", date: "2026-07-28", items: 5, total: 1250.00, status: "Pending" },
];

function SalesPage() {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 glass-panel rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-900/10">
        <div className="flex items-center gap-2 text-emerald-100 text-xs font-bold mb-1">
          <ShoppingCart className="w-4 h-4" />
          <span>Transaction Records</span>
        </div>
        <h1 className="text-2xl font-black">Sales History</h1>
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by Invoice ID or Customer..." className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-2xl" />
        </div>
        <button className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 text-xs font-bold flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" /> Date Range
        </button>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-3xl bg-white p-5 border border-slate-200/80">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-400 font-bold border-b border-slate-100">
              <th className="pb-3 pl-2">Invoice ID</th>
              <th className="pb-3">Customer</th>
              <th className="pb-3">Date</th>
              <th className="pb-3">Items</th>
              <th className="pb-3">Total</th>
              <th className="pb-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockSales.map((sale) => (
              <tr key={sale.id} className="hover:bg-slate-50">
                <td className="py-4 pl-2 font-bold text-emerald-600">{sale.id}</td>
                <td className="py-4 font-medium text-slate-700">{sale.customer}</td>
                <td className="py-4 text-slate-500">{sale.date}</td>
                <td className="py-4 text-slate-500">{sale.items}</td>
                <td className="py-4 font-bold text-slate-900">₹{sale.total.toFixed(2)}</td>
                <td className="py-4 text-right">
                  <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><Eye className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
