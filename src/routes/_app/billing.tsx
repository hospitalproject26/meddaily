import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Printer, Search, UserPlus, ScanLine, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { scanPrescription } from "@/lib/billing.functions";
import { useRef } from "react";

export const Route = createFileRoute("/_app/billing")({
  component: BillingPage,
});

type Unit = "strip" | "tablet";

interface LineItem {
  inventory_id: string;
  medicine_name: string;
  batch_no: string | null;
  remaining_stock: number;
  unit: Unit;
  mrp: number;
  ptr: number;
  quantity: number;
  discount: number;
}

function parseCustomerPrefix(input: string): { name: string; type: "Home Delivery" | "Ordinary" } {
  const t = input.trim();
  if (/^HM\s+/i.test(t)) return { name: t.replace(/^HM\s+/i, ""), type: "Home Delivery" };
  if (/^OD\s+/i.test(t)) return { name: t.replace(/^OD\s+/i, ""), type: "Ordinary" };
  return { name: t, type: "Ordinary" };
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

  const addItem = (m: any) => {
    if (items.some((i) => i.inventory_id === m.id)) {
      toast.error("Medicine already added");
      return;
    }
    setItems([...items, {
      inventory_id: m.id,
      medicine_name: m.medicine_name,
      batch_no: m.batch_no,
      remaining_stock: m.remaining_stock,
      unit: "strip",
      mrp: Number(m.mrp_per_strip),
      ptr: Number(m.ptr_per_strip),
      quantity: 1,
      discount: 0,
    }]);
    setMedSearch("");
  };

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setItems((arr) => arr.map((it, i) => {
      if (i !== idx) return it;
      const next = { ...it, ...patch };
      if (patch.unit) {
        const src = inv.find((x: any) => x.id === it.inventory_id);
        if (src) {
          next.mrp = Number(patch.unit === "strip" ? src.mrp_per_strip : src.mrp_per_tablet);
          next.ptr = Number(patch.unit === "strip" ? src.ptr_per_strip : src.ptr_per_tablet);
        }
      }
      return next;
    }));
  };

  const removeItem = (idx: number) => setItems((arr) => arr.filter((_, i) => i !== idx));

  const handleScanFile = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) return toast.error("Image too large (max 8 MB)");
    setScanning(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          const result = r.result as string;
          resolve(result.split(",")[1] ?? "");
        };
        r.onerror = () => reject(new Error("Failed to read file"));
        r.readAsDataURL(file);
      });
      const res = await scanFn({ data: { imageBase64: base64, mimeType: file.type || "image/jpeg" } });
      let added = 0;
      setItems((prev) => {
        const next = [...prev];
        for (const m of res.matched) {
          if (next.some((i) => i.inventory_id === m.inventory.id)) continue;
          const inv = m.inventory;
          const qty = Math.min(Math.max(1, m.quantity), inv.remaining_stock);
          next.push({
            inventory_id: inv.id,
            medicine_name: inv.medicine_name,
            batch_no: inv.batch_no,
            remaining_stock: inv.remaining_stock,
            unit: m.unit,
            mrp: Number(m.unit === "strip" ? inv.mrp_per_strip : inv.mrp_per_tablet),
            ptr: Number(m.unit === "strip" ? inv.ptr_per_strip : inv.ptr_per_tablet),
            quantity: qty,
            discount: 0,
          });
          added++;
        }
        return next;
      });
      if (added) toast.success(`Added ${added} medicine${added > 1 ? "s" : ""} from prescription`);
      else toast.warning("No matching medicines found in inventory");
      if (res.unmatched.length) {
        toast.message("Not found in inventory", { description: res.unmatched.join(", ") });
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to scan prescription");
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const totals = useMemo(() => {
    let rate = 0, disc = 0, profit = 0;
    for (const it of items) {
      const lineRate = it.mrp * it.quantity;
      const lineDisc = it.discount * it.quantity;
      const final = lineRate - lineDisc;
      const cost = it.ptr * it.quantity;
      rate += lineRate;
      disc += lineDisc;
      profit += (final - cost);
    }
    return { rate, disc, total: rate - disc, profit };
  }, [items]);

  const resetBill = () => {
    setItems([]); setCustomerName(""); setMobile(""); setAddress(""); setCustomerId(null);
  };

  const generateBill = async () => {
    if (!items.length) return toast.error("Add at least one item");
    if (!customerName.trim()) return toast.error("Customer name required");

    setSubmitting(true);
    try {
      // Apply HM/OD parsing for customer name (also create customer record if not linked)
      const parsed = parseCustomerPrefix(customerName);
      let finalCustomerId = customerId;
      if (!finalCustomerId && parsed.name) {
        const { data: newCust, error: cErr } = await supabase
          .from("customers")
          .insert({ customer_name: parsed.name, customer_type: parsed.type, phone_number: mobile || null, address: address || null })
          .select("id").single();
        if (cErr) console.warn(cErr);
        else finalCustomerId = newCust.id;
      }

      const { data: order, error: oErr } = await supabase.from("orders").insert({
        customer_name: parsed.name,
        mobile_number: mobile || null,
        address: address || null,
        total_rate: totals.rate,
        total_discount: totals.disc,
        total_amount: totals.total,
        total_profit: totals.profit,
        customer_id: finalCustomerId,
      }).select().single();
      if (oErr) throw oErr;

      const rows = items.map((it) => ({
        order_id: order.id,
        inventory_id: it.inventory_id,
        medicine_name: it.medicine_name,
        quantity_sold: it.quantity,
        mrp: it.mrp,
        discount_per_medicine: it.discount,
        final_item_total: (it.mrp - it.discount) * it.quantity,
      }));
      const { error: iErr } = await supabase.from("order_items").insert(rows);
      if (iErr) throw iErr;

      toast.success("Bill generated and stock updated.");
      setReceipt({ order, items: [...items], totals });
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
                <Label className="text-xs">Customer name <span className="text-muted-foreground">(prefix "HM " / "OD " supported)</span></Label>
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
            <QuickAddCustomer open={showQuickCust} onOpenChange={setShowQuickCust} onAdded={(c) => { pickCustomer(c); }} />
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
            <Row label="Total Rate" value={`₹${totals.rate.toFixed(2)}`} />
            <Row label="Total Discount" value={`− ₹${totals.disc.toFixed(2)}`} />
            <div className="h-px bg-border my-2" />
            <Row label="Final Amount" value={`₹${totals.total.toFixed(2)}`} bold />
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
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleScanFile(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={scanning}
            >
              {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ScanLine className="h-4 w-4 mr-2" />}
              {scanning ? "Reading prescription…" : "Scan Prescription"}
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
                    <div className="flex justify-between">
                      <div>
                        <div className="font-medium">{m.medicine_name}</div>
                        <div className="text-xs text-muted-foreground">Batch {m.batch_no || "—"} · Exp {m.expiry_date || "—"}</div>
                      </div>
                      <div className="text-xs text-right">
                        <div className="font-semibold">Stock: {m.remaining_stock}</div>
                        <div className="text-muted-foreground">₹{Number(m.mrp_per_strip).toFixed(2)}/strip</div>
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
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 pr-2">Medicine</th>
                    <th className="text-left py-2 px-2">Unit</th>
                    <th className="text-right py-2 px-2">MRP</th>
                    <th className="text-right py-2 px-2">Qty</th>
                    <th className="text-right py-2 px-2">Discount/unit</th>
                    <th className="text-right py-2 px-2">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={it.inventory_id} className="border-b last:border-b-0">
                      <td className="py-2 pr-2">
                        <div className="font-medium">{it.medicine_name}</div>
                        <div className="text-xs text-muted-foreground">Batch {it.batch_no || "—"} · Stock {it.remaining_stock}</div>
                      </td>
                      <td className="px-2">
                        <Select value={it.unit} onValueChange={(v) => updateItem(idx, { unit: v as Unit })}>
                          <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="strip">Strip</SelectItem>
                            <SelectItem value="tablet">Tablet</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 text-right">₹{it.mrp.toFixed(2)}</td>
                      <td className="px-2 text-right">
                        <Input type="number" min={1} max={it.remaining_stock} className="h-8 w-20 text-right" value={it.quantity}
                          onChange={(e) => updateItem(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })} />
                      </td>
                      <td className="px-2 text-right">
                        <Input type="number" min={0} className="h-8 w-24 text-right" value={it.discount}
                          onChange={(e) => updateItem(idx, { discount: Math.max(0, Number(e.target.value) || 0) })} />
                      </td>
                      <td className="px-2 text-right font-semibold">₹{((it.mrp - it.discount) * it.quantity).toFixed(2)}</td>
                      <td className="pl-2"><Button size="icon" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-danger" /></Button></td>
                    </tr>
                  ))}
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

function ReceiptModal({ receipt, onClose }: { receipt: any; onClose: () => void }) {
  if (!receipt) return null;
  return (
    <Dialog open={!!receipt} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md print:shadow-none">
        <DialogHeader><DialogTitle>Receipt</DialogTitle></DialogHeader>
        <div id="receipt-body" className="space-y-3 text-sm">
          <div className="text-center border-b pb-3">
            <div className="font-bold text-lg">Smart Pharmacy</div>
            <div className="text-xs text-muted-foreground">{new Date(receipt.order.date).toLocaleString()}</div>
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
                  <td className="py-1">{it.medicine_name}</td>
                  <td className="text-right">{it.quantity}</td>
                  <td className="text-right">₹{it.mrp.toFixed(2)}</td>
                  <td className="text-right">₹{(it.discount * it.quantity).toFixed(2)}</td>
                  <td className="text-right">₹{((it.mrp - it.discount) * it.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-1 pt-2 border-t">
            <Row label="Subtotal" value={`₹${receipt.totals.rate.toFixed(2)}`} />
            <Row label="Discount" value={`− ₹${receipt.totals.disc.toFixed(2)}`} />
            <Row label="Total" value={`₹${receipt.totals.total.toFixed(2)}`} bold />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
