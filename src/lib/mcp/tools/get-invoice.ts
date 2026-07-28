import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "get_invoice",
  title: "Get invoice details",
  description: "Fetch one sales invoice with all of its line items, by invoice number or order id.",
  inputSchema: {
    invoice_number: z.string().optional().describe("The invoice number shown on the bill."),
    order_id: z.string().optional().describe("The internal order id (UUID)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ invoice_number, order_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    if (!invoice_number && !order_id) return errorResult("Provide either invoice_number or order_id.");
    const supabase = supabaseForUser(ctx);

    let q = supabase.from("orders").select("*").limit(1);
    q = order_id ? q.eq("id", order_id) : q.eq("invoice_number", invoice_number!);
    const { data: order, error } = await q.maybeSingle();
    if (error) return errorResult(error.message);
    if (!order) return errorResult("Invoice not found.");

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("medicine_name, batch_no, unit_type, quantity_sold, mrp, discount_amount, gst_percent, gst_amount, final_item_total")
      .eq("order_id", (order as { id: string }).id);
    if (itemsError) return errorResult(itemsError.message);

    return jsonResult({ order, items: items ?? [] });
  },
});
