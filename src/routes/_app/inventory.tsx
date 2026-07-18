import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireRole } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Plus, Pencil, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, Columns3 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/inventory")({
  component: () => <RequireRole roles={["Owner"]}><InventoryPage /></RequireRole>,
});

const CATEGORIES = [
  { value: "GM", label: "Generic Medicine (GM)" },
  { value: "SM", label: "Standard Medicine (SM)" },
  { value: "GI", label: "Generic Item (GI)" },
];

type ColumnKey =
  | "serial_number" | "medicine_name" | "category" | "distributor" | "batch_no"
  | "unit_type" | "pack_size" | "stock" | "remaining_stock" | "expiry_date"
  | "mrp_per_strip" | "mrp_per_tablet" | "ptr_per_strip" | "ptr_per_tablet"
  | "gst_percent" | "edit" | "delete";

type ColumnDef = { key: ColumnKey; label: string; width: string; align?: "left" | "right"; sortable?: boolean; sortKey?: string; sticky?: boolean; };

const COLUMNS: ColumnDef[] = [
  { key: "serial_number", label: "S/N", width: "w-16", align: "left", sortable: true },
  { key: "medicine_name", label: "Medicine", width: "w-52", align: "left", sortable: true },
  { key: "category", label: "Category", width: "w-24", align: "left", sortable: true },
  { key: "distributor", label: "Distributor", width: "w-44", align: "left", sortable: true, sortKey: "distributors.distributor_name" },
  { key: "batch_no", label: "Batch No", width: "w-28", align: "left", sortable: true },
  { key: "unit_type", label: "Unit Type", width: "w-24", align: "left", sortable: true },
  { key: "pack_size", label: "Qty/Strip", width: "w-24", align: "right", sortable: true },
  { key: "stock", label: "Stock", width: "w-20", align: "right", sortable: true },
  { key: "remaining_stock", label: "Remaining", width: "w-28", align: "right", sortable: true },
  { key: "expiry_date", label: "Expiry", width: "w-28", align: "left", sortable: true },
  { key: "mrp_per_strip", label: "MRP/Strip", width: "w-28", align: "right", sortable: true },
  { key: "mrp_per_tablet", label: "MRP/Tab", width: "w-28", align: "right", sortable: true },
  { key: "ptr_per_strip", label: "PTR/Strip", width: "w-28", align: "right", sortable: true },
  { key: "ptr_per_tablet", label: "PTR/Tab", width: "w-28", align: "right", sortable: true },
  { key: "gst_percent", label: "GST %", width: "w-20", align: "right", sortable: true },
  { key: "edit", label: "Edit", width: "w-20", align: "right", sticky: true },
  { key: "delete", label: "Delete", width: "w-20", align: "right", sticky: true },
];

