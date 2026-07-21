import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface CurrentShop {
  id: string;
  code: string;
  name: string;
  owner_name: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
}

export function useCurrentShop() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["current-shop", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CurrentShop | null> => {
      const { data: shopId } = await supabase.rpc("current_shop_id");
      if (!shopId) return null;
      const { data, error } = await supabase
        .from("shops")
        .select("id, code, name, owner_name, email, phone, is_active")
        .eq("id", shopId as string)
        .maybeSingle();
      if (error) throw error;
      return (data as CurrentShop) ?? null;
    },
  });
}
