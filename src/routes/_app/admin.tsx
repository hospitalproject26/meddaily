import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireRole } from "@/components/AuthGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Power, Building2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin")({
  component: () => (
    <RequireRole roles={["SuperAdmin"]}>
      <AdminConsole />
    </RequireRole>
  ),
});

type Shop = {
  id: string;
  name: string;
  plan: string | null;
  is_active: boolean;
  created_at: string;
  owner_user_id: string | null;
};

function AdminConsole() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Shop | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ["admin-shops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("id, name, plan, is_active, created_at, owner_user_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Shop[];
    },
  });

  const { data: memberCounts = {} } = useQuery({
    queryKey: ["admin-shop-member-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shop_members").select("shop_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: { shop_id: string }) => { map[r.shop_id] = (map[r.shop_id] ?? 0) + 1; });
      return map;
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (shop: Shop) => {
      const { error } = await supabase.from("shops").update({ is_active: !shop.is_active }).eq("id", shop.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Shop status updated");
      qc.invalidateQueries({ queryKey: ["admin-shops"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const active = shops.filter((s) => s.is_active).length;
  const suspended = shops.length - active;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">SuperAdmin Console</h1>
          <p className="text-sm text-muted-foreground">Manage all pharmacies on the platform.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />New Shop
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Shops" value={shops.length} />
        <StatCard label="Active" value={active} tone="text-emerald-600" />
        <StatCard label="Suspended" value={suspended} tone="text-amber-600" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" /> Pharmacies
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Plan</th>
                  <th className="p-3 font-medium">Members</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Created</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
                )}
                {!isLoading && shops.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No shops yet.</td></tr>
                )}
                {shops.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3 font-medium">{s.name}</td>
                    <td className="p-3 text-muted-foreground">{s.plan ?? "free"}</td>
                    <td className="p-3">{memberCounts[s.id] ?? 0}</td>
                    <td className="p-3">
                      {s.is_active
                        ? <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20">Active</Badge>
                        : <Badge variant="secondary" className="bg-amber-500/15 text-amber-700">Suspended</Badge>}
                    </td>
                    <td className="p-3 text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant={s.is_active ? "outline" : "default"}
                          onClick={() => toggleActive.mutate(s)}
                          disabled={toggleActive.isPending}
                        >
                          <Power className="h-3.5 w-3.5 mr-1" />
                          {s.is_active ? "Suspend" : "Reactivate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ShopFormDialog
        open={creating}
        onOpenChange={setCreating}
        shop={null}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin-shops"] })}
      />
      <ShopFormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        shop={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin-shops"] })}
      />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`text-3xl font-bold mt-1 ${tone ?? ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function ShopFormDialog({
  open, onOpenChange, shop, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shop: Shop | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("free");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(shop?.name ?? "");
      setPlan(shop?.plan ?? "free");
    }
  }, [open, shop]);

  const save = async () => {
    if (!name.trim()) return toast.error("Name required");
    setSaving(true);
    try {
      if (shop) {
        const { error } = await supabase.from("shops").update({ name: name.trim(), plan }).eq("id", shop.id);
        if (error) throw error;
        toast.success("Shop updated");
      } else {
        const { error } = await supabase.from("shops").insert({ name: name.trim(), plan });
        if (error) throw error;
        toast.success("Shop created");
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{shop ? "Edit Shop" : "New Shop"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pharmacy name" />
          </div>
          <div>
            <Label>Plan</Label>
            <Input value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="free / pro / enterprise" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
