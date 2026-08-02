import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireRole } from "@/components/AuthGate";
import { useCurrentShop } from "@/hooks/use-current-shop";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { IndianRupee, TrendingUp, ShoppingCart } from "lucide-react";
import { Scroll3DSection } from "@/components/scroll-3d";

export const Route = createFileRoute("/_app/reports")({
  component: () => <RequireRole roles={["Owner"]}><ReportsPage /></RequireRole>,
});

type Range = "day" | "month" | "year";

function ReportsPage() {
  const [range, setRange] = useState<Range>("day");
  const { data: shop } = useCurrentShop();

  const { data: orders = [] } = useQuery({
    queryKey: ["reports", range],
    queryFn: async () => {
      const now = new Date();
      let start: Date;
      if (range === "day") { start = new Date(); start.setHours(0,0,0,0); }
      else if (range === "month") { start = new Date(now.getFullYear(), now.getMonth(), 1); }
      else { start = new Date(now.getFullYear(), 0, 1); }
      const { data } = await supabase.from("orders").select("date, total_amount, total_profit").gte("date", start.toISOString()).order("date");
      return data ?? [];
    },
  });

  const totals = useMemo(() => {
    const revenue = orders.reduce((s, o: any) => s + Number(o.total_amount || 0), 0);
    const profit = orders.reduce((s, o: any) => s + Number(o.total_profit || 0), 0);
    return { revenue, profit, count: orders.length };
  }, [orders]);

  const chartData = useMemo(() => {
    const buckets: Record<string, { name: string; Revenue: number; Profit: number }> = {};
    for (const o of orders as any[]) {
      const d = new Date(o.date);
      let key: string;
      if (range === "day") key = `${d.getHours().toString().padStart(2, "0")}:00`;
      else if (range === "month") key = d.getDate().toString();
      else key = d.toLocaleString("en", { month: "short" });
      if (!buckets[key]) buckets[key] = { name: key, Revenue: 0, Profit: 0 };
      buckets[key].Revenue += Number(o.total_amount || 0);
      buckets[key].Profit += Number(o.total_profit || 0);
    }
    return Object.values(buckets);
  }, [orders, range]);

  return (
    <div className="space-y-6 max-w-6xl">
      <Scroll3DSection>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold">Reports</h1>
            {shop?.code && <Badge variant="outline" className="font-mono text-xs">{shop.code}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {shop?.name ? `${shop.name} · ` : ""}Revenue, profit, and orders over time.
          </p>
        </div>

        <Tabs value={range} onValueChange={(v) => setRange(v as Range)} className="mt-4">
          <TabsList>
            <TabsTrigger value="day">Today</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="year">This Year</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <StatCard label="Total Revenue" value={`₹${totals.revenue.toFixed(2)}`} Icon={IndianRupee} accent="primary" />
          <StatCard label="Total Profit" value={`₹${totals.profit.toFixed(2)}`} Icon={TrendingUp} accent="success" />
          <StatCard label="Orders" value={String(totals.count)} Icon={ShoppingCart} accent="accent" />
        </div>
      </Scroll3DSection>

      <Card>
        <CardHeader><CardTitle className="text-base">Revenue vs Profit</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="Revenue" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Profit" fill="var(--success)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, Icon, accent }: { label: string; value: string; Icon: any; accent: "primary" | "success" | "accent" }) {
  const bg = accent === "success" ? "bg-success/15 text-success" : accent === "accent" ? "bg-accent text-accent-foreground" : "bg-primary/15 text-primary";
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${bg}`}><Icon className="h-6 w-6" /></div>
        <div>
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
