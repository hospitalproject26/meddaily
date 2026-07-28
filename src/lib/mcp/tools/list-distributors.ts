import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_distributors",
  title: "List distributors",
  description: "List the pharmacy's distributors with contact details and the medicines they supply.",
  inputSchema: {
    query: z.string().optional().describe("Part of a distributor name to filter by."),
    limit: z.number().int().optional().describe("Maximum rows to return (default 50, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const take = Math.min(Math.max(limit ?? 50, 1), 100);
    let q = supabaseForUser(ctx)
      .from("distributors")
      .select("id, distributor_name, mobile_number, address, medicines_available")
      .order("distributor_name")
      .limit(take);
    if (query) q = q.ilike("distributor_name", `%${query}%`);
    const { data, error } = await q;
    return error ? errorResult(error.message) : jsonResult(data ?? []);
  },
});
