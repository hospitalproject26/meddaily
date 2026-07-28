import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "search_inventory",
  title: "Search inventory",
  description:
    "Search the pharmacy's medicine inventory by name, with optional category filter. Returns stock, batch, expiry and pricing.",
  inputSchema: {
    query: z.string().optional().describe("Part of the medicine name to search for."),
    category: z.enum(["GM", "SM", "GI"]).optional().describe("Medicine category filter."),
    limit: z.number().int().optional().describe("Maximum rows to return (default 25, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const take = Math.min(Math.max(limit ?? 25, 1), 100);
    let q = supabaseForUser(ctx)
      .from("inventory")
      .select(
        "id, medicine_name, category, batch_no, unit_type, pack_size, stock, remaining_stock, expiry_date, mrp_per_strip, mrp_per_tablet, ptr_per_strip, gst_percent",
      )
      .order("medicine_name")
      .limit(take);
    if (query) q = q.ilike("medicine_name", `%${query}%`);
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    return error ? errorResult(error.message) : jsonResult(data ?? []);
  },
});
