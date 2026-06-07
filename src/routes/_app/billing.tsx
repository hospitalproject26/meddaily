import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Printer, Search, UserPlus, ScanLine, Loader2, FileDown, Share2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { scanPrescription } from "@/lib/billing.functions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_app/billing")({
  component: BillingPage,
});

const PHARMACY = {
  name: "Smart Pharmacy",
  address: "—",
  phone: "—",
  gstin: "",
};

type Unit = "strip" | "tablet" | "bottle" | "tube" | "injection" | "other";
type DiscMode = "percent" | "amount";

interface LineItem {
  inventory_id: string;
  medicine_name: string;
  batch_no: string | null;
  remaining_stock: number;
  pack_size: number;
  unit: Unit;
  available_units: Unit[];
  mrp_strip: number;
  mrp_tablet: number;
  ptr_strip: number;
  ptr_tablet: number;
  gst_percent: number;
  quantity: number;
  disc_mode: DiscMode;
  disc_value: number; // % or ₹ per line
}

function parseCustomerPrefix(input: string): { name: string; type: "Home Delivery" | "Ordinary" } {
  const t = input.trim();
  if (/^HM\s+/i.test(t)) return { name: t.replace(/^HM\s+/i, ""), type: "Home Delivery" };
  if (/^OD\s+/i.test(t)) return { name: t.replace(/^OD\s+/i, ""), type: "Ordinary" };
  return { name: t, type: "Ordinary" };
}

function unitRate(it: LineItem): number {
  return it.unit === "tablet" ? it.mrp_tablet : it.mrp_strip;
}
function unitCost(it: LineItem): number {
  return it.unit === "tablet" ? it.ptr_tablet : it.ptr_strip;
}
function lineSubtotal(it: LineItem) {
  return unitRate(it) * it.quantity;
}
function lineDiscount(it: LineItem) {
  const sub = lineSubtotal(it);
  if (it.disc_mode === "percent") return +(sub * (it.disc_value / 100)).toFixed(2);
  return Math.min(it.disc_value, sub);
}
function lineAfterDiscount(it: LineItem) {
  return lineSubtotal(it) - lineDiscount(it);
}
function lineGst(it: LineItem) {
  return +(lineAfterDiscount(it) * (it.gst_percent / 100)).toFixed(2);
}
function lineTotal(it: LineItem) {
  return +(lineAfterDiscount(it) + lineGst(it)).toFixed(2);
}

function availableUnitsFor(inv: any): Unit[] {
  const u = (inv.unit_type as Unit) || "strip";
  if (u === "strip") return ["strip", "tablet"];
  return [u];
}

