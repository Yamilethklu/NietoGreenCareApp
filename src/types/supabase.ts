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
      admin_profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          lead_id: string | null
          reminder_at: string | null
          reminder_sent: boolean
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          lead_id?: string | null
          reminder_at?: string | null
          reminder_sent?: boolean
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          lead_id?: string | null
          reminder_at?: string | null
          reminder_sent?: boolean
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_members: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          last_service_date: string | null
          notes: string | null
          phone: string | null
          total_jobs: number
          total_revenue: number
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          last_service_date?: string | null
          notes?: string | null
          phone?: string | null
          total_jobs?: number
          total_revenue?: number
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          last_service_date?: string | null
          notes?: string | null
          phone?: string | null
          total_jobs?: number
          total_revenue?: number
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      gallery: {
        Row: {
          carousel_order: number | null
          created_at: string
          description: string | null
          id: string
          is_carousel: boolean
          is_featured: boolean
          is_published: boolean
          location: string | null
          public_url: string
          service_key: string | null
          storage_path: string | null
          taken_on: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          carousel_order?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_carousel?: boolean
          is_featured?: boolean
          is_published?: boolean
          location?: string | null
          public_url: string
          service_key?: string | null
          storage_path?: string | null
          taken_on?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          carousel_order?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_carousel?: boolean
          is_featured?: boolean
          is_published?: boolean
          location?: string | null
          public_url?: string
          service_key?: string | null
          storage_path?: string | null
          taken_on?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          additional_notes: string | null
          address: string
          admin_notes: string | null
          area_sq_ft: number
          area_sq_yd: number
          assigned_crew: string | null
          cancelled_at: string | null
          city: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          depth_inches: number
          details: string | null
          estimated_cubic_yards: number
          estimated_price: number | null
          final_price: number | null
          formatted_address: string | null
          gate_code: string | null
          has_gate_code: boolean
          id: string
          latitude: number | null
          longitude: number | null
          map_bounds: Json | null
          notification_email_sent: boolean
          notification_error: string | null
          notification_sms_sent: boolean
          payment_method: Database["public"]["Enums"]["payment_method"]
          place_id: string | null
          polygon: Json | null
          polygon_path: string | null
          quote_options: Json
          reference_code: string
          requested_date: string | null
          requested_time_window: string | null
          scheduled_for: string | null
          selected_services: Json
          service_count: number
          snapshot_url: string | null
          source: string
          state: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          zip_code: string
        }
        Insert: {
          additional_notes?: string | null
          address: string
          admin_notes?: string | null
          area_sq_ft?: number
          area_sq_yd?: number
          assigned_crew?: string | null
          cancelled_at?: string | null
          city?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          depth_inches?: number
          details?: string | null
          estimated_cubic_yards?: number
          estimated_price?: number | null
          final_price?: number | null
          formatted_address?: string | null
          gate_code?: string | null
          has_gate_code?: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          map_bounds?: Json | null
          notification_email_sent?: boolean
          notification_error?: string | null
          notification_sms_sent?: boolean
          payment_method?: Database["public"]["Enums"]["payment_method"]
          place_id?: string | null
          polygon?: Json | null
          polygon_path?: string | null
          quote_options?: Json
          reference_code: string
          requested_date?: string | null
          requested_time_window?: string | null
          scheduled_for?: string | null
          selected_services?: Json
          service_count?: number
          snapshot_url?: string | null
          source?: string
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          zip_code: string
        }
        Update: {
          additional_notes?: string | null
          address?: string
          admin_notes?: string | null
          area_sq_ft?: number
          area_sq_yd?: number
          assigned_crew?: string | null
          cancelled_at?: string | null
          city?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          depth_inches?: number
          details?: string | null
          estimated_cubic_yards?: number
          estimated_price?: number | null
          final_price?: number | null
          formatted_address?: string | null
          gate_code?: string | null
          has_gate_code?: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          map_bounds?: Json | null
          notification_email_sent?: boolean
          notification_error?: string | null
          notification_sms_sent?: boolean
          payment_method?: Database["public"]["Enums"]["payment_method"]
          place_id?: string | null
          polygon?: Json | null
          polygon_path?: string | null
          quote_options?: Json
          reference_code?: string
          requested_date?: string | null
          requested_time_window?: string | null
          scheduled_for?: string | null
          selected_services?: Json
          service_count?: number
          snapshot_url?: string | null
          source?: string
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_history"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          capacity_per_day: number
          created_at: string
          default_depth_inches: number
          duration_minutes: number
          id: string
          is_active: boolean
          max_sq_ft: number | null
          min_sq_ft: number
          name: string
          notes: string | null
          price: number
          price_per_cubic_yard: number | null
          price_per_sq_ft: number | null
          service_key: string | null
          updated_at: string
        }
        Insert: {
          capacity_per_day?: number
          created_at?: string
          default_depth_inches?: number
          duration_minutes?: number
          id?: string
          is_active?: boolean
          max_sq_ft?: number | null
          min_sq_ft?: number
          name: string
          notes?: string | null
          price?: number
          price_per_cubic_yard?: number | null
          price_per_sq_ft?: number | null
          service_key?: string | null
          updated_at?: string
        }
        Update: {
          capacity_per_day?: number
          created_at?: string
          default_depth_inches?: number
          duration_minutes?: number
          id?: string
          is_active?: boolean
          max_sq_ft?: number | null
          min_sq_ft?: number
          name?: string
          notes?: string | null
          price?: number
          price_per_cubic_yard?: number | null
          price_per_sq_ft?: number | null
          service_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_plans: {
        Row: {
          active: boolean
          cadence: string
          created_at: string
          crew_member_id: string | null
          duration_minutes: number
          first_date: string
          id: string
          lead_id: string
          notes: string | null
          preferred_start: string
          price_per_visit: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          cadence: string
          created_at?: string
          crew_member_id?: string | null
          duration_minutes: number
          first_date: string
          id?: string
          lead_id: string
          notes?: string | null
          preferred_start?: string
          price_per_visit: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          cadence?: string
          created_at?: string
          crew_member_id?: string | null
          duration_minutes?: number
          first_date?: string
          id?: string
          lead_id?: string
          notes?: string | null
          preferred_start?: string
          price_per_visit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_plans_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "crew_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_plans_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      site_sections: {
        Row: {
          body: string
          id: string
          section: string
          title: string
          visible: boolean
        }
        Insert: {
          body?: string
          id?: string
          section: string
          title?: string
          visible?: boolean
        }
        Update: {
          body?: string
          id?: string
          section?: string
          title?: string
          visible?: boolean
        }
        Relationships: []
      }
      weekly_summaries: {
        Row: {
          cancelled_orders: number
          completed_orders: number
          created_at: string
          generated_at: string
          id: string
          notes: string | null
          paid_orders: number
          total_collected: number
          unpaid_orders: number
          updated_at: string
          week_end: string
          week_start: string
        }
        Insert: {
          cancelled_orders?: number
          completed_orders?: number
          created_at?: string
          generated_at?: string
          id?: string
          notes?: string | null
          paid_orders?: number
          total_collected?: number
          unpaid_orders?: number
          updated_at?: string
          week_end: string
          week_start: string
        }
        Update: {
          cancelled_orders?: number
          completed_orders?: number
          created_at?: string
          generated_at?: string
          id?: string
          notes?: string | null
          paid_orders?: number
          total_collected?: number
          unpaid_orders?: number
          updated_at?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      work_invoices: {
        Row: {
          created_at: string
          customer_email: string | null
          email_error: string | null
          id: string
          invoice_number: string
          issued_at: string
          order_id: string
          sent_at: string | null
          sent_by: string | null
          total: number
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          email_error?: string | null
          id?: string
          invoice_number: string
          issued_at?: string
          order_id: string
          sent_at?: string | null
          sent_by?: string | null
          total: number
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          email_error?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string
          order_id?: string
          sent_at?: string | null
          sent_by?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "work_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          completed_at: string | null
          created_at: string
          crew_member_id: string | null
          duration_minutes: number
          id: string
          lead_id: string
          notes: string | null
          paid_amount: number
          paid_at: string | null
          payment_method: string | null
          plan_id: string | null
          price: number
          service_date: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          crew_member_id?: string | null
          duration_minutes: number
          id?: string
          lead_id: string
          notes?: string | null
          paid_amount?: number
          paid_at?: string | null
          payment_method?: string | null
          plan_id?: string | null
          price: number
          service_date: string
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          crew_member_id?: string | null
          duration_minutes?: number
          id?: string
          lead_id?: string
          notes?: string | null
          paid_amount?: number
          paid_at?: string | null
          payment_method?: string | null
          plan_id?: string | null
          price?: number
          service_date?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "crew_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      customer_history: {
        Row: {
          cancelled_jobs: number | null
          city: string | null
          completed_jobs: number | null
          customer_id: string | null
          email: string | null
          full_name: string | null
          last_activity_at: string | null
          last_requested_date: string | null
          phone: string | null
          scheduled_jobs: number | null
          total_paid: number | null
          total_requests: number | null
          zip_code: string | null
        }
        Relationships: []
      }
      dashboard_metrics: {
        Row: {
          average_ticket: number | null
          cancelled_leads: number | null
          completed_jobs: number | null
          pending_leads: number | null
          pipeline_revenue: number | null
          scheduled_leads: number | null
          total_customers: number | null
          total_leads: number | null
          total_revenue: number | null
          total_sq_ft_measured: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      edit_invoice_group: {
        Args: { p_invoice_id: string; p_items: Json }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      pay_invoice_group:
        | {
            Args: { p_invoice_id: string; p_method: string }
            Returns: undefined
          }
        | {
            Args: {
              p_invoice_id: string
              p_method: string
              p_payment_date: string
            }
            Returns: undefined
          }
      refresh_recurring_visits: {
        Args: { p_plan_id?: string }
        Returns: number
      }
      save_mobile_house: {
        Args: {
          p_cadence: string
          p_date: string
          p_house: Json
          p_id: string
          p_notes: string
          p_price: number
        }
        Returns: Json
      }
    }
    Enums: {
      lead_status: "pending" | "scheduled" | "completed" | "cancelled"
      payment_method: "cash" | "transfer" | "on_completion"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      lead_status: ["pending", "scheduled", "completed", "cancelled"],
      payment_method: ["cash", "transfer", "on_completion"],
    },
  },
} as const
