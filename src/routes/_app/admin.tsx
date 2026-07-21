import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireRole } from "@/components/AuthGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Power, Building2, UserPlus, UserMinus, ArrowRightLeft, Clock, Users } from "lucide-react";
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
  code: string;
  name: string;
  plan: string | null;
  is_active: boolean;
  created_at: string;
  owner_user_id: string | null;
  owner_name: string | null;
  email: string | null;
  phone: string | null;
};


type PendingUser = { id: string; email: string | null; name: string | null; created_at: string };
type Member = { id: string; user_id: string; shop_id: string; role: string; created_at: string };
type Profile = { id: string; email: string | null; name: string | null };

function AdminConsole() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SuperAdmin Console</h1>
        <p className="text-sm text-muted-foreground">Manage pharmacies, approve sign-ups, and assign users.</p>
      </div>

      <Tabs defaultValue="shops">
        <TabsList>
          <TabsTrigger value="shops"><Building2 className="h-4 w-4 mr-2" />Pharmacies</TabsTrigger>
          <TabsTrigger value="pending"><Clock className="h-4 w-4 mr-2" />Pending Users</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-2" />Assigned Users</TabsTrigger>
        </TabsList>
        <TabsContent value="shops" className="mt-4"><ShopsPanel /></TabsContent>
        <TabsContent value="pending" className="mt-4"><PendingPanel /></TabsContent>
        <TabsContent value="users" className="mt-4"><UsersPanel /></TabsContent>
      </Tabs>
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

/* ============================ Shops Panel ============================ */

function ShopsPanel() {
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
      <div className="flex items-center justify-end">
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
          <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" />Pharmacies</CardTitle>
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
                {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
                {!isLoading && shops.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No shops yet.</td></tr>}
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
                        <Button size="sm" variant="outline" onClick={() => setEditing(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button
                          size="sm"
                          variant={s.is_active ? "outline" : "default"}
                          onClick={() => toggleActive.mutate(s)}
                          disabled={toggleActive.isPending}
                        >
                          <Power className="h-3.5 w-3.5 mr-1" />{s.is_active ? "Suspend" : "Reactivate"}
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

      <ShopFormDialog open={creating} onOpenChange={setCreating} shop={null} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-shops"] })} />
      <ShopFormDialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)} shop={editing} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-shops"] })} />
    </div>
  );
}

/* ============================ Pending Users Panel ============================ */

function PendingPanel() {
  const qc = useQueryClient();
  const [assigning, setAssigning] = useState<PendingUser | null>(null);

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["admin-pending-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_pending_users");
      if (error) throw error;
      return (data ?? []) as PendingUser[];
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4" />Users awaiting assignment</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Signed up</th>
                  <th className="p-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
                {!isLoading && pending.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No pending users.</td></tr>}
                {pending.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="p-3 font-medium">{u.name ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{u.email ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleString()}</td>
                    <td className="p-3">
                      <div className="flex justify-end">
                        <Button size="sm" onClick={() => setAssigning(u)}>
                          <UserPlus className="h-3.5 w-3.5 mr-1" />Assign
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

      <AssignDialog
        open={!!assigning}
        onOpenChange={(v) => !v && setAssigning(null)}
        user={assigning}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["admin-pending-users"] });
          qc.invalidateQueries({ queryKey: ["admin-members"] });
          qc.invalidateQueries({ queryKey: ["admin-shop-member-counts"] });
        }}
      />
    </div>
  );
}

/* ============================ Assigned Users Panel ============================ */

