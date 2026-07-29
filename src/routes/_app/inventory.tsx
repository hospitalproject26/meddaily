import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  Clock,
  Filter,
  CheckCircle,
  Pill,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/inventory")({
  component: InventoryPage,
});

interface StockItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  batch: string;
  expiry: string;
  stock: number;
  ptr: number;
  mrp: number;
  rack: string;
}

function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const [items] = useState<StockItem[]>([
    {
      id: "1",
      name: "Paracetamol 650mg (Dolo)",
      brand: "Micro Labs",
      category: "Tablet",
      batch: "DL2026",
      expiry: "12/27",
      stock: 450,
      ptr: 22.5,
      mrp: 30.0,
      rack: "A-12",
    },
    {
      id: "2",
      name: "Amoxicillin 500mg",
      brand: "Cipla",
      category: "Capsule",
      batch: "AMX991",
      expiry: "09/26",
      stock: 8, // Low Stock Alert
      ptr: 85.0,
      mrp: 110.0,
      rack: "B-04",
    },
    {
      id: "3",
      name: "Pantoprazole 40mg (Pan 40)",
      brand: "Alkem",
      category: "Tablet",
      batch: "PN4820",
      expiry: "08/26", // Near Expiry Alert
      stock: 120,
      ptr: 42.0,
      mrp: 55.0,
      rack: "A-05",
    },
    {
      id: "4",
      name: "Azithromycin 500mg",
      brand: "Zydus",
      category: "Tablet",
      batch: "AZ7731",
      expiry: "11/27",
      stock: 210,
      ptr: 95.0,
      mrp: 125.0,
      rack: "C-02",
    },
  ]);

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.batch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-panel rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl shadow-emerald-900/10 relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-200">
            <Package className="w-4 h-4" />
            <span>Stock & Batch Management</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Medicine Inventory</h1>
          <p className="text-xs text-emerald-100/80">
            Real-time batch tracking, stock alerts, and rack positioning
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => toast.info("Add new medicine drawer opening...")}
            className="px-4 py-2.5 rounded-2xl bg-white text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-md hover:bg-emerald-50 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medicine</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search medicine, batch, or brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>All Categories</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="glass-panel rounded-3xl bg-white p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3 pl-2">Medicine & Brand</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Batch No</th>
                <th className="pb-3">Expiry</th>
                <th className="pb-3">PTR / MRP</th>
                <th className="pb-3">Rack</th>
                <th className="pb-3 text-center">In Stock</th>
                <th className="pb-3 text-right pr-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredItems.map((item) => {
                const isLowStock = item.stock <= 10;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 pl-2">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[10px] text-slate-400">{item.brand}</div>
                    </td>
                    <td className="py-3 text-slate-500">{item.category}</td>
                    <td className="py-3 font-mono text-slate-600">{item.batch}</td>
                    <td className="py-3 text-slate-600">{item.expiry}</td>
                    <td className="py-3">
                      <span className="text-slate-500">₹{item.ptr}</span> /{" "}
                      <span className="font-bold text-slate-900">₹{item.mrp}</span>
                    </td>
                    <td className="py-3 font-bold text-emerald-700">{item.rack}</td>
                    <td className="py-3 text-center font-bold text-slate-900">
                      {item.stock}
                    </td>
                    <td className="py-3 text-right pr-2">
                      {isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-bold">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          In Stock
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