function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "expiring">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [sortBy, setSortBy] = useState<ColumnKey>("serial_number");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [visible, setVisible] = useState<Record<ColumnKey, boolean>>(() =>
    Object.fromEntries(COLUMNS.map(c => [c.key, true])) as Record<ColumnKey, boolean>
  );

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

  const sorted = useMemo(() => {
    const arr = [...data];
    const getVal = (row: any) => {
      if (sortBy === "distributor") return row.distributors?.distributor_name ?? "";
      return row[sortBy];
    };
    arr.sort((a, b) => {
      const av = getVal(a); const bv = getVal(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av).localeCompare(String(bv), undefined, { numeric: true });
    });
    if (sortDir === "desc") arr.reverse();
    return arr;
  }, [data, sortBy, sortDir]);

  const remove = useCallback(async (id: string) => {
    if (!confirm("Delete this medicine?")) return;
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["inventory"] });
  }, [qc]);

  const onEdit = useCallback((m: any) => { setEditing(m); setOpen(true); }, []);

  const toggleSort = (key: ColumnKey) => {
    if (sortBy === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("asc"); }
  };

  const visibleCols = COLUMNS.filter(c => visible[c.key]);

  return (
    <div className="space-y-6 max-w-[1600px]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl md:text-3xl font-bold">Inventory</h1>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline"><Columns3 className="h-4 w-4 mr-2" />Columns</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 max-h-[70vh] overflow-y-auto">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {COLUMNS.map(c => (
              <DropdownMenuCheckboxItem
                key={c.key}
                checked={visible[c.key]}
                onCheckedChange={(v) => setVisible(prev => ({ ...prev, [c.key]: !!v }))}
                onSelect={(e) => e.preventDefault()}
              >
                {c.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="inventory-table-wrap overflow-auto max-h-[calc(100vh-260px)]">
            <table className="w-full min-w-max text-sm inventory-table border-separate border-spacing-0">
              <thead>
                <tr>
                  {visibleCols.map(c => {
                    const active = sortBy === c.key;
                    const alignClass = c.align === "right" ? "text-right" : "text-left";
                    const stickyClass = c.sticky ? "sticky right-0 z-30 border-l" : "";
                    return (
                      <th
                        key={c.key}
                        className={`${c.width} ${alignClass} ${stickyClass} px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted sticky top-0 z-20 border-b`}
                      >
                        {c.sortable ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(c.key)}
                            className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${c.align === "right" ? "flex-row-reverse w-full justify-start" : ""}`}
                          >
                            <span>{c.label}</span>
                            {active ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                          </button>
                        ) : c.label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sorted.map((m: any) => (
                  <InventoryRow key={m.id} m={m} cols={visibleCols} onEdit={onEdit} onDelete={remove} />
                ))}
                {!sorted.length && (
                  <tr><td colSpan={visibleCols.length} className="text-center py-12 text-muted-foreground">No medicines found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <InventoryFormDialog open={open} onOpenChange={setOpen} item={editing} onSaved={() => qc.invalidateQueries({ queryKey: ["inventory"] })} />
    </div>
  );
}

const InventoryRow = memo(function InventoryRow({ m, cols, onEdit, onDelete }: { m: any; cols: ColumnDef[]; onEdit: (m: any) => void; onDelete: (id: string) => void; }) {
  const low = m.remaining_stock < 10;
  const expSoon = m.expiry_date && new Date(m.expiry_date) <= new Date(Date.now() + 30 * 86400000);

  const cell = (c: ColumnDef) => {
    switch (c.key) {
      case "serial_number": return m.serial_number;
      case "medicine_name": return <span className="font-medium">{m.medicine_name}</span>;
      case "category": return <Badge variant="outline">{m.category || "GM"}</Badge>;
      case "distributor": return <span className="text-muted-foreground">{m.distributors?.distributor_name || "—"}</span>;
      case "batch_no": return m.batch_no || "—";
      case "unit_type": return <span className="capitalize">{m.unit_type || "strip"}</span>;
      case "pack_size": return m.pack_size || 10;
      case "stock": return m.stock;
      case "remaining_stock": return low
        ? <Badge variant="outline" className="bg-warning/20 text-warning-foreground border-warning">{m.remaining_stock}</Badge>
        : m.remaining_stock;
      case "expiry_date": return m.expiry_date
        ? (expSoon ? <Badge variant="outline" className="bg-danger/20 text-danger border-danger">{m.expiry_date}</Badge> : m.expiry_date)
        : "—";
      case "mrp_per_strip": return `₹${Number(m.mrp_per_strip).toFixed(2)}`;
      case "mrp_per_tablet": return `₹${Number(m.mrp_per_tablet).toFixed(2)}`;
      case "ptr_per_strip": return `₹${Number(m.ptr_per_strip).toFixed(2)}`;
      case "ptr_per_tablet": return `₹${Number(m.ptr_per_tablet).toFixed(2)}`;
      case "gst_percent": return `${Number(m.gst_percent || 0).toFixed(2)}%`;
      case "edit": return (
        <Button size="sm" variant="outline" onClick={() => onEdit(m)}>
          <Pencil className="h-3.5 w-3.5 mr-1" />Edit
        </Button>
      );
      case "delete": return (
        <Button size="icon" variant="ghost" aria-label={`Delete ${m.medicine_name}`} onClick={() => onDelete(m.id)}>
          <Trash2 className="h-4 w-4 text-danger" />
        </Button>
      );
    }
  };

  return (
    <tr className="border-b hover:bg-muted/30">
      {cols.map(c => {
        const alignClass = c.align === "right" ? "text-right" : "text-left";
        const stickyClass = c.sticky ? "sticky right-0 z-10 bg-card border-l" : "";
        return (
          <td key={c.key} className={`px-3 py-2 border-b whitespace-nowrap ${alignClass} ${stickyClass}`}>
            {cell(c)}
          </td>
        );
      })}
    </tr>
  );
});

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
