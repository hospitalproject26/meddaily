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
  items: z
    .array(
      z.object({
        medicine_name: z.string(),
        quantity: z.number().int().min(1).max(999).default(1),
        unit: z.enum(["strip", "tablet"]).default("strip"),
        notes: z.string().optional(),
      }),
    )
    .default([]),
});

export const scanPrescription = createServerFn({ method: "POST" })
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
              "You are a pharmacist's assistant. Extract every medicine prescribed from the photo. Return brand name as written. Quantity = number of strips/tablets prescribed (use 1 if unclear). Use unit='strip' unless the doctor clearly wrote individual tablets/capsules. Ignore dosage instructions, frequencies, and notes — only the prescribed item list.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the prescribed medicines from this image." },
              {
                type: "image",
                image: `data:${data.mimeType};base64,${data.imageBase64}`,
              },
            ],
          },
        ],
      });
      extracted = experimental_output;
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (msg.includes("429")) throw new Error("AI rate limit reached. Please retry in a moment.");
      if (msg.includes("402")) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
      throw new Error("Could not read prescription. Try a clearer photo.");
    }

    // Match against inventory (RLS-scoped via auth middleware)
    const { supabase } = context;
    const matched: Array<{
      inventory: any;
      requested_name: string;
      quantity: number;
      unit: "strip" | "tablet";
    }> = [];
    const unmatched: string[] = [];

    for (const item of extracted.items) {
      const name = item.medicine_name.trim();
      if (!name) continue;
      const tokens = name.split(/\s+/).filter((t) => t.length >= 3);
      const seen = new Map<string, any>();
      for (const tok of tokens.slice(0, 3)) {
        const { data: hits } = await supabase
          .from("inventory")
          .select("*")
          .ilike("medicine_name", `%${tok}%`)
          .gt("remaining_stock", 0)
          .limit(10);
        (hits ?? []).forEach((h: any) => { if (!seen.has(h.id)) seen.set(h.id, h); });
      }
      const candidates = Array.from(seen.values());
      const score = (c: any) => {
        const cn = c.medicine_name.toLowerCase();
        const nn = name.toLowerCase();
        if (cn === nn) return 100;
        const ctoks = cn.split(/\s+/);
        const ntoks = nn.split(/\s+/);
        const overlap = ntoks.filter((t) => ctoks.some((x) => x.startsWith(t) || t.startsWith(x))).length;
        return (overlap / Math.max(ntoks.length, 1)) * 100;
      };
      candidates.sort((a, b) => score(b) - score(a));
      const best = candidates[0];
      if (best && score(best) >= 40) {
        matched.push({ inventory: best, requested_name: name, quantity: item.quantity, unit: item.unit });
      } else {
        unmatched.push(name);
      }
    }

    return { matched, unmatched };
  });
