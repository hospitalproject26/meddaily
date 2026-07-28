import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "sales_summary",
  title: "Sales summary",
  description:
    "Summarise sales for a date range: invoice count, revenue, discount, GST and profit, plus the most recent invoices.",
  inputSchema: {
    from: z.string().optional().describe("Start date, YYYY-MM-DD. Defaults to 30 days ago."),
    to: z.string().optional().describe("End date, YYYY-MM-DD. Defaults to today."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const end = to ?? new Date().toISOString().slice(0, 10);
    const start = from ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const { data, error } = await supabaseForUser(ctx)
      .from("orders")
      .select("id, invoice_number, date, customer_name, total_amount, total_discount, gst_amount, total_profit, payment_method")
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: false })
      .limit(500);
    if (error) return errorResult(error.message);

    const rows = data ?? [];
    const sum = (k: "total_amount" | "total_discount" | "gst_amount" | "total_profit") =>
      Number(rows.reduce((a, r) => a + Number(r[k] ?? 0), 0).toFixed(2));

    return jsonResult({
      from: start,
      to: end,
      invoice_count: rows.length,
      revenue: sum("total_amount"),
      discount: sum("total_discount"),
      gst: sum("gst_amount"),
      profit: sum("total_profit"),
      recent_invoices: rows.slice(0, 20),
    });
  },
});
