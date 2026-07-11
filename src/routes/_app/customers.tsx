import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireRole } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/customers")({
  component: () => <RequireRole roles={["Owner"]}><CustomersPage /></RequireRole>,
});

function parsePrefix(s: string) {
  const t = s.trim();
  if (/^HM\s+/i.test(t)) return { name: t.replace(/^HM\s+/i, ""), type: "Home Delivery" as const };
  if (/^OD\s+/i.test(t)) return { name: t.replace(/^OD\s+/i, ""), type: "Ordinary" as const };
  return { name: t, type: "Ordinary" as const };
}

function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "home" | "refill_week">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["customers", search, filter],
    queryFn: async () => {
      let q = supabase.from("customers").select("*").order("created_at", { ascending: false });
      if (search) q = q.ilike("customer_name", `%${search}%`);
      if (filter === "home") q = q.eq("customer_type", "Home Delivery");
      if (filter === "refill_week") {
        const today = new Date().toISOString().slice(0, 10);
        const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
        q = q.gte("next_refill_date", today).lte("next_refill_date", in7);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const remove = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["customers"] });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">Regular and home-delivery clients with refill tracking.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Customer</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All customers</SelectItem>
            <SelectItem value="home">Home Delivery only</SelectItem>
            <SelectItem value="refill_week">Refills due this week</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Phone</th>
                <th className="px-3 py-2 text-left">Regular medicines</th>
                <th className="px-3 py-2 text-left">Address</th>
                <th className="px-3 py-2 text-left">Next Refill</th>
                <th className="px-3 py-2 text-left">Remark</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((c: any) => (
                <tr key={c.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{c.customer_name}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={c.customer_type === "Home Delivery" ? "bg-primary/10 text-primary border-primary/30" : ""}>{c.customer_type}</Badge>
                  </td>
                  <td className="px-3 py-2">{c.phone_number || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground max-w-[14rem] truncate">{c.regular_medicines || "—"}</td>
                  <td className="px-3 py-2 max-w-xs truncate">{c.address || "—"}</td>
                  <td className="px-3 py-2 font-medium">{c.next_refill_date || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground max-w-xs truncate">{c.remark || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-danger" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!data.length && <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No customers found.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <CustomerForm open={open} onOpenChange={setOpen} item={editing} onSaved={() => qc.invalidateQueries({ queryKey: ["customers"] })} />
    </div>
  );
}

function CustomerForm({ open, onOpenChange, item, onSaved }: any) {
  const [form, setForm] = useState<any>({});
  useEffect(() => {
    if (!open) return;
    setForm(item ? { ...item } : {});
  }, [open, item?.id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parsePrefix(form.customer_name || "");
    const payload = {
      customer_name: parsed.name,
      customer_type: form.customer_type || parsed.type,
      phone_number: form.phone_number || null,
      address: form.address || null,
      next_refill_date: form.next_refill_date || null,
      remark: form.remark || null,
      regular_medicines: form.regular_medicines || null,
    };
    const { error } = item
      ? await supabase.from("customers").update(payload).eq("id", item.id)
      : await supabase.from("customers").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(item ? "Updated" : "Added"); onSaved(); onOpenChange(false);
  };

  const update = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs">Name (HM/OD prefix supported)</Label><Input value={form.customer_name || ""} onChange={(e) => update("customer_name", e.target.value)} required /></div>
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select value={form.customer_type || ""} onValueChange={(v) => update("customer_type", v)}>
              <SelectTrigger><SelectValue placeholder="Auto from prefix" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ordinary">Ordinary</SelectItem>
                <SelectItem value="Home Delivery">Home Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={form.phone_number || ""} onChange={(e) => update("phone_number", e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Next refill date</Label><Input type="date" value={form.next_refill_date || ""} onChange={(e) => update("next_refill_date", e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Address</Label><Input value={form.address || ""} onChange={(e) => update("address", e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Regular medicines (comma separated)</Label><Input value={form.regular_medicines || ""} onChange={(e) => update("regular_medicines", e.target.value)} placeholder="e.g. Metformin 500, Telmisartan 40" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Remark</Label><Input value={form.remark || ""} onChange={(e) => update("remark", e.target.value)} /></div>
          <DialogFooter><Button type="submit">{item ? "Save changes" : "Add"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
