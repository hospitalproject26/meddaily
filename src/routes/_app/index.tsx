import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, ShoppingCart, TrendingUp, AlertTriangle, Calendar } from "lucide-react";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function Dashboard() {
  const { role } = useAuth();
  const isOwner = role === "Owner";

  const { data: today } = useQuery({
    queryKey: ["today-orders"],
    queryFn: async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("orders")
        .select("total_amount, total_profit")
        .gte("date", start.toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: lowStock } = useQuery({
    queryKey: ["low-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("serial_number, medicine_name, remaining_stock, batch_no")
        .lt("remaining_stock", 10)
        .order("remaining_stock", { ascending: true })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isOwner,
  });

  const { data: expiring } = useQuery({
    queryKey: ["expiring"],
    queryFn: async () => {
      const now = new Date();
      const in30 = new Date(); in30.setDate(in30.getDate() + 30);
      const { data, error } = await supabase
        .from("inventory")
        .select("serial_number, medicine_name, expiry_date, batch_no, remaining_stock")
        .gte("expiry_date", now.toISOString().slice(0, 10))
        .lte("expiry_date", in30.toISOString().slice(0, 10))
        .order("expiry_date", { ascending: true })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isOwner,
  });

  const sales = today?.reduce((s, o) => s + Number(o.total_amount || 0), 0) ?? 0;
  const profit = today?.reduce((s, o) => s + Number(o.total_profit || 0), 0) ?? 0;
  const count = today?.length ?? 0;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Today's overview at a glance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Today's Sales" value={`₹${sales.toFixed(2)}`} icon={IndianRupee} accent="primary" />
        {isOwner && (
          <StatCard label="Today's Profit" value={`₹${profit.toFixed(2)}`} icon={TrendingUp} accent="success" />
        )}
        <StatCard label="Orders Filled" value={String(count)} icon={ShoppingCart} accent="accent" />
      </div>

      {isOwner && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <CardTitle className="text-base">Low Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {lowStock?.length ? (
                <ul className="space-y-2">
                  {lowStock.map((m) => (
                    <li key={m.serial_number} className="flex items-center justify-between p-2 rounded-md bg-warning/10">
                      <div>
                        <div className="font-medium text-sm">{m.medicine_name}</div>
                        <div className="text-xs text-muted-foreground">Batch: {m.batch_no || "—"}</div>
                      </div>
                      <Badge variant="outline" className="bg-warning/20 text-warning-foreground border-warning">
                        {m.remaining_stock} left
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : <EmptyMsg text="All medicines are sufficiently stocked." />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <Calendar className="h-4 w-4 text-danger" />
              <CardTitle className="text-base">Expiring Soon (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              {expiring?.length ? (
                <ul className="space-y-2">
                  {expiring.map((m) => (
                    <li key={m.serial_number} className="flex items-center justify-between p-2 rounded-md bg-danger/10">
                      <div>
                        <div className="font-medium text-sm">{m.medicine_name}</div>
                        <div className="text-xs text-muted-foreground">Batch: {m.batch_no || "—"} · Stock: {m.remaining_stock}</div>
                      </div>
                      <Badge variant="outline" className="bg-danger/20 text-danger border-danger">
                        {m.expiry_date}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : <EmptyMsg text="No medicines expiring soon." />}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: any; accent: "primary" | "success" | "accent" }) {
  const accentBg = accent === "success" ? "bg-success/15 text-success" : accent === "accent" ? "bg-accent text-accent-foreground" : "bg-primary/15 text-primary";
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${accentBg}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</div>
          <div className="text-2xl font-bold mt-0.5">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyMsg({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-6 text-center">{text}</p>;
}
