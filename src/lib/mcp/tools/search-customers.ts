import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "search_customers",
  title: "Search customers",
  description:
    "Search pharmacy customers by name or phone number. Returns contact details, regular medicines and next refill date.",
  inputSchema: {
    query: z.string().optional().describe("Part of a customer name or phone number."),
    refill_due_before: z.string().optional().describe("Only customers with a next refill date on or before this YYYY-MM-DD date."),
    limit: z.number().int().optional().describe("Maximum rows to return (default 25, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, refill_due_before, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const take = Math.min(Math.max(limit ?? 25, 1), 100);
    let q = supabaseForUser(ctx)
      .from("customers")
      .select("id, customer_name, customer_type, phone_number, address, regular_medicines, next_refill_date, remark")
      .order("customer_name")
      .limit(take);
    if (query) q = q.or(`customer_name.ilike.%${query}%,phone_number.ilike.%${query}%`);
    if (refill_due_before) q = q.not("next_refill_date", "is", null).lte("next_refill_date", refill_due_before);
    const { data, error } = await q;
    return error ? errorResult(error.message) : jsonResult(data ?? []);
  },
});