function UsersPanel() {
  const qc = useQueryClient();
  const [transferring, setTransferring] = useState<{ member: Member; profile: Profile | undefined } | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["admin-members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shop_members").select("id, user_id, shop_id, role, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });

  const { data: shops = [] } = useQuery({
    queryKey: ["admin-shops"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shops").select("id, name, plan, is_active, created_at, owner_user_id");
      if (error) throw error;
      return (data ?? []) as Shop[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, email, name");
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const shopById = useMemo(() => Object.fromEntries(shops.map((s) => [s.id, s])), [shops]);
  const profileById = useMemo(() => Object.fromEntries(profiles.map((p) => [p.id, p])), [profiles]);

  const unassign = useMutation({
    mutationFn: async (m: Member) => {
      const { error } = await supabase.from("shop_members").delete().eq("id", m.id);
      if (error) throw error;
      // Also remove app-level role
      await supabase.from("user_roles").delete().eq("user_id", m.user_id).in("role", ["Owner", "Staff"]);
    },
    onSuccess: () => {
      toast.success("User unassigned");
      qc.invalidateQueries({ queryKey: ["admin-members"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-users"] });
      qc.invalidateQueries({ queryKey: ["admin-shop-member-counts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" />Assigned users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-3 font-medium">User</th>
                  <th className="p-3 font-medium">Pharmacy</th>
                  <th className="p-3 font-medium">Role</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
                {!isLoading && members.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No assignments yet.</td></tr>}
                {members.map((m) => {
                  const p = profileById[m.user_id];
                  const s = shopById[m.shop_id];
                  return (
                    <tr key={m.id} className="border-t">
                      <td className="p-3">
                        <div className="font-medium">{p?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{p?.email ?? m.user_id.slice(0, 8)}</div>
                      </td>
                      <td className="p-3">{s?.name ?? "—"}</td>
                      <td className="p-3"><Badge variant="outline">{m.role}</Badge></td>
                      <td className="p-3">
                        {s?.is_active
                          ? <Badge className="bg-emerald-500/15 text-emerald-700">Active</Badge>
                          : <Badge className="bg-red-500/15 text-red-700">Blocked</Badge>}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setTransferring({ member: m, profile: p })}>
                            <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />Transfer
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { if (confirm("Unassign this user? They will lose access.")) unassign.mutate(m); }}>
                            <UserMinus className="h-3.5 w-3.5 mr-1" />Unassign
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <TransferDialog
        open={!!transferring}
        onOpenChange={(v) => !v && setTransferring(null)}
        member={transferring?.member ?? null}
        profile={transferring?.profile}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["admin-members"] });
          qc.invalidateQueries({ queryKey: ["admin-shop-member-counts"] });
        }}
      />
    </div>
  );
}

/* ============================ Dialogs ============================ */

function ShopFormDialog({ open, onOpenChange, shop, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; shop: Shop | null; onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("free");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setName(shop?.name ?? ""); setPlan(shop?.plan ?? "free"); }
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
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{shop ? "Edit Shop" : "New Shop"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pharmacy name" /></div>
          <div><Label>Plan</Label><Input value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="free / pro / enterprise" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({ open, onOpenChange, user, onDone }: {
  open: boolean; onOpenChange: (v: boolean) => void; user: PendingUser | null; onDone: () => void;
}) {
  const [shopId, setShopId] = useState<string>("");
  const [role, setRole] = useState<"shop_owner" | "shop_staff">("shop_owner");
  const [saving, setSaving] = useState(false);

  const { data: shops = [] } = useQuery({
    queryKey: ["admin-shops-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shops").select("id, name, is_active").eq("is_active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  useEffect(() => { if (open) { setShopId(""); setRole("shop_owner"); } }, [open]);

  const save = async () => {
    if (!user || !shopId) return toast.error("Choose a pharmacy");
    setSaving(true);
    try {
      const memberRole = role === "shop_owner" ? "Admin" : "Member";
      const appRole = role === "shop_owner" ? "Owner" : "Staff";
      const { error: mErr } = await supabase.from("shop_members").insert({ user_id: user.id, shop_id: shopId, role: memberRole });
      if (mErr) throw mErr;
      const { error: rErr } = await supabase.from("user_roles").upsert({ user_id: user.id, role: appRole }, { onConflict: "user_id,role" });
      if (rErr) throw rErr;
      toast.success(`Assigned ${user.email ?? "user"} to pharmacy`);
      onDone();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign user to pharmacy</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <div><span className="text-foreground font-medium">{user?.name ?? "—"}</span></div>
            <div>{user?.email}</div>
          </div>
          <div>
            <Label>Pharmacy</Label>
            <Select value={shopId} onValueChange={setShopId}>
              <SelectTrigger><SelectValue placeholder="Select a pharmacy" /></SelectTrigger>
              <SelectContent>
                {shops.map((s: { id: string; name: string }) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "shop_owner" | "shop_staff")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="shop_owner">Shop Owner (full access)</SelectItem>
                <SelectItem value="shop_staff">Shop Staff (limited)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !shopId}>{saving ? "Assigning…" : "Assign"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({ open, onOpenChange, member, profile, onDone }: {
  open: boolean; onOpenChange: (v: boolean) => void; member: Member | null; profile: Profile | undefined; onDone: () => void;
}) {
  const [shopId, setShopId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const { data: shops = [] } = useQuery({
    queryKey: ["admin-shops-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shops").select("id, name, is_active").eq("is_active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  useEffect(() => { if (open && member) setShopId(member.shop_id); }, [open, member]);

  const save = async () => {
    if (!member || !shopId || shopId === member.shop_id) return onOpenChange(false);
    setSaving(true);
    try {
      const { error } = await supabase.from("shop_members").update({ shop_id: shopId }).eq("id", member.id);
      if (error) throw error;
      toast.success("User transferred");
      onDone();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Transfer user</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <div><span className="text-foreground font-medium">{profile?.name ?? "—"}</span></div>
            <div>{profile?.email}</div>
          </div>
          <div>
            <Label>Move to pharmacy</Label>
            <Select value={shopId} onValueChange={setShopId}>
              <SelectTrigger><SelectValue placeholder="Select pharmacy" /></SelectTrigger>
              <SelectContent>
                {shops.map((s: { id: string; name: string }) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Transferring…" : "Transfer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
