import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireRole } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/inventory")({
  component: () => <RequireRole roles={["Owner"]}><InventoryPage /></RequireRole>,
});

const CATEGORIES = [
  { value: "GM", label: "Generic Medicine (GM)" },
  { value: "SM", label: "Standard Medicine (SM)" },
  { value: "GI", label: "Generic Item (GI)" },
];

function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "expiring">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const { data = [] } = useQuery({
    queryKey: ["inventory", search, filter, categoryFilter],
    queryFn: async () => {
      let q = supabase.from("inventory").select("*, distributors(distributor_name)").order("serial_number", { ascending: false });
      if (search) q = q.ilike("medicine_name", `%${search}%`);
      if (categoryFilter !== "all") q = q.eq("category", categoryFilter);
      if (filter === "low") q = q.lt("remaining_stock", 10);
      if (filter === "expiring") {
        const in30 = new Date(); in30.setDate(in30.getDate() + 30);
        q = q.lte("expiry_date", in30.toISOString().slice(0, 10));
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    placeholderData: (previousData) => previousData ?? [],
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const remove = async (id: string) => {
    if (!confirm("Delete this medicine?")) return;
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["inventory"] });
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">Manage your stock, batches, and pricing.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Medicine</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by medicine name…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All medicines</SelectItem>
            <SelectItem value="low">Low stock (&lt; 10)</SelectItem>
            <SelectItem value="expiring">Expiring in 30 days</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto inventory-table-wrap">
          <table className="w-full min-w-[1180px] table-fixed text-sm inventory-table">
            <colgroup>
              <col className="w-16" />
              <col className="w-48" />
              <col className="w-20" />
              <col className="w-44" />
              <col className="w-28" />
              <col className="w-24" />
              <col className="w-20" />
              <col className="w-24" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-32" />
            </colgroup>
            <thead className="text-xs uppercase text-muted-foreground bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left">S/N</th>
                <th className="px-3 py-2 text-left">Medicine</th>
                <th className="px-3 py-2 text-left">Cat</th>
                <th className="px-3 py-2 text-left">Distributor</th>
                <th className="px-3 py-2 text-left">Batch</th>
                <th className="px-3 py-2 text-right">Qty/Strip</th>
                <th className="px-3 py-2 text-right">Stock</th>
                <th className="px-3 py-2 text-right">Remaining</th>
                <th className="px-3 py-2 text-left">Expiry</th>
                <th className="px-3 py-2 text-right">MRP/Strip</th>
                <th className="px-3 py-2 text-right">MRP/Tab</th>
                <th className="px-3 py-2 text-right">PTR/Strip</th>
                <th className="px-3 py-2 text-right">PTR/Tab</th>
                <th className="px-3 py-2 text-right sticky right-0 z-10 bg-muted border-l">Edit</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m: any) => {
                const low = m.remaining_stock < 10;
                const expSoon = m.expiry_date && new Date(m.expiry_date) <= new Date(Date.now() + 30 * 86400000);
                return (
                  <tr key={m.id} className="border-t">
                    <td className="px-3 py-2">{m.serial_number}</td>
                    <td className="px-3 py-2 font-medium truncate" title={m.medicine_name}>{m.medicine_name}</td>
                    <td className="px-3 py-2"><Badge variant="outline">{m.category || "GM"}</Badge></td>
                    <td className="px-3 py-2 text-muted-foreground truncate" title={m.distributors?.distributor_name || ""}>{m.distributors?.distributor_name || "—"}</td>
                    <td className="px-3 py-2 truncate" title={m.batch_no || ""}>{m.batch_no || "—"}</td>
                    <td className="px-3 py-2 text-right">{m.pack_size || 10}</td>
                    <td className="px-3 py-2 text-right">{m.stock}</td>
                    <td className="px-3 py-2 text-right">
                      {low ? <Badge variant="outline" className="bg-warning/20 text-warning-foreground border-warning">{m.remaining_stock}</Badge> : m.remaining_stock}
                    </td>
                    <td className="px-3 py-2">
                      {m.expiry_date ? (expSoon ? <Badge variant="outline" className="bg-danger/20 text-danger border-danger">{m.expiry_date}</Badge> : m.expiry_date) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">₹{Number(m.mrp_per_strip).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">₹{Number(m.mrp_per_tablet).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">₹{Number(m.ptr_per_strip).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">₹{Number(m.ptr_per_tablet).toFixed(2)}</td>
                    <td className="px-3 py-2 sticky right-0 bg-card border-l z-10">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="outline" onClick={() => { setEditing(m); setOpen(true); }}>
                          <Pencil className="h-4 w-4" /> Edit
                        </Button>
                        <Button size="icon" variant="ghost" aria-label={`Delete ${m.medicine_name}`} onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-danger" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!data.length && <tr><td colSpan={14} className="text-center py-12 text-muted-foreground">No medicines found.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <InventoryFormDialog open={open} onOpenChange={setOpen} item={editing} onSaved={() => qc.invalidateQueries({ queryKey: ["inventory"] })} />
    </div>
  );
}

function InventoryFormDialog({ open, onOpenChange, item, onSaved }: any) {
  const [form, setForm] = useState<any>({});
  const { data: dists = [] } = useQuery({
    queryKey: ["dists-list"],
    queryFn: async () => (await supabase.from("distributors").select("id, distributor_name").order("distributor_name")).data ?? [],
  });

  // Populate/reset form each time the dialog opens or the target item changes
  useEffect(() => {
    if (!open) return;
    setForm(item ? { ...item } : {});
  }, [open, item?.id]);

  const update = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const packSize = Math.max(1, Number(form.pack_size || 10));
    const mrpStrip = Number(form.mrp_per_strip || 0);
    const ptrStrip = Number(form.ptr_per_strip || 0);
    const payload = {
      medicine_name: form.medicine_name,
      category: form.category || "GM",
      batch_no: form.batch_no || null,
      pack_size: packSize,
      unit_type: form.unit_type || "strip",
      gst_percent: Number(form.gst_percent || 0),
      stock: Number(form.stock || 0),
      remaining_stock: item ? Number(form.remaining_stock ?? form.stock ?? 0) : Number(form.stock || 0),
      expiry_date: form.expiry_date || null,
      mrp_per_strip: mrpStrip,
      mrp_per_tablet: mrpStrip ? +(mrpStrip / packSize).toFixed(4) : 0,
      ptr_per_strip: ptrStrip,
      ptr_per_tablet: ptrStrip ? +(ptrStrip / packSize).toFixed(4) : 0,
      distributor_id: form.distributor_id || null,
    };
    const { error } = item
      ? await supabase.from("inventory").update(payload).eq("id", item.id)
      : await supabase.from("inventory").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(item ? "Updated" : "Added"); onSaved(); onOpenChange(false);
  };

  const pack = Math.max(1, Number(form.pack_size || 10));
  const autoMrpTab = form.mrp_per_strip ? (Number(form.mrp_per_strip) / pack).toFixed(4) : "";
  const autoPtrTab = form.ptr_per_strip ? (Number(form.ptr_per_strip) / pack).toFixed(4) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? "Edit Medicine" : "Add Medicine"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-3">
          <Field label="Medicine name" required><Input value={form.medicine_name || ""} onChange={(e) => update("medicine_name", e.target.value)} required /></Field>
          <Field label="Batch no"><Input value={form.batch_no || ""} onChange={(e) => update("batch_no", e.target.value)} /></Field>
          <Field label="Category">
            <Select value={form.category || "GM"} onValueChange={(v) => update("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Unit type">
            <Select value={form.unit_type || "strip"} onValueChange={(v) => update("unit_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="strip">Strip (tablets/capsules)</SelectItem>
                <SelectItem value="bottle">Bottle (syrup)</SelectItem>
                <SelectItem value="tube">Tube (cream/ointment)</SelectItem>
                <SelectItem value="injection">Injection</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Quantity per strip (tablets/units)"><Input type="number" min={1} value={form.pack_size ?? 10} onChange={(e) => update("pack_size", e.target.value)} /></Field>
          <Field label="Stock (strips/units)"><Input type="number" value={form.stock ?? ""} onChange={(e) => update("stock", e.target.value)} /></Field>
          {item && <Field label="Remaining stock"><Input type="number" value={form.remaining_stock ?? ""} onChange={(e) => update("remaining_stock", e.target.value)} /></Field>}
          <Field label="Expiry date"><Input type="date" value={form.expiry_date || ""} onChange={(e) => update("expiry_date", e.target.value)} /></Field>
          <Field label="Distributor">
            <Select value={form.distributor_id || ""} onValueChange={(v) => update("distributor_id", v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {dists.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.distributor_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="MRP per strip"><Input type="number" step="0.01" value={form.mrp_per_strip ?? ""} onChange={(e) => update("mrp_per_strip", e.target.value)} /></Field>
          <Field label="MRP per tablet (auto)"><Input type="number" step="0.0001" value={autoMrpTab} readOnly className="bg-muted/40" /></Field>
          <Field label="PTR per strip (purchase rate)"><Input type="number" step="0.01" value={form.ptr_per_strip ?? ""} onChange={(e) => update("ptr_per_strip", e.target.value)} /></Field>
          <Field label="PTR per tablet (auto)"><Input type="number" step="0.0001" value={autoPtrTab} readOnly className="bg-muted/40" /></Field>
          <Field label="GST %"><Input type="number" step="0.01" value={form.gst_percent ?? 0} onChange={(e) => update("gst_percent", e.target.value)} /></Field>
          <DialogFooter className="sm:col-span-2"><Button type="submit">{item ? "Save changes" : "Add medicine"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}{required && " *"}</Label>{children}</div>;
}
