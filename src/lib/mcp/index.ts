import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchInventoryTool from "./tools/search-inventory";
import stockAlertsTool from "./tools/stock-alerts";
import salesSummaryTool from "./tools/sales-summary";
import searchCustomersTool from "./tools/search-customers";
import listDistributorsTool from "./tools/list-distributors";
import getInvoiceTool from "./tools/get-invoice";

// Must be the direct Supabase host; the published SUPABASE_URL is a proxy form.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "smart-pharmacy-manager",
  title: "Smart Pharmacy Manager",
  version: "0.1.0",
  instructions:
    "Read-only tools for a pharmacy's own Smart Pharmacy Manager data. Use `search_inventory` for medicine stock and pricing, `stock_alerts` for low stock and near-expiry items, `sales_summary` for revenue and profit over a date range, `get_invoice` for a single bill, `search_customers` for customers and refill reminders, and `list_distributors` for suppliers. All data is scoped to the signed-in user's pharmacy.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    searchInventoryTool,
    stockAlertsTool,
    salesSummaryTool,
    getInvoiceTool,
    searchCustomersTool,
    listDistributorsTool,
  ],
});
