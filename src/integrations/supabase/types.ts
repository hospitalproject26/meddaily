export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          address: string | null
          created_at: string
          customer_name: string
          customer_type: Database["public"]["Enums"]["customer_type"]
          id: string
          next_refill_date: string | null
          phone_number: string | null
          regular_medicines: string | null
          remark: string | null
          shop_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          customer_name: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          id?: string
          next_refill_date?: string | null
          phone_number?: string | null
          regular_medicines?: string | null
          remark?: string | null
          shop_id?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          customer_name?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          id?: string
          next_refill_date?: string | null
          phone_number?: string | null
          regular_medicines?: string | null
          remark?: string | null
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_bill_items: {
        Row: {
          batch_no: string | null
          bill_id: string
          created_at: string
          expiry_date: string | null
          free_quantity: number
          gst_percent: number
          id: string
          inventory_id: string | null
          medicine_name: string
          mrp_per_strip: number
          ptr_per_strip: number
          quantity: number
          shop_id: string
          total_amount: number
        }
        Insert: {
          batch_no?: string | null
          bill_id: string
          created_at?: string
          expiry_date?: string | null
          free_quantity?: number
          gst_percent?: number
          id?: string
          inventory_id?: string | null
          medicine_name: string
          mrp_per_strip?: number
          ptr_per_strip?: number
          quantity?: number
          shop_id?: string
          total_amount?: number
        }
        Update: {
          batch_no?: string | null
          bill_id?: string
          created_at?: string
          expiry_date?: string | null
          free_quantity?: number
          gst_percent?: number
          id?: string
          inventory_id?: string | null
          medicine_name?: string
          mrp_per_strip?: number
          ptr_per_strip?: number
          quantity?: number
          shop_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "distributor_bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "distributor_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributor_bill_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributor_bill_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_bills: {
        Row: {
          bill_date: string
          created_at: string
          created_by: string | null
          distributor_id: string | null
          distributor_name: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          shop_id: string
          total_amount: number
        }
        Insert: {
          bill_date?: string
          created_at?: string
          created_by?: string | null
          distributor_id?: string | null
          distributor_name?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          shop_id?: string
          total_amount?: number
        }
        Update: {
          bill_date?: string
          created_at?: string
          created_by?: string | null
          distributor_id?: string | null
          distributor_name?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          shop_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "distributor_bills_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributor_bills_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      distributors: {
        Row: {
          address: string | null
          created_at: string
          distributor_name: string
          id: string
          medicines_available: string | null
          mobile_number: string | null
          shop_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          distributor_name: string
          id?: string
          medicines_available?: string | null
          mobile_number?: string | null
          shop_id?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          distributor_name?: string
          id?: string
          medicines_available?: string | null
          mobile_number?: string | null
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "distributors_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          batch_no: string | null
          category: string
          created_at: string
          distributor_id: string | null
          expiry_date: string | null
          gst_percent: number
          id: string
          medicine_name: string
          mrp_per_strip: number
          mrp_per_tablet: number
          pack_size: number
          ptr_per_strip: number
          ptr_per_tablet: number
          remaining_stock: number
          serial_number: number
          shop_id: string
          stock: number
          unit_type: string
        }
        Insert: {
          batch_no?: string | null
          category?: string
          created_at?: string
          distributor_id?: string | null
          expiry_date?: string | null
          gst_percent?: number
          id?: string
          medicine_name: string
          mrp_per_strip?: number
          mrp_per_tablet?: number
          pack_size?: number
          ptr_per_strip?: number
          ptr_per_tablet?: number
          remaining_stock?: number
          serial_number?: number
          shop_id?: string
          stock?: number
          unit_type?: string
        }
        Update: {
          batch_no?: string | null
          category?: string
          created_at?: string
          distributor_id?: string | null
          expiry_date?: string | null
          gst_percent?: number
          id?: string
          medicine_name?: string
          mrp_per_strip?: number
          mrp_per_tablet?: number
          pack_size?: number
          ptr_per_strip?: number
          ptr_per_tablet?: number
          remaining_stock?: number
          serial_number?: number
          shop_id?: string
          stock?: number
          unit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          batch_no: string | null
          created_at: string
          discount_amount: number
          discount_per_medicine: number
          final_item_total: number
          gst_amount: number
          gst_percent: number
          id: string
          inventory_id: string
          medicine_name: string
          mrp: number
          order_id: string
          quantity_sold: number
          shop_id: string
          unit_type: string
        }
        Insert: {
          batch_no?: string | null
          created_at?: string
          discount_amount?: number
          discount_per_medicine?: number
          final_item_total: number
          gst_amount?: number
          gst_percent?: number
          id?: string
          inventory_id: string
          medicine_name: string
          mrp: number
          order_id: string
          quantity_sold: number
          shop_id?: string
          unit_type?: string
        }
        Update: {
          batch_no?: string | null
          created_at?: string
          discount_amount?: number
          discount_per_medicine?: number
          final_item_total?: number
          gst_amount?: number
          gst_percent?: number
          id?: string
          inventory_id?: string
          medicine_name?: string
          mrp?: number
          order_id?: string
          quantity_sold?: number
          shop_id?: string
          unit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          date: string
          gst_amount: number
          id: string
          invoice_number: string | null
          mobile_number: string | null
          payment_method: string
          received_amount: number
          shop_id: string
          total_amount: number
          total_discount: number
          total_profit: number
          total_rate: number
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          date?: string
          gst_amount?: number
          id?: string
          invoice_number?: string | null
          mobile_number?: string | null
          payment_method?: string
          received_amount?: number
          shop_id?: string
          total_amount?: number
          total_discount?: number
          total_profit?: number
          total_rate?: number
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          date?: string
          gst_amount?: number
          id?: string
          invoice_number?: string | null
          mobile_number?: string | null
          payment_method?: string
          received_amount?: number
          shop_id?: string
          total_amount?: number
          total_discount?: number
          total_profit?: number
          total_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      shop_members: {
        Row: {
          created_at: string
          id: string
          role: string
          shop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          shop_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_members_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          owner_user_id: string | null
          plan: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          owner_user_id?: string | null
          plan?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_user_id?: string | null
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_shop_id: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_shop_admin: { Args: { _shop_id: string }; Returns: boolean }
      is_shop_member: { Args: { _shop_id: string }; Returns: boolean }
      list_pending_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          name: string
        }[]
      }
      my_assignment_status: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "Owner" | "Staff" | "SuperAdmin"
      customer_type: "Home Delivery" | "Ordinary"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["Owner", "Staff", "SuperAdmin"],
      customer_type: ["Home Delivery", "Ordinary"],
    },
  },
} as const
