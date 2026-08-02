import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Truck, Plus, Calendar, Search, FileText, Eye, Download } from "lucide-react";
import { toast } from "sonner";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { Scroll3DPage, Scroll3DSection } from "@/components/scroll-3d";

export const Route = createFileRoute("/_app/purchases")({
  component: PurchasesPage,
});

const mockPurchases = [
  {
    id: "PO-2026-901",
    vendor: "Apollo Pharma Dist.",
    date: "2026-07-25",
    items: 12,
    total: 15400.0,
    status: "Received",
    medicines: [
      { name: "Paracetamol 650mg (Dolo)", qty: 200, price: 22.5 },
      { name: "Amoxicillin 500mg", qty: 120, price: 85.0 },
    ],
  },
  {
    id: "PO-2026-902",
    vendor: "Wellness Wholesale",
    date: "2026-07-27",
    items: 8,
    total: 8200.0,
    status: "Pending",
    medicines: [{ name: "Cetirizine 10mg", qty: 150, price: 54.67 }],
  },
];

function handleDownloadPurchasePdf(po: (typeof mockPurchases)[number]) {
  generateInvoicePdf(
    {
      invoiceId: po.id,
      customer: po.vendor,
      date: po.date,
      items: po.medicines,
      total: po.total,
      status: po.status,
    },
    "PURCHASE"
  );
  toast.success(`Downloading ${po.id}.pdf`);
}

function PurchasesPage() {
  return (
    <Scroll3DPage className="space-y-6">
      {/* Header Banner */}
      <Scroll3DSection className="p-6 glass-panel rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-900/10">
        <div className="flex items-center gap-2 text-emerald-100 text-xs font-bold mb-1">
          <Truck className="w-4 h-4" />
          <span>Stock Procurement</span>
        </div>
        <h1 className="text-2xl font-black">Purchase Orders</h1>
      </Scroll3DSection>

      {/* Action Bar */}
      <Scroll3DSection className="flex gap-4" delay={0.05}>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search orders..." className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-2xl" />
        </div>
        <button className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" /> New Order
        </button>
      </Scroll3DSection>

      {/* Table */}
      <Scroll3DSection className="glass-panel rounded-3xl bg-white p-5 border border-slate-200/80" delay={0.1}>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-400 font-bold border-b border-slate-100">
              <th className="pb-3 pl-2">Order ID</th>
              <th className="pb-3">Vendor</th>
              <th className="pb-3">Date</th>
              <th className="pb-3">Items</th>
              <th className="pb-3">Total Amount</th>
              <th className="pb-3">Status</th>
              <th className="pb-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockPurchases.map((po) => (
              <tr key={po.id} className="hover:bg-slate-50">
                <td className="py-4 pl-2 font-bold text-slate-900">{po.id}</td>
                <td className="py-4 font-medium text-emerald-600">{po.vendor}</td>
                <td className="py-4 text-slate-500">{po.date}</td>
                <td className="py-4 text-slate-500">{po.items}</td>
                <td className="py-4 font-bold text-slate-900">₹{po.total.toFixed(2)}</td>
                <td className="py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${po.status === 'Received' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {po.status}
                  </span>
                </td>
                <td className="py-4 text-right flex items-center justify-end gap-1">
                  <button title="Review Bill" className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><Eye className="w-4 h-4" /></button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPurchasePdf(po)}
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
