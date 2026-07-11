import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Camera, Loader2, ShoppingCart, Package, TrendingUp, Receipt, Pencil } from "lucide-react";
import { toast } from "sonner";
import { scanDistributorBill } from "@/lib/purchase.functions";

export const Route = createFileRoute("/_app/purchases")({
  component: PurchasesPage,
});

type Item = {
  medicine_name: string;
  batch_no: string;
  expiry_date: string;
  quantity: number;
  free_quantity: number;
  ptr_per_strip: number;
  mrp_per_strip: number;
  gst_percent: number;
  total_amount: number;
  inventory_id: string | null;
};

const emptyItem = (): Item => ({
  medicine_name: "", batch_no: "", expiry_date: "",
  quantity: 0, free_quantity: 0, ptr_per_strip: 0, mrp_per_strip: 0,
  gst_percent: 0, total_amount: 0, inventory_id: null,
});

function PurchasesPage() {
  const qc = useQueryClient();
  const { role, user } = useAuth();
  const isOwner = role === "Owner";
  const scan = useServerFn(scanDistributorBill);
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editBill, setEditBill] = useState<any | null>(null);

  const [distributorId, setDistributorId] = useState<string>("");
  const [distributorName, setDistributorName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([emptyItem()]);

  const { data: distributors = [] } = useQuery({
    queryKey: ["distributors-list"],
    queryFn: async () =>
      (await supabase.from("distributors").select("id, distributor_name").order("distributor_name")).data ?? [],
  });

  const { data: bills = [] } = useQuery({
    queryKey: ["distributor-bills"],
    queryFn: async () =>
      (await supabase.from("distributor_bills").select("*").order("bill_date", { ascending: false }).limit(50)).data ?? [],
  });

  const totals = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7);
    const todayTotal = bills.filter((b: any) => b.bill_date === today).reduce((s: number, b: any) => s + Number(b.total_amount || 0), 0);
    const monthTotal = bills.filter((b: any) => b.bill_date.startsWith(monthStart)).reduce((s: number, b: any) => s + Number(b.total_amount || 0), 0);
    return { todayTotal, monthTotal, count: bills.length };
  }, [bills]);

  const billTotal = useMemo(
    () => items.reduce((s, it) => s + (Number(it.total_amount) || Number(it.ptr_per_strip) * Number(it.quantity)), 0),
    [items],
  );

  const updateItem = (i: number, patch: Partial<Item>) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const handleScan = async (file: File) => {
    setScanning(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const res = await scan({ data: { imageBase64: base64, mimeType: file.type || "image/jpeg" } });
      if (res.distributor_name) {
        setDistributorName(res.distributor_name);
        const match = distributors.find((d: any) => d.distributor_name.toLowerCase() === res.distributor_name.toLowerCase());
        if (match) setDistributorId(match.id);
      }
      if (res.invoice_number) setInvoiceNumber(res.invoice_number);
      if (res.bill_date && /^\d{4}-\d{2}-\d{2}$/.test(res.bill_date)) setBillDate(res.bill_date);
      if (res.items.length) {
        setItems(res.items.map((it: any) => ({
          medicine_name: it.medicine_name || "",
          batch_no: it.batch_no || "",
          expiry_date: /^\d{4}-\d{2}-\d{2}$/.test(it.expiry_date) ? it.expiry_date : "",
          quantity: Number(it.quantity) || 0,
          free_quantity: Number(it.free_quantity) || 0,
          ptr_per_strip: Number(it.ptr_per_strip) || 0,
          mrp_per_strip: Number(it.mrp_per_strip) || 0,
          gst_percent: Number(it.gst_percent) || 0,
          total_amount: Number(it.total_amount) || 0,
          inventory_id: it.inventory_id ?? null,
        })));
        toast.success(`Extracted ${res.items.length} items — please verify.`);
      } else {
        toast.warning("No items detected. Try a clearer photo.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Scan failed");
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async () => {
    if (!distributorName.trim() && !distributorId) return toast.error("Choose or enter a distributor");
    const cleanItems = items.filter((i) => i.medicine_name.trim() && (i.quantity > 0 || i.free_quantity > 0));
    if (!cleanItems.length) return toast.error("Add at least one medicine row");

    setSaving(true);
    try {
      const dName = distributorId ? distributors.find((d: any) => d.id === distributorId)?.distributor_name : distributorName.trim();
      const { data: bill, error: be } = await supabase.from("distributor_bills").insert({
        distributor_id: distributorId || null,
        distributor_name: dName,
        invoice_number: invoiceNumber || null,
        bill_date: billDate,
        total_amount: billTotal,
        notes: notes || null,
        created_by: user?.id ?? null,
      }).select().single();
      if (be) throw be;

      const rows = cleanItems.map((it) => ({
        bill_id: bill.id,
        inventory_id: it.inventory_id,
        medicine_name: it.medicine_name.trim(),
        batch_no: it.batch_no || null,
        expiry_date: it.expiry_date || null,
        quantity: it.quantity,
        free_quantity: it.free_quantity,
        ptr_per_strip: it.ptr_per_strip,
        mrp_per_strip: it.mrp_per_strip,
        gst_percent: it.gst_percent,
        total_amount: it.total_amount || it.ptr_per_strip * it.quantity,
      }));
      const { error: ie } = await supabase.from("distributor_bill_items").insert(rows);
      if (ie) throw ie;

      toast.success(`Bill saved. Inventory updated for ${rows.length} items.`);
      setItems([emptyItem()]); setInvoiceNumber(""); setNotes("");
      qc.invalidateQueries({ queryKey: ["distributor-bills"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    } catch (e: any) {
      toast.error(e?.message || "Could not save bill");
    } finally {
      setSaving(false);
    }
  };

  const deleteBill = async (id: string) => {
    if (!isOwner) return toast.error("Only Owner can delete bills");
    if (!confirm("Delete this bill? Inventory stock will NOT be auto-reversed.")) return;
    const { error } = await supabase.from("distributor_bills").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["distributor-bills"] });
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Distributor Purchases</h1>
          <p className="text-sm text-muted-foreground">Scan or enter distributor bills — inventory updates automatically.</p>
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Receipt} label="Today" value={`₹${totals.todayTotal.toFixed(2)}`} />
        <StatCard icon={TrendingUp} label="This month" value={`₹${totals.monthTotal.toFixed(2)}`} />
        <StatCard icon={ShoppingCart} label="Total bills" value={String(totals.count)} />
        <StatCard icon={Package} label="Bill items" value={String(items.length)} />
      </div>

      {/* Entry form */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">New Purchase Bill</h2>
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleScan(e.target.files[0])}
              />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={scanning}>
                {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                {scanning ? "Reading bill..." : "Scan Bill Photo"}
              </Button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Distributor</Label>
              <Select value={distributorId} onValueChange={(v) => { setDistributorId(v); const d = distributors.find((x: any) => x.id === v); if (d) setDistributorName(d.distributor_name); }}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {distributors.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.distributor_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Or type new distributor name" value={distributorName} onChange={(e) => { setDistributorName(e.target.value); setDistributorId(""); }} />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Invoice #</Label><Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Bill date</Label><Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Bill total</Label><Input value={`₹${billTotal.toFixed(2)}`} readOnly /></div>
          </div>

          {/* Items */}
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Medicine</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Free</TableHead>
                  <TableHead>PTR</TableHead>
                  <TableHead>MRP</TableHead>
                  <TableHead>GST %</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell><Input value={it.medicine_name} onChange={(e) => updateItem(i, { medicine_name: e.target.value, inventory_id: null })} /></TableCell>
                    <TableCell><Input value={it.batch_no} onChange={(e) => updateItem(i, { batch_no: e.target.value })} /></TableCell>
                    <TableCell><Input type="date" value={it.expiry_date} onChange={(e) => updateItem(i, { expiry_date: e.target.value })} /></TableCell>
                    <TableCell><Input type="number" min={0} className="w-20" value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} /></TableCell>
                    <TableCell><Input type="number" min={0} className="w-16" value={it.free_quantity} onChange={(e) => updateItem(i, { free_quantity: Number(e.target.value) })} /></TableCell>
                    <TableCell><Input type="number" min={0} step="0.01" className="w-24" value={it.ptr_per_strip} onChange={(e) => updateItem(i, { ptr_per_strip: Number(e.target.value) })} /></TableCell>
                    <TableCell><Input type="number" min={0} step="0.01" className="w-24" value={it.mrp_per_strip} onChange={(e) => updateItem(i, { mrp_per_strip: Number(e.target.value) })} /></TableCell>
                    <TableCell><Input type="number" min={0} step="0.01" className="w-20" value={it.gst_percent} onChange={(e) => updateItem(i, { gst_percent: Number(e.target.value) })} /></TableCell>
                    <TableCell><Input type="number" min={0} step="0.01" className="w-24" value={it.total_amount} onChange={(e) => updateItem(i, { total_amount: Number(e.target.value) })} /></TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => setItems((arr) => arr.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => setItems((arr) => [...arr, emptyItem()])}><Plus className="h-4 w-4 mr-2" />Add row</Button>
            <div className="flex gap-2">
              <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={1} className="w-64" />
              <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Save bill & update stock</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent bills */}
      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold mb-3">Recent Bills</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Distributor</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.bill_date}</TableCell>
                    <TableCell>{b.distributor_name || "—"}</TableCell>
                    <TableCell>{b.invoice_number || "—"}</TableCell>
                    <TableCell>₹{Number(b.total_amount).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => setEditBill(b)}><Pencil className="h-4 w-4" /></Button>
                      {isOwner && <Button size="icon" variant="ghost" onClick={() => deleteBill(b.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </TableCell>
                  </TableRow>
                ))}
                {!bills.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No bills yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EditBillDialog bill={editBill} distributors={distributors} onClose={() => setEditBill(null)} onSaved={() => qc.invalidateQueries({ queryKey: ["distributor-bills"] })} />
    </div>
  );
}

function EditBillDialog({ bill, distributors, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (bill) setForm({ ...bill }); }, [bill?.id]);
  if (!bill) return null;
  const update = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const save = async () => {
    const dName = form.distributor_id
      ? distributors.find((d: any) => d.id === form.distributor_id)?.distributor_name
      : form.distributor_name;
    const { error } = await supabase.from("distributor_bills").update({
      distributor_id: form.distributor_id || null,
      distributor_name: dName || form.distributor_name,
      invoice_number: form.invoice_number || null,
      bill_date: form.bill_date,
      total_amount: Number(form.total_amount || 0),
      notes: form.notes || null,
    }).eq("id", bill.id);
    if (error) return toast.error(error.message);
    toast.success("Bill updated"); onSaved(); onClose();
  };
  return (
    <Dialog open={!!bill} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Bill</DialogTitle></DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Distributor</Label>
            <Select value={form.distributor_id || ""} onValueChange={(v) => { update("distributor_id", v); const d = distributors.find((x: any) => x.id === v); if (d) update("distributor_name", d.distributor_name); }}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {distributors.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.distributor_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Or distributor name" value={form.distributor_name || ""} onChange={(e) => update("distributor_name", e.target.value)} />
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Invoice #</Label><Input value={form.invoice_number || ""} onChange={(e) => update("invoice_number", e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Bill date</Label><Input type="date" value={form.bill_date || ""} onChange={(e) => update("bill_date", e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Total amount</Label><Input type="number" step="0.01" value={form.total_amount ?? 0} onChange={(e) => update("total_amount", e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Notes</Label><Textarea rows={2} value={form.notes || ""} onChange={(e) => update("notes", e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={save}>Save changes</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ icon: Icon, label, value }: any) {
  return (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Icon className="h-5 w-5 text-primary" /></div>
      <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-bold text-lg">{value}</div></div>
    </CardContent></Card>
  );
}
