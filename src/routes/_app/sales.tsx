import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart, Search, Calendar, Filter, Eye, Download, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { Scroll3DPage, Scroll3DSection } from "@/components/scroll-3d";

export const Route = createFileRoute("/_app/sales")({
  component: SalesPage,
});

const mockSales = [
  {
    id: "INV-2026-001",
    customer: "Rahul Sharma",
    date: "2026-07-29",
    items: 3,
    total: 450.0,
    status: "Paid",
    medicines: [
      { name: "Paracetamol 650mg (Dolo)", qty: 2, price: 30.0 },
      { name: "Amoxicillin 500mg", qty: 1, price: 110.0 },
    ],
  },
  {
    id: "INV-2026-002",
    customer: "Anita Desai",
    date: "2026-07-28",
    items: 1,
    total: 125.5,
    status: "Paid",
    medicines: [{ name: "Cetirizine 10mg", qty: 1, price: 125.5 }],
  },
  {
    id: "INV-2026-003",
    customer: "Vijay Patil",
    date: "2026-07-28",
    items: 5,
    total: 1250.0,
    status: "Pending",
    medicines: [
      { name: "Metformin 500mg", qty: 2, price: 90.0 },
      { name: "Atorvastatin 10mg", qty: 3, price: 356.67 },
    ],
  },
];

function medicineSummary(medicines: { name: string }[]) {
  if (medicines.length === 0) return "-";
  if (medicines.length === 1) return medicines[0].name;
  return `${medicines[0].name} +${medicines.length - 1} more`;
}

function handleDownloadSalePdf(sale: (typeof mockSales)[number]) {
  generateInvoicePdf(
    {
      invoiceId: sale.id,
      customer: sale.customer,
      date: sale.date,
      items: sale.medicines,
      total: sale.total,
      status: sale.status,
    },
    "SALE"
  );
  toast.success(`Downloading ${sale.id}.pdf`);
}

function SalesPage() {
  return (
    <Scroll3DPage className="space-y-6">
      {/* Header Banner */}
      <Scroll3DSection className="p-6 glass-panel rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-900/10">
        <div className="flex items-center gap-2 text-emerald-100 text-xs font-bold mb-1">
          <ShoppingCart className="w-4 h-4" />
          <span>Transaction Records</span>
        </div>
        <h1 className="text-2xl font-black">Sales History</h1>
      </Scroll3DSection>

      {/* Controls */}
      <Scroll3DSection className="flex gap-4" delay={0.05}>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by Invoice ID or Customer..." className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-2xl" />
        </div>
        <button className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 text-xs font-bold flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" /> Date Range
        </button>
      </Scroll3DSection>

      {/* Table */}
      <Scroll3DSection className="glass-panel rounded-3xl bg-white p-5 border border-slate-200/80" delay={0.1}>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-400 font-bold border-b border-slate-100">
              <th className="pb-3 pl-2">Invoice ID</th>
              <th className="pb-3">Customer</th>
              <th className="pb-3">Medicine Name</th>
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
                <td className="py-4 text-slate-500">{medicineSummary(sale.medicines)}</td>
                <td className="py-4 text-slate-500">{sale.date}</td>
                <td className="py-4 text-slate-500">{sale.items}</td>
                <td className="py-4 font-bold text-slate-900">₹{sale.total.toFixed(2)}</td>
                <td className="py-4 text-right flex items-center justify-end gap-1">
                  <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><Eye className="w-4 h-4" /></button>
                  <button
                    type="button"
                    onClick={() => handleDownloadSalePdf(sale)}
                    title="Download PDF"
                    className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Scroll3DSection>
    </Scroll3DPage>
  );
}
