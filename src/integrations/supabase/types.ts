export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      bookings: {
        Row: {
          business_id: string;
          created_at: string | null;
          customer_id: string;
          end_time: string;
          id: string;
          location_id: string | null;
          notes: string | null;
          payment_status: string | null;
          price: number | null;
          service_id: string;
          staff_id: string;
          start_time: string;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          business_id: string;
          created_at?: string | null;
          customer_id: string;
          end_time: string;
          id?: string;
          location_id?: string | null;
          notes?: string | null;
          payment_status?: string | null;
          price?: number | null;
          service_id: string;
          staff_id: string;
          start_time: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          business_id?: string;
          created_at?: string | null;
          customer_id?: string;
          end_time?: string;
          id?: string;
          location_id?: string | null;
          notes?: string | null;
          payment_status?: string | null;
          price?: number | null;
          service_id?: string;
          staff_id?: string;
          start_time?: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      business_members: {
        Row: {
          business_id: string | null;
          created_at: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          invite_status: string | null;
          invited_email: string | null;
          role: string | null;
          user_id: string | null;
        };
        Insert: {
          business_id?: string | null;
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          invite_status?: string | null;
          invited_email?: string | null;
          role?: string | null;
          user_id?: string | null;
        };
        Update: {
          business_id?: string | null;
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          invite_status?: string | null;
          invited_email?: string | null;
          role?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      businesses: {
        Row: {
          address: string | null;
          booking_buffer_minutes: number;
          cancellation_notice_hours: number;
          created_at: string | null;
          created_by: string | null;
          currency: string | null;
          description: string | null;
          email: string | null;
          id: string;
          logo_url: string | null;
          name: string;
          onboarding_completed: boolean | null;
          phone: string | null;
          plan: string | null;
          plan_status: string | null;
          primary_color: string | null;
          reminder_lead_minutes: number;
          slug: string;
          timezone: string | null;
          updated_at: string | null;
          website: string | null;
        };
        Insert: {
          address?: string | null;
          booking_buffer_minutes?: number;
          cancellation_notice_hours?: number;
          created_at?: string | null;
          created_by?: string | null;
          currency?: string | null;
          description?: string | null;
          email?: string | null;
          id?: string;
          logo_url?: string | null;
          name: string;
          onboarding_completed?: boolean | null;
          phone?: string | null;
          plan?: string | null;
          plan_status?: string | null;
          primary_color?: string | null;
          reminder_lead_minutes?: number;
          slug: string;
          timezone?: string | null;
          updated_at?: string | null;
          website?: string | null;
        };
        Update: {
          address?: string | null;
          booking_buffer_minutes?: number;
          cancellation_notice_hours?: number;
          created_at?: string | null;
          created_by?: string | null;
          currency?: string | null;
          description?: string | null;
          email?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          onboarding_completed?: boolean | null;
          phone?: string | null;
          plan?: string | null;
          plan_status?: string | null;
          primary_color?: string | null;
          reminder_lead_minutes?: number;
          slug?: string;
          timezone?: string | null;
          updated_at?: string | null;
          website?: string | null;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          business_id: string;
          created_at: string | null;
          email: string | null;
          id: string;
          last_visit_at: string | null;
          name: string;
          notes: string | null;
          phone: string | null;
          tags: string[] | null;
          total_spent: number | null;
          total_visits: number | null;
        };
        Insert: {
          business_id: string;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          last_visit_at?: string | null;
          name: string;
          notes?: string | null;
          phone?: string | null;
          tags?: string[] | null;
          total_spent?: number | null;
          total_visits?: number | null;
        };
        Update: {
          business_id?: string;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          last_visit_at?: string | null;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          tags?: string[] | null;
          total_spent?: number | null;
          total_visits?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      holidays: {
        Row: {
          business_id: string;
          created_at: string;
          holiday_date: string;
          id: string;
          name: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          holiday_date: string;
          id?: string;
          name: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          holiday_date?: string;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "holidays_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      locations: {
        Row: {
          address: string | null;
          business_id: string;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          phone: string | null;
        };
        Insert: {
          address?: string | null;
          business_id: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          phone?: string | null;
        };
        Update: {
          address?: string | null;
          business_id?: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          phone?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "locations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          booking_id: string | null;
          business_id: string;
          channel: string | null;
          created_at: string | null;
          id: string;
          recipient: string | null;
          sent_at: string | null;
          status: string | null;
          subject: string | null;
          type: string;
        };
        Insert: {
          body?: string | null;
          booking_id?: string | null;
          business_id: string;
          channel?: string | null;
          created_at?: string | null;
          id?: string;
          recipient?: string | null;
          sent_at?: string | null;
          status?: string | null;
          subject?: string | null;
          type: string;
        };
        Update: {
          body?: string | null;
          booking_id?: string | null;
          business_id?: string;
          channel?: string | null;
          created_at?: string | null;
          id?: string;
          recipient?: string | null;
          sent_at?: string | null;
          status?: string | null;
          subject?: string | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          booking_id: string;
          business_id: string;
          created_at: string | null;
          id: string;
          method: string | null;
          notes: string | null;
          processed_by: string | null;
          reference: string | null;
          status: string | null;
        };
        Insert: {
          amount?: number;
          booking_id: string;
          business_id: string;
          created_at?: string | null;
          id?: string;
          method?: string | null;
          notes?: string | null;
          processed_by?: string | null;
          reference?: string | null;
          status?: string | null;
        };
        Update: {
          amount?: number;
          booking_id?: string;
          business_id?: string;
          created_at?: string | null;
          id?: string;
          method?: string | null;
          notes?: string | null;
          processed_by?: string | null;
          reference?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          business_id: string;
          category: string | null;
          color: string | null;
          created_at: string | null;
          description: string | null;
          duration_minutes: number;
          id: string;
          is_active: boolean | null;
          name: string;
          price: number;
        };
        Insert: {
          business_id: string;
          category?: string | null;
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          duration_minutes?: number;
          id?: string;
          is_active?: boolean | null;
          name: string;
          price?: number;
        };
        Update: {
          business_id?: string;
          category?: string | null;
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          duration_minutes?: number;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      staff: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          business_id: string;
          created_at: string | null;
          email: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          phone: string | null;
          role: string | null;
          user_id: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          business_id: string;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          phone?: string | null;
          role?: string | null;
          user_id?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          business_id?: string;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          phone?: string | null;
          role?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "staff_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      working_hours: {
        Row: {
          day_of_week: number;
          end_time: string;
          id: string;
          is_working: boolean | null;
          staff_id: string;
          start_time: string;
        };
        Insert: {
          day_of_week: number;
          end_time?: string;
          id?: string;
          is_working?: boolean | null;
          staff_id: string;
          start_time?: string;
        };
        Update: {
          day_of_week?: number;
          end_time?: string;
          id?: string;
          is_working?: boolean | null;
          staff_id?: string;
          start_time?: string;
        };
        Relationships: [
          {
            foreignKeyName: "working_hours_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_public_booking: {
        Args: {
          p_business_slug: string;
          p_customer_email: string | null;
          p_customer_name: string;
          p_customer_phone: string | null;
          p_end_time: string;
          p_location_id: string | null;
          p_service_id: string;
          p_staff_id: string;
          p_start_time: string;
        };
        Returns: Json;
      };
      get_available_slots: {
        Args: {
          p_business_slug: string;
          p_date: string;
          p_service_id: string;
          p_staff_id: string;
        };
        Returns: Json;
      };
      is_business_member: { Args: { b_id: string }; Returns: boolean };
      public_create_booking: {
        Args: {
          p_business_slug: string;
          p_customer_email: string | null;
          p_customer_name: string;
          p_customer_phone: string | null;
          p_end_time: string;
          p_location_id: string | null;
          p_service_id: string;
          p_staff_id: string;
          p_start_time: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
