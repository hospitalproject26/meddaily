import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Receipt,
  Search,
  Trash2,
  Printer,
  UserCheck,
  Calculator,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Scroll3DPage, Scroll3DSection } from "@/components/scroll-3d";

export const Route = createFileRoute("/_app/billing")({
  component: BillingPage,
});

// Pharmacy Drug License Certificate (DLC) number, printed on every receipt.
// Update this if the license number changes.
const PHARMACY_DLC_NUMBER = "DL-20B/21B-000000";

interface CartItem {
  id: string;
  name: string;
  batch: string;
  expiry: string;
  qty: number;
  mrp: number;
  ptr: number;
  gstPct: number;
  discountPct: number;
}

function BillingPage() {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi" | "card">("upi");

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([
    {
      id: "1",
      name: "Paracetamol 650mg (Dolo)",
      batch: "DL2026",
      expiry: "12/27",
      qty: 2,
      mrp: 30.0,
      ptr: 22.5,
      gstPct: 12,
      discountPct: 5,
    },
    {
      id: "2",
      name: "Amoxicillin 500mg",
      batch: "AMX991",
      expiry: "09/26",
      qty: 1,
      mrp: 110.0,
      ptr: 85.0,
      gstPct: 12,
      discountPct: 10,
    },
  ]);

  const updateQty = (id: string, newQty: number) => {
    if (newQty < 1) return;
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, qty: newQty } : item))
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    toast.info("Item removed from bill");
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => {
    const discountedPrice = item.mrp * (1 - item.discountPct / 100);
    return acc + discountedPrice * item.qty;
  }, 0);

  const gstTotal = cart.reduce((acc, item) => {
    const discountedPrice = item.mrp * (1 - item.discountPct / 100);
    return acc + (discountedPrice * item.qty * item.gstPct) / 100;
  }, 0);

  const grandTotal = Math.round(subtotal + gstTotal);

  // 1. Thermal Printing Trigger
  const handleThermalPrint = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty!");
      return;
    }
    window.print();
  };

  // 2. WhatsApp Sharing Trigger
  const handleWhatsAppShare = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty!");
      return;
    }

    const itemsText = cart
      .map(
        (i) =>
          `• ${i.name} (Qty: ${i.qty}) - ₹${(i.mrp * i.qty).toFixed(2)}`
      )
      .join("%0a");

    const message = `*SRH Medical Invoice*%0a%0a*Customer:* ${
      customerName || "Valued Customer"
    }%0a*Doctor:* ${doctorName || "N/A"}%0a%0a*Items Purchased:*%0a${itemsText}%0a%0a*Subtotal:* ₹${subtotal.toFixed(
      2
    )}%0a*GST Tax:* ₹${gstTotal.toFixed(
      2
    )}%0a*Grand Total:* ₹${grandTotal}%0a*Payment Mode:* ${paymentMode.toUpperCase()}%0a%0aThank you for visiting SRH Medical!`;

    const cleanPhone = customerPhone.replace(/[^0-9]/g, "");
    const waUrl = cleanPhone
      ? `https://wa.me/91${cleanPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(waUrl, "_blank");
    toast.success("Opening WhatsApp...");
  };

  return (
    <Scroll3DPage className="space-y-6">
      {/* ========================================== */}
      {/* 1. SCREEN VIEW (Visible on web app)      */}
      {/* ========================================== */}
      <div className="print:hidden space-y-6">
        {/* Header Banner */}
        <Scroll3DSection className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-panel rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-200">
              <Receipt className="w-4 h-4" />
              <span>POS Billing Terminal</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">Express Counter</h1>
            <p className="text-xs text-emerald-100/80">
              Fast GST tax invoice generation, Thermal Printing & WhatsApp sharing
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <button
              type="button"
              onClick={handleThermalPrint}
              className="px-4 py-2.5 rounded-2xl bg-white text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-md hover:bg-emerald-50 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
          </div>
        </Scroll3DSection>

        <Scroll3DSection className="grid grid-cols-1 lg:grid-cols-3 gap-6" delay={0.05}>
          {/* Left Column: Search & Medicine Table */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-4 rounded-3xl bg-white shadow-sm border border-slate-200/80">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search medicine by name, brand, or barcode..."
                  className="w-full pl-12 pr-4 py-3 text-sm font-medium bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="glass-panel rounded-3xl bg-white p-5 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  Prescription Items ({cart.length})
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 pl-2">Item</th>
                      <th className="pb-3">Batch</th>
                      <th className="pb-3">Exp</th>
                      <th className="pb-3">MRP (₹)</th>
                      <th className="pb-3 text-center">Qty</th>
                      <th className="pb-3 text-right">Total (₹)</th>
                      <th className="pb-3 text-right pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {cart.map((item) => {
                      const discountedPrice =
                        item.mrp * (1 - item.discountPct / 100);
                      const itemTotal = (
                        discountedPrice * item.qty
                      ).toFixed(2);

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-3 pl-2 font-bold text-slate-900">
                            {item.name}
                          </td>
                          <td className="py-3 text-slate-500">{item.batch}</td>
                          <td className="py-3 text-slate-500">{item.expiry}</td>
                          <td className="py-3">₹{item.mrp.toFixed(2)}</td>
                          <td className="py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => updateQty(item.id, item.qty - 1)}
                                className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                              >
                                -
                              </button>
                              <span className="font-bold w-4 text-center">
                                {item.qty}
                              </span>
                              <button
                                onClick={() => updateQty(item.id, item.qty + 1)}
                                className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-3 text-right font-bold text-slate-900">
                            ₹{itemTotal}
                          </td>
                          <td className="py-3 text-right pr-2">
                            <button
                              onClick={() => removeItem(item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Checkout & Actions */}
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                Customer & Checkout
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Mobile Number (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Doctor Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Dr. Patil"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-600">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["upi", "cash", "card"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all uppercase ${
                        paymentMode === mode
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bill Totals */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-700">
                    ₹{subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>GST (Tax)</span>
                  <span className="font-bold text-slate-700">
                    ₹{gstTotal.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-black text-slate-900">
                  <span>Grand Total</span>
                  <span className="text-base text-emerald-600">
                    ₹{grandTotal}
                  </span>
                </div>
              </div>

              {/* Dual Action Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleThermalPrint}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Thermal Receipt (80mm)</span>
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="w-full py-2.5 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs border border-teal-200 flex items-center justify-center gap-2 transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send Bill on WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </Scroll3DSection>
      </div>

      {/* ========================================== */}
      {/* 2. THERMAL PRINT RECEIPT (Only when printing) */}
      {/* ========================================== */}
      <div className="hidden print:block w-[80mm] font-mono text-[11px] leading-tight text-black p-2 bg-white">
        <div className="text-center font-bold text-sm uppercase border-b border-black pb-2 mb-2">
          <div>SRH MEDICAL</div>
          <div className="text-[9px] font-normal">Pharmacy & Wellness Store</div>
          <div className="text-[9px] font-normal">GSTIN: 27AAAAA0000A1Z5</div>
          <div className="text-[9px] font-normal">DL No: {PHARMACY_DLC_NUMBER}</div>
        </div>

        <div className="mb-2 space-y-0.5 text-[10px]">
          <div>Date: {new Date().toLocaleDateString()}</div>
          <div>Customer: {customerName || "Walk-in Patient"}</div>
          {customerPhone && <div>Phone: {customerPhone}</div>}
          {doctorName && <div>Doctor: {doctorName}</div>}
        </div>

        <div className="border-t border-b border-black py-1 my-1">
          <div className="grid grid-cols-12 font-bold text-[10px]">
            <span className="col-span-6">Item</span>
            <span className="col-span-2 text-center">Qty</span>
            <span className="col-span-4 text-right">Amount</span>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {cart.map((item) => {
            const discountedPrice = item.mrp * (1 - item.discountPct / 100);
            return (
              <div key={item.id} className="py-1">
                <div className="font-bold text-[10px]">{item.name}</div>
                <div className="grid grid-cols-12 text-[9px] text-gray-700">
                  <span className="col-span-6">
                    B:{item.batch} Exp:{item.expiry}
                  </span>
                  <span className="col-span-2 text-center">{item.qty}</span>
                  <span className="col-span-4 text-right">
                    ₹{(discountedPrice * item.qty).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-black pt-2 mt-2 space-y-1 text-[10px]">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>GST Tax:</span>
            <span>₹{gstTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-[12px] border-t border-black pt-1">
            <span>TOTAL:</span>
            <span>₹{grandTotal}</span>
          </div>
          <div className="text-center font-bold mt-1 text-[9px]">
            Paid via: {paymentMode.toUpperCase()}
          </div>
        </div>

        <div className="text-center mt-4 pt-2 border-t border-dashed border-black text-[9px]">
          Thank you! Get well soon.
        </div>
      </div>
    </Scroll3DPage>
  );
}