function BillingPage() {
  const qc = useQueryClient();
  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [medSearch, setMedSearch] = useState("");
  const [custSearch, setCustSearch] = useState("");
  const [showQuickCust, setShowQuickCust] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [received, setReceived] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const fileRef = useRef<HTMLInputElement>(null);
  const scanFn = useServerFn(scanPrescription);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-search", custSearch],
    queryFn: async () => {
      let q = supabase.from("customers").select("*").order("customer_name").limit(15);
      if (custSearch) q = q.ilike("customer_name", `%${custSearch}%`);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: inv = [] } = useQuery({
    queryKey: ["inv-search", medSearch],
    queryFn: async () => {
      let q = supabase.from("inventory").select("*").gt("remaining_stock", 0).order("medicine_name").limit(20);
      if (medSearch) q = q.ilike("medicine_name", `%${medSearch}%`);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: pastOrders } = useQuery({
    queryKey: ["past-orders", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data } = await supabase.from("orders").select("id, date, total_amount").eq("customer_id", customerId).order("date", { ascending: false }).limit(5);
      return data ?? [];
    },
    enabled: !!customerId,
  });

  const pickCustomer = (c: any) => {
    setCustomerId(c.id);
    setCustomerName(c.customer_name);
    setMobile(c.phone_number || "");
    setAddress(c.address || "");
    setCustSearch("");
  };

  const buildLineItem = (m: any, overrides?: Partial<LineItem>): LineItem => {
    const units = availableUnitsFor(m);
    const unit: Unit = (overrides?.unit && units.includes(overrides.unit)) ? overrides.unit : units[0];
    return {
      inventory_id: m.id,
      medicine_name: m.medicine_name,
      batch_no: m.batch_no,
      remaining_stock: m.remaining_stock,
      pack_size: Number(m.pack_size) || 10,
      available_units: units,
      unit,
      mrp_strip: Number(m.mrp_per_strip) || 0,
      mrp_tablet: Number(m.mrp_per_tablet) || (Number(m.mrp_per_strip) / (Number(m.pack_size) || 10)),
      ptr_strip: Number(m.ptr_per_strip) || 0,
      ptr_tablet: Number(m.ptr_per_tablet) || (Number(m.ptr_per_strip) / (Number(m.pack_size) || 10)),
      gst_percent: Number(m.gst_percent) || 0,
      quantity: 1,
      disc_mode: "percent",
      disc_value: 0,
      ...overrides,
    };
  };

  const addItem = (m: any) => {
    if (items.some((i) => i.inventory_id === m.id)) {
      toast.error("Medicine already added");
      return;
    }
    setItems([...items, buildLineItem(m)]);
    setMedSearch("");
  };

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeItem = (idx: number) => setItems((arr) => arr.filter((_, i) => i !== idx));

  const handleScanFile = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) return toast.error("Image too large (max 8 MB)");
    setScanning(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve((r.result as string).split(",")[1] ?? "");
        r.onerror = () => reject(new Error("Failed to read file"));
        r.readAsDataURL(file);
      });
      const res = await scanFn({ data: { imageBase64: base64, mimeType: file.type || "image/jpeg" } });
      let added = 0;
      setItems((prev) => {
        const next = [...prev];
        for (const m of res.matched) {
          if (next.some((i) => i.inventory_id === m.inventory.id)) continue;
          const qty = Math.min(Math.max(1, m.quantity), m.inventory.remaining_stock);
          next.push(buildLineItem(m.inventory, { unit: m.unit as Unit, quantity: qty }));
          added++;
        }
        return next;
      });
      if (added) toast.success(`Added ${added} medicine${added > 1 ? "s" : ""} from scan`);
      else toast.warning("No matching medicines found in inventory");
      if (res.unmatched.length) toast.message("Not in inventory", { description: res.unmatched.join(", ") });
    } catch (e: any) {
      toast.error(e?.message || "Failed to scan");
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const totals = useMemo(() => {
    let sub = 0, disc = 0, gst = 0, total = 0, profit = 0;
    for (const it of items) {
      const s = lineSubtotal(it);
      const d = lineDiscount(it);
      const g = lineGst(it);
      const t = lineTotal(it);
      sub += s; disc += d; gst += g; total += t;
      profit += (lineAfterDiscount(it) - unitCost(it) * it.quantity);
    }
    const recv = Number(received) || 0;
    return {
      sub: +sub.toFixed(2),
      disc: +disc.toFixed(2),
      gst: +gst.toFixed(2),
      total: +total.toFixed(2),
      profit: +profit.toFixed(2),
      received: recv,
      balance: +(recv - total).toFixed(2),
    };
  }, [items, received]);

  const resetBill = () => {
    setItems([]); setCustomerName(""); setMobile(""); setAddress(""); setCustomerId(null);
    setReceived(""); setPaymentMethod("Cash");
  };

  const validate = (): string | null => {
    if (!items.length) return "Add at least one item";
    if (!customerName.trim()) return "Customer name required";
    for (const it of items) {
      if (!it.medicine_name) return "Empty medicine name";
      if (it.quantity <= 0) return `${it.medicine_name}: quantity must be > 0`;
      const stockInUnits = it.unit === "tablet" ? it.remaining_stock * it.pack_size : it.remaining_stock;
      if (it.quantity > stockInUnits) return `${it.medicine_name}: only ${stockInUnits} ${it.unit}s available`;
      if (it.disc_mode === "percent" && (it.disc_value < 0 || it.disc_value > 100)) return `${it.medicine_name}: invalid discount %`;
      if (it.disc_mode === "amount" && it.disc_value < 0) return `${it.medicine_name}: invalid discount`;
    }
    return null;
  };

  const generateBill = async () => {
    const err = validate();
    if (err) return toast.error(err);

    setSubmitting(true);
    try {
      const parsed = parseCustomerPrefix(customerName);
      let finalCustomerId = customerId;
      if (!finalCustomerId && parsed.name) {
        const { data: newCust } = await supabase
          .from("customers")
          .insert({ customer_name: parsed.name, customer_type: parsed.type, phone_number: mobile || null, address: address || null })
          .select("id").single();
        if (newCust) finalCustomerId = newCust.id;
      }

      const { data: order, error: oErr } = await supabase.from("orders").insert({
        customer_name: parsed.name,
        mobile_number: mobile || null,
        address: address || null,
        total_rate: totals.sub,
        total_discount: totals.disc,
        total_amount: totals.total,
        total_profit: totals.profit,
        gst_amount: totals.gst,
        received_amount: totals.received,
        payment_method: paymentMethod,
        customer_id: finalCustomerId,
      }).select().single();
      if (oErr) throw oErr;

      const rows = items.map((it) => {
        const after = lineAfterDiscount(it);
        return {
          order_id: order.id,
          inventory_id: it.inventory_id,
          medicine_name: it.medicine_name,
          batch_no: it.batch_no,
          unit_type: it.unit,
          quantity_sold: it.quantity,
          mrp: unitRate(it),
          discount_per_medicine: it.disc_mode === "percent" ? +(unitRate(it) * it.disc_value / 100).toFixed(4) : +(it.disc_value / it.quantity).toFixed(4),
          discount_amount: lineDiscount(it),
          gst_percent: it.gst_percent,
          gst_amount: lineGst(it),
          final_item_total: lineTotal(it),
        };
      });
      const { error: iErr } = await supabase.from("order_items").insert(rows);
      if (iErr) throw iErr;

      toast.success(`Bill ${order.invoice_number} generated. Stock updated.`);
      setReceipt({ order, items: items.map((i) => ({ ...i })), totals });
      qc.invalidateQueries();
      resetBill();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate bill");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Billing</h1>
        <p className="text-sm text-muted-foreground">Create a new bill. Stock deducts automatically on submit.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search existing customer…" className="pl-9" value={custSearch} onChange={(e) => setCustSearch(e.target.value)} />
              {custSearch && customers.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                  {customers.map((c) => (
                    <button key={c.id} type="button" onClick={() => pickCustomer(c)} className="w-full text-left px-3 py-2 hover:bg-accent text-sm">
                      <div className="font-medium">{c.customer_name} <span className="text-xs text-muted-foreground">· {c.customer_type}</span></div>
                      <div className="text-xs text-muted-foreground">{c.phone_number || "no phone"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Customer name <span className="text-muted-foreground">(prefix "HM " / "OD ")</span></Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. HM Ravi Kumar" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mobile</Label>
                <Input value={mobile} onChange={(e) => setMobile(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
            <QuickAddCustomer open={showQuickCust} onOpenChange={setShowQuickCust} onAdded={(c) => pickCustomer(c)} />
            <Button type="button" variant="outline" size="sm" onClick={() => setShowQuickCust(true)}>
              <UserPlus className="h-4 w-4 mr-2" />Quick add customer
            </Button>
            {pastOrders && pastOrders.length > 0 && (
              <div className="rounded-md bg-muted/40 p-3 text-xs">
                <div className="font-semibold mb-1">Past orders</div>
                <ul className="space-y-0.5 text-muted-foreground">
                  {pastOrders.map((o) => (
                    <li key={o.id}>{new Date(o.date).toLocaleDateString()} — ₹{Number(o.total_amount).toFixed(2)}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Bill Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Subtotal" value={`₹${totals.sub.toFixed(2)}`} />
            <Row label="Discount" value={`− ₹${totals.disc.toFixed(2)}`} />
            <Row label="GST" value={`+ ₹${totals.gst.toFixed(2)}`} />
            <div className="h-px bg-border my-2" />
            <Row label="Grand Total" value={`₹${totals.total.toFixed(2)}`} bold />
            <div className="space-y-1.5 pt-2">
              <Label className="text-xs">Payment method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Credit">Credit (pay later)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Received</Label>
              <Input type="number" value={received} onChange={(e) => setReceived(e.target.value)} placeholder="0.00" />
            </div>
            <Row label="Balance return" value={`₹${totals.balance.toFixed(2)}`} />
            <Row label="Profit" value={`₹${totals.profit.toFixed(2)}`} />
            <Button onClick={generateBill} disabled={submitting || !items.length} className="w-full mt-3">
              {submitting ? "Saving…" : "Generate Bill"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Add Medicines</CardTitle>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScanFile(f); }}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={scanning}>
              {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ScanLine className="h-4 w-4 mr-2" />}
              {scanning ? "Reading…" : "Scan Prescription / Medicine"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search medicine by name…" className="pl-9" value={medSearch} onChange={(e) => setMedSearch(e.target.value)} />
            {medSearch && inv.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-72 overflow-auto">
                {inv.map((m: any) => (
                  <button key={m.id} type="button" onClick={() => addItem(m)} className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0">
                    <div className="flex justify-between gap-2">
                      <div>
                        <div className="font-medium">{m.medicine_name}</div>
                        <div className="text-xs text-muted-foreground">Batch {m.batch_no || "—"} · Pack {m.pack_size} · Exp {m.expiry_date || "—"}</div>
                      </div>
                      <div className="text-xs text-right">
                        <div className="font-semibold">Stock: {m.remaining_stock}</div>
                        <div className="text-muted-foreground">₹{Number(m.mrp_per_strip).toFixed(2)}/strip · ₹{Number(m.mrp_per_tablet).toFixed(2)}/tab</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No items added yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 pr-2">Medicine</th>
                    <th className="text-left py-2 px-2">Batch</th>
                    <th className="text-left py-2 px-2">Unit</th>
                    <th className="text-right py-2 px-2">Qty</th>
                    <th className="text-right py-2 px-2">MRP</th>
                    <th className="text-center py-2 px-2">Disc</th>
                    <th className="text-right py-2 px-2">Disc ₹</th>
                    <th className="text-right py-2 px-2">After</th>
                    <th className="text-right py-2 px-2">GST%</th>
                    <th className="text-right py-2 px-2">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const maxQty = it.unit === "tablet" ? it.remaining_stock * it.pack_size : it.remaining_stock;
                    return (
                      <tr key={it.inventory_id} className="border-b last:border-b-0 align-top">
                        <td className="py-2 pr-2">
                          <div className="font-medium">{it.medicine_name}</div>
                          <div className="text-[10px] text-muted-foreground">Stock {it.remaining_stock} strips · Pack {it.pack_size}</div>
                        </td>
                        <td className="px-2 pt-2">{it.batch_no || "—"}</td>
                        <td className="px-2">
                          <Select value={it.unit} onValueChange={(v) => updateItem(idx, { unit: v as Unit })}>
                            <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {it.available_units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 text-right">
                          <Input type="number" min={1} max={maxQty} className="h-8 w-20 text-right" value={it.quantity}
                            onChange={(e) => updateItem(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })} />
                        </td>
                        <td className="px-2 text-right pt-3">₹{unitRate(it).toFixed(2)}</td>
                        <td className="px-2">
                          <div className="flex gap-1 items-center">
                            <Input type="number" min={0} className="h-8 w-16 text-right" value={it.disc_value}
                              onChange={(e) => updateItem(idx, { disc_value: Math.max(0, Number(e.target.value) || 0) })} />
                            <Select value={it.disc_mode} onValueChange={(v) => updateItem(idx, { disc_mode: v as DiscMode })}>
                              <SelectTrigger className="h-8 w-14 px-2"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percent">%</SelectItem>
                                <SelectItem value="amount">₹</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </td>
                        <td className="px-2 text-right pt-3">₹{lineDiscount(it).toFixed(2)}</td>
                        <td className="px-2 text-right pt-3">₹{lineAfterDiscount(it).toFixed(2)}</td>
                        <td className="px-2 text-right">
                          <Input type="number" min={0} max={100} className="h-8 w-16 text-right" value={it.gst_percent}
                            onChange={(e) => updateItem(idx, { gst_percent: Math.max(0, Number(e.target.value) || 0) })} />
                        </td>
                        <td className="px-2 text-right font-semibold pt-3">₹{lineTotal(it).toFixed(2)}</td>
                        <td className="pl-2 pt-2"><Button size="icon" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-danger" /></Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-lg font-bold" : ""}`}>
      <span className="text-muted-foreground">{label}</span><span>{value}</span>
    </div>
  );
}

function QuickAddCustomer({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (v: boolean) => void; onAdded: (c: any) => void }) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [addr, setAddr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseCustomerPrefix(name);
    const { data, error } = await supabase.from("customers").insert({
      customer_name: parsed.name, customer_type: parsed.type, phone_number: phone || null, address: addr || null,
    }).select().single();
    if (error) return toast.error(error.message);
    toast.success("Customer added");
    onAdded(data); onOpenChange(false); setName(""); setPhone(""); setAddr("");
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Quick add customer</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label className="text-xs">Name (HM/OD prefix supported)</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label className="text-xs">Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><Label className="text-xs">Address</Label><Input value={addr} onChange={(e) => setAddr(e.target.value)} /></div>
          <DialogFooter><Button type="submit">Save</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function buildBillText(r: any): string {
  const lines = [
    `*${PHARMACY.name}*`,
    `Invoice: ${r.order.invoice_number}`,
    `Date: ${new Date(r.order.date).toLocaleString()}`,
    `Customer: ${r.order.customer_name}${r.order.mobile_number ? ` (${r.order.mobile_number})` : ""}`,
    ``,
    ...r.items.map((it: LineItem) => `${it.medicine_name} × ${it.quantity} ${it.unit} = ₹${lineTotal(it).toFixed(2)}`),
    ``,
    `Subtotal: ₹${r.totals.sub.toFixed(2)}`,
    `Discount: ₹${r.totals.disc.toFixed(2)}`,
    `GST: ₹${r.totals.gst.toFixed(2)}`,
    `*Grand Total: ₹${r.totals.total.toFixed(2)}*`,
  ];
  return lines.join("\n");
}

function downloadPdf(r: any) {
  const doc = new jsPDF();
  doc.setFontSize(16); doc.text(PHARMACY.name, 14, 18);
  doc.setFontSize(9);
  doc.text(`${PHARMACY.address} · ${PHARMACY.phone}`, 14, 24);
  if (PHARMACY.gstin) doc.text(`GSTIN: ${PHARMACY.gstin}`, 14, 29);
  doc.setFontSize(11);
  doc.text(`Invoice: ${r.order.invoice_number}`, 14, 40);
  doc.text(`Date: ${new Date(r.order.date).toLocaleString()}`, 120, 40);
  doc.text(`Customer: ${r.order.customer_name}`, 14, 47);
  if (r.order.mobile_number) doc.text(`Mob: ${r.order.mobile_number}`, 120, 47);
  autoTable(doc, {
    startY: 55,
    head: [["Medicine", "Batch", "Unit", "Qty", "MRP", "Disc", "GST", "Total"]],
    body: r.items.map((it: LineItem) => [
      it.medicine_name, it.batch_no || "—", it.unit, it.quantity,
      `₹${unitRate(it).toFixed(2)}`, `₹${lineDiscount(it).toFixed(2)}`,
      `₹${lineGst(it).toFixed(2)}`, `₹${lineTotal(it).toFixed(2)}`,
    ]),
    styles: { fontSize: 9 },
  });
  const y = (doc as any).lastAutoTable.finalY + 8;
  doc.text(`Subtotal:  ₹${r.totals.sub.toFixed(2)}`, 130, y);
  doc.text(`Discount: − ₹${r.totals.disc.toFixed(2)}`, 130, y + 6);
  doc.text(`GST:      + ₹${r.totals.gst.toFixed(2)}`, 130, y + 12);
  doc.setFontSize(13);
  doc.text(`Grand:    ₹${r.totals.total.toFixed(2)}`, 130, y + 20);
  doc.save(`${r.order.invoice_number}.pdf`);
}

function ReceiptModal({ receipt, onClose }: { receipt: any; onClose: () => void }) {
  if (!receipt) return null;
  const sharePayload = () => buildBillText(receipt);

  const onWhatsapp = () => {
    const text = encodeURIComponent(sharePayload());
    const phone = (receipt.order.mobile_number || "").replace(/\D/g, "");
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  };
  const onShare = async () => {
    const text = sharePayload();
    if (navigator.share) { try { await navigator.share({ title: "Bill", text }); } catch {} }
    else { await navigator.clipboard.writeText(text); toast.success("Bill copied to clipboard"); }
  };

  return (
    <Dialog open={!!receipt} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md print:shadow-none">
        <DialogHeader><DialogTitle>Receipt</DialogTitle></DialogHeader>
        <div id="receipt-body" className="space-y-3 text-sm print:text-xs">
          <div className="text-center border-b pb-3">
            <div className="font-bold text-lg">{PHARMACY.name}</div>
            <div className="text-xs text-muted-foreground">{PHARMACY.address} · {PHARMACY.phone}</div>
            {PHARMACY.gstin && <div className="text-xs">GSTIN: {PHARMACY.gstin}</div>}
            <div className="text-xs mt-1">Invoice <b>{receipt.order.invoice_number}</b> · {new Date(receipt.order.date).toLocaleString()}</div>
          </div>
          <div>
            <div className="font-semibold">{receipt.order.customer_name}</div>
            <div className="text-xs text-muted-foreground">{receipt.order.mobile_number} {receipt.order.address && `· ${receipt.order.address}`}</div>
          </div>
          <table className="w-full text-xs">
            <thead className="border-b"><tr><th className="text-left py-1">Item</th><th className="text-right">Qty</th><th className="text-right">MRP</th><th className="text-right">Disc</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {receipt.items.map((it: LineItem, i: number) => (
                <tr key={i} className="border-b last:border-b-0">
                  <td className="py-1">{it.medicine_name} <span className="text-muted-foreground">({it.unit})</span></td>
                  <td className="text-right">{it.quantity}</td>
                  <td className="text-right">₹{unitRate(it).toFixed(2)}</td>
                  <td className="text-right">₹{lineDiscount(it).toFixed(2)}</td>
                  <td className="text-right">₹{lineTotal(it).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-1 pt-2 border-t">
            <Row label="Subtotal" value={`₹${receipt.totals.sub.toFixed(2)}`} />
            <Row label="Discount" value={`− ₹${receipt.totals.disc.toFixed(2)}`} />
            <Row label="GST" value={`+ ₹${receipt.totals.gst.toFixed(2)}`} />
            <Row label="Grand Total" value={`₹${receipt.totals.total.toFixed(2)}`} bold />
            {receipt.totals.received > 0 && <>
              <Row label={`Received (${receipt.order.payment_method})`} value={`₹${receipt.totals.received.toFixed(2)}`} />
              <Row label="Balance" value={`₹${receipt.totals.balance.toFixed(2)}`} />
            </>}
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
          <Button variant="outline" size="sm" onClick={() => downloadPdf(receipt)}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
          <Button variant="outline" size="sm" onClick={onShare}><Share2 className="h-4 w-4 mr-1" />Share</Button>
          <Button size="sm" onClick={onWhatsapp}><MessageCircle className="h-4 w-4 mr-1" />WhatsApp</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
