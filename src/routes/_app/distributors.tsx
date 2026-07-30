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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/distributors")({
  component: () => <RequireRole roles={["Owner"]}><DistributorsPage /></RequireRole>,
});

function DistributorsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["distributors"],
    queryFn: async () => (await supabase.from("distributors").select("*").order("distributor_name")).data ?? [],
  });

  const remove = async (id: string) => {
    if (!confirm("Delete this distributor?")) return;
    const { error } = await supabase.from("distributors").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["distributors"] });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Distributors</h1>
          <p className="text-sm text-muted-foreground">Your medicine suppliers and contact details.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Distributor</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((d: any) => (
          <Card key={d.id}>
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-lg">{d.distributor_name}</div>
                  {d.mobile_number && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="h-3.5 w-3.5" />{d.mobile_number}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(d); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4 text-danger" /></Button>
                </div>
              </div>
              {d.address && <div className="text-xs text-muted-foreground flex gap-1"><MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>{d.address}</span></div>}
              {d.medicines_available && (
                <div className="text-xs">
                  <div className="font-semibold text-muted-foreground uppercase tracking-wider mb-1">Medicines available</div>
                  <div>{d.medicines_available}</div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {!data.length && <Card className="sm:col-span-2 lg:col-span-3"><CardContent className="text-center py-12 text-muted-foreground">No distributors yet.</CardContent></Card>}
      </div>

      <DistForm open={open} onOpenChange={setOpen} item={editing} onSaved={() => qc.invalidateQueries({ queryKey: ["distributors"] })} />
    </div>
  );
}

function DistForm({ open, onOpenChange, item, onSaved }: any) {
  const [form, setForm] = useState<any>({});
  useEffect(() => {
    if (!open) return;
    setForm(item ? { ...item } : {});
  }, [open, item?.id]);
  const update = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      distributor_name: form.distributor_name,
      mobile_number: form.mobile_number || null,
      address: form.address || null,
      medicines_available: form.medicines_available || null,
    };
    const { error } = item
      ? await supabase.from("distributors").update(payload).eq("id", item.id)
      : await supabase.from("distributors").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(item ? "Updated" : "Added"); onSaved(); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? "Edit Distributor" : "Add Distributor"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs">Distributor name</Label><Input value={form.distributor_name || ""} onChange={(e) => update("distributor_name", e.target.value)} required /></div>
          <div className="space-y-1.5"><Label className="text-xs">Mobile number</Label><Input value={form.mobile_number || ""} onChange={(e) => update("mobile_number", e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Address</Label><Textarea value={form.address || ""} onChange={(e) => update("address", e.target.value)} rows={2} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Medicines available (comma separated)</Label><Textarea value={form.medicines_available || ""} onChange={(e) => update("medicines_available", e.target.value)} rows={2} /></div>
          <DialogFooter><Button type="submit">{item ? "Save changes" : "Add"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
