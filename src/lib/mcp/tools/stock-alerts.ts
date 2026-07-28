import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "stock_alerts",
  title: "Stock and expiry alerts",
  description:
    "List medicines that are low on stock or expiring soon, so the pharmacy can reorder or clear them.",
  inputSchema: {
    low_stock_threshold: z.number().int().optional().describe("Remaining stock at or below this counts as low (default 10)."),
    expiring_within_days: z.number().int().optional().describe("Flag items expiring within this many days (default 90)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ low_stock_threshold, expiring_within_days }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const threshold = low_stock_threshold ?? 10;
    const days = expiring_within_days ?? 90;
    const cutoff = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
    const supabase = supabaseForUser(ctx);

    const [low, expiring] = await Promise.all([
      supabase
        .from("inventory")
        .select("id, medicine_name, batch_no, remaining_stock, expiry_date")
        .lte("remaining_stock", threshold)
        .order("remaining_stock")
        .limit(100),
      supabase
        .from("inventory")
        .select("id, medicine_name, batch_no, remaining_stock, expiry_date")
        .not("expiry_date", "is", null)
        .lte("expiry_date", cutoff)
        .order("expiry_date")
        .limit(100),
    ]);

    if (low.error) return errorResult(low.error.message);
    if (expiring.error) return errorResult(expiring.error.message);
    return jsonResult({
      low_stock_threshold: threshold,
      expiring_before: cutoff,
      low_stock: low.data ?? [],
      expiring_soon: expiring.data ?? [],
    });
  },
});
