import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const InputSchema = z.object({
  imageBase64: z.string().min(20),
  mimeType: z.string().min(3).max(64),
});

const ExtractionSchema = z.object({
  distributor_name: z.string().optional().default(""),
  invoice_number: z.string().optional().default(""),
  bill_date: z.string().optional().default(""),
  items: z
    .array(
      z.object({
        medicine_name: z.string(),
        batch_no: z.string().optional().default(""),
        expiry_date: z.string().optional().default(""),
        quantity: z.number().min(0).default(0),
        free_quantity: z.number().min(0).default(0),
        ptr_per_strip: z.number().min(0).default(0),
        mrp_per_strip: z.number().min(0).default(0),
        gst_percent: z.number().min(0).max(100).default(0),
        total_amount: z.number().min(0).default(0),
      }),
    )
    .default([]),
});

export const scanDistributorBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-2.5-pro");

    let extracted: z.infer<typeof ExtractionSchema>;
    try {
      const { experimental_output } = await generateText({
        model,
        experimental_output: Output.object({ schema: ExtractionSchema }),
        messages: [
          {
            role: "system",
            content:
              "You extract structured data from Indian pharmaceutical distributor invoices (Hindi/English). Read distributor name, invoice number, bill date (YYYY-MM-DD), and every medicine row. For each row capture: medicine_name, batch_no, expiry_date (YYYY-MM-DD; if MM/YY use last day of that month), quantity (strips), free_quantity, ptr_per_strip (purchase rate), mrp_per_strip, gst_percent, total_amount. Use 0 for missing numbers and empty string for missing text. Do not invent items.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the distributor bill from this image." },
              { type: "image", image: `data:${data.mimeType};base64,${data.imageBase64}` },
            ],
          },
        ],
      });
      extracted = experimental_output;
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (msg.includes("429")) throw new Error("AI rate limit reached. Please retry in a moment.");
      if (msg.includes("402")) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
      throw new Error("Could not read bill. Try a clearer photo.");
    }

    // Smart match each item against inventory
    const { supabase } = context;
    const enriched = await Promise.all(
      extracted.items.map(async (item) => {
        const name = item.medicine_name.trim();
        let inventory_id: string | null = null;
        let matched_name: string | null = null;
        if (name) {
          const firstWord = name.split(/\s+/)[0];
          const { data: hits } = await supabase
            .from("inventory")
            .select("id, medicine_name")
            .ilike("medicine_name", `%${firstWord}%`)
            .limit(5);
          const best =
            (hits ?? []).find((h: any) => h.medicine_name.toLowerCase() === name.toLowerCase()) ??
            (hits ?? [])[0];
          if (best) {
            inventory_id = best.id;
            matched_name = best.medicine_name;
          }
        }
        return { ...item, inventory_id, matched_name };
      }),
    );

    return { ...extracted, items: enriched };
  });
