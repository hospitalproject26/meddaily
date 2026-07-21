import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/hooks/use-current-shop";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, FileDown } from "lucide-react";

export const Route = createFileRoute("/_app/sales")({
  component: SalesHistoryPage,
});

function SalesHistoryPage() {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data: shop } = useCurrentShop();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["sales-history", search, from, to],
    queryFn: async () => {
      let q = supabase.from("orders").select("*, order_items(*)").order("date", { ascending: false }).limit(500);
      if (search) q = q.ilike("customer_name", `%${search}%`);
      if (from) q = q.gte("date", from);
      if (to) q = q.lte("date", `${to}T23:59:59`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const totals = useMemo(() => {
    let sales = 0, profit = 0;
    orders.forEach((o: any) => { sales += Number(o.total_amount); profit += Number(o.total_profit); });
    return { sales, profit, count: orders.length };
  }, [orders]);

  const exportCsv = () => {
    const rows = [
      ["Invoice", "Date", "Customer", "Mobile", "Items", "Subtotal", "Discount", "GST", "Total", "Profit", "Payment"],
      ...orders.map((o: any) => [
        o.invoice_number || o.id,
        new Date(o.date).toLocaleString(),
        o.customer_name || "",
        o.mobile_number || "",
        (o.order_items || []).map((i: any) => `${i.medicine_name} x${i.quantity_sold}`).join("; "),
        o.total_rate, o.total_discount, o.gst_amount || 0, o.total_amount, o.total_profit, o.payment_method || "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Sales History</h1>
          <p className="text-sm text-muted-foreground">All past bills with filters.</p>
        </div>
        <Button variant="outline" onClick={exportCsv}><FileDown className="h-4 w-4 mr-2" />Export CSV</Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Orders</div><div className="text-2xl font-bold">{totals.count}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total sales</div><div className="text-2xl font-bold">₹{totals.sales.toFixed(2)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total profit</div><div className="text-2xl font-bold">₹{totals.profit.toFixed(2)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Customer</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search customer…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left">Invoice</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Customer</th>
                <th className="px-3 py-2 text-right">Items</th>
                <th className="px-3 py-2 text-right">Discount</th>
                <th className="px-3 py-2 text-right">GST</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Profit</th>
                <th className="px-3 py-2 text-left">Payment</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</td></tr>}
              {!isLoading && orders.map((o: any) => (
                <tr key={o.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono text-xs">{o.invoice_number || o.id.slice(0, 8)}</td>
                  <td className="px-3 py-2">{new Date(o.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2">{o.customer_name || "—"}<div className="text-xs text-muted-foreground">{o.mobile_number}</div></td>
                  <td className="px-3 py-2 text-right">{(o.order_items || []).length}</td>
                  <td className="px-3 py-2 text-right">₹{Number(o.total_discount).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">₹{Number(o.gst_amount || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-semibold">₹{Number(o.total_amount).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">₹{Number(o.total_profit).toFixed(2)}</td>
                  <td className="px-3 py-2 text-xs">{o.payment_method || "—"}</td>
                </tr>
              ))}
              {!isLoading && !orders.length && <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">No sales found.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
