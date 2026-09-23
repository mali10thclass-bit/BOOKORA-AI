export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// AI Agent Studio tables are maintained here alongside the generated Supabase schema until live schema generation is restored.

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
      },
      resources: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          type: string;
          capacity: number;
          location_id: string|null;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          business_id: string;
          name: string;
          type?: string;
          capacity?: number;
          location_id?: string|null;
          description?: string | null;
          is_active?: boolean;
        };
        Update: {
          business_id?: string;
          name?: string;
          type?: string;
          capacity?: number;
          location_id?: string|null;
          description?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      waitlist_entries: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string;
          service_id: string | null;
          preferred_start: string|null;
          preferred_end: string|null;
          status: string;
          priority: number;
          notes: string|null;
          created_at: string;
        };
        Insert: {
          business_id: string;
          customer_id: string;
          service_id: string | null;
          preferred_start?: string|null;
          preferred_end?: string|null;
          status?: string;
          priority?: number;
          notes?: string|null;
        };
        Update: {
          business_id?: string;
          customer_id?: string;
          service_id?: string;
          preferred_start?: string|null;
          preferred_end?: string|null;
          status?: string;
          notes?: string|null;
        };
        Relationships: [];
      };
      packages: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          description: string|null;
          price: number;
          validity_days: number|null;
          credits: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          business_id: string;
          name: string;
          description?: string|null;
          price?: number;
          validity_days?: number|null;
          credits?: number;
          is_active?: boolean;
        };
        Update: {
          business_id?: string;
          name?: string;
          description?: string|null;
          price?: number;
          validity_days?: number|null;
          credits?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      forms: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          description: string|null;
          schema: Json;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          business_id: string;
          name: string;
          description?: string|null;
          schema?: Json;
          is_active?: boolean;
        };
        Update: {
          business_id?: string;
          name?: string;
          description?: string|null;
          schema?: Json;
          is_active?: boolean;
        };
        Relationships: [];
      };
      crm_leads: {
        Row: { id: string; business_id: string; name: string; source: string; status: string; value: number; created_at: string };
        Insert: { business_id: string; name: string; source?: string; status?: string; value?: number; };
        Update: { business_id?: string; name?: string; source?: string; status?: string; value?: number; };
        Relationships: [];
      };
      business_tasks: {
        Row: { id: string; business_id: string; title: string; priority: string; status: string; due_at: string | null; created_at: string };
        Insert: { business_id: string; title: string; priority?: string; status?: string; due_at?: string | null; };
        Update: { business_id?: string; title?: string; priority?: string; status?: string; due_at?: string | null; };
        Relationships: [];
      };
      inventory_products: {
        Row: { id: string; business_id: string; name: string; sku: string | null; quantity: number; reorder_level: number; unit: string; created_at: string };
        Insert: { business_id: string; name: string; sku?: string | null; quantity?: number; reorder_level?: number; unit?: string; };
        Update: { business_id?: string; name?: string; sku?: string | null; quantity?: number; reorder_level?: number; unit?: string; };
        Relationships: [];
      };
      support_tickets: {
        Row: { id: string; business_id: string; subject: string; priority: string; status: string; channel: string; created_at: string };
        Insert: { business_id: string; subject: string; priority?: string; status?: string; channel?: string; };
        Update: { business_id?: string; subject?: string; priority?: string; status?: string; channel?: string; };
        Relationships: [];
      };
      marketing_campaigns: {
        Row: { id: string; business_id: string; name: string; channel: string; status: string; created_at: string };
        Insert: { business_id: string; name: string; channel?: string; status?: string; };
        Update: { business_id?: string; name?: string; channel?: string; status?: string; };
        Relationships: [];
      };
      ai_knowledge_sources: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          source_type: string;
          source_url: string | null;
          content_text: string | null;
          metadata: Json;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          name: string;
          source_type?: string;
          source_url?: string | null;
          content_text?: string | null;
          metadata?: Json;
          status?: string;
        };
        Update: {
          business_id?: string;
          name?: string;
          source_type?: string;
          source_url?: string | null;
          content_text?: string | null;
          metadata?: Json;
          status?: string;
        };
        Relationships: [];
      };
      ai_training_runs: {
        Row: {
          id: string;
          business_id: string;
          prompt: string;
          expected_answer: string|null;
          actual_answer: string|null;
          score: number|null;
          created_at: string;
        };
        Insert: {
          business_id: string;
          prompt: string;
          expected_answer?: string|null;
          actual_answer?: string|null;
          score?: number|null;
        };
        Update: {
          business_id?: string;
          prompt?: string;
          expected_answer?: string|null;
          actual_answer?: string|null;
          score?: number|null;
        };
        Relationships: [];
      };
      automation_workflows: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          description: string|null;
          trigger_type: string;
          definition: Json;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          business_id: string;
          name: string;
          description?: string|null;
          trigger_type: string;
          definition?: Json;
          is_active?: boolean;
        };
        Update: {
          business_id?: string;
          name?: string;
          description?: string|null;
          trigger_type?: string;
          definition?: Json;
          is_active?: boolean;
        };
        Relationships: [];
      };
      automation_runs: {
        Row: {
          id: string;
          workflow_id: string;
          business_id: string;
          status: string;
          input: Json;
          output: Json;
          started_at: string|null;
          completed_at: string|null;
          created_at: string;
        };
        Insert: {
          workflow_id: string;
          business_id: string;
          status?: string;
          input?: Json;
          output?: Json;
          started_at?: string|null;
          completed_at?: string|null;
        };
        Update: {
          workflow_id?: string;
          business_id?: string;
          status?: string;
          input?: Json;
          output?: Json;
          started_at?: string|null;
          finished_at?: string|null;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string|null;
          rating: number;
          title: string|null;
          body: string|null;
          source: string;
          status: string;
          response: string | null;
          created_at: string;
        };
        Insert: {
          business_id: string;
          customer_id?: string|null;
          rating: number;
          title?: string|null;
          body?: string|null;
          source?: string;
          status?: string;
          response?: string | null;
        };
        Update: {
          business_id?: string;
          customer_id?: string|null;
          rating?: number;
          title?: string|null;
          body?: string|null;
          source?: string;
          status?: string;
          response?: string | null;
        };
        Relationships: [];
      };
      api_keys: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          scopes: string[];
          created_by: string|null;
          revoked_at: string|null;
          expires_at: string|null;
          created_at: string;
        };
        Insert: {
          business_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          scopes?: string[];
          created_by?: string|null;
          revoked_at?: string|null;
          expires_at?: string|null;
        };
        Update: {
          business_id?: string;
          name?: string;
          key_prefix?: string;
          key_hash?: string;
          scopes?: string[];
          created_by?: string|null;
          revoked_at?: string|null;
          expires_at?: string|null;
        };
        Relationships: [];
      };
      webhooks: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          endpoint_url: string;
          secret: string;
          events: string[];
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          business_id: string;
          name: string;
          endpoint_url: string;
          secret: string;
          events?: string[];
          is_active?: boolean;
        };
        Update: {
          business_id?: string;
          name?: string;
          endpoint_url?: string;
          secret?: string;
          events?: string[];
          is_active?: boolean;
        };
        Relationships: [];
      };
      enterprise_audit_logs: {
        Row: {
          id: string;
          business_id: string;
          actor_user_id: string|null;
          action: string;
          entity_type: string|null;
          entity_id: string|null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          business_id: string;
          actor_user_id?: string|null;
          action: string;
          entity_type?: string|null;
          entity_id?: string|null;
          metadata?: Json;
        };
        Update: {
          business_id?: string;
          actor_user_id?: string|null;
          action?: string;
          entity_type?: string|null;
          entity_id?: string|null;
          metadata?: Json;
        };
        Relationships: [];
      };
      ai_knowledge_chunks: {
        Row: {
          id: string;
          business_id: string;
          source_id: string;
          chunk_index: number;
          content: string;
          metadata: Json;
          embedding: number[] | null;
          status: string;
          attempt_count: number;
          last_error: string | null;
          embedding_model: string | null;
          embedded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          source_id: string;
          chunk_index?: number;
          content: string;
          metadata?: Json;
          embedding?: number[] | null;
          status?: string;
          attempt_count?: number;
          last_error?: string | null;
          embedding_model?: string | null;
          embedded_at?: string | null;
        };
        Update: {
          business_id?: string;
          source_id?: string;
          chunk_index?: number;
          content?: string;
          metadata?: Json;
          embedding?: number[] | null;
          status?: string;
          attempt_count?: number;
          last_error?: string | null;
          embedding_model?: string | null;
          embedded_at?: string | null;
        };
        Relationships: [];
      };
      ai_action_requests: {
        Row: {
          id: string;
          business_id: string;
          actor_user_id: string | null;
          action_type: string;
          target_type: string | null;
          target_id: string | null;
          proposal: Json;
          status: string;
          reason: string | null;
          approved_at: string | null;
          approved_by: string | null;
          executed_at: string | null;
          executed_by: string | null;
          created_at: string;
        };
        Insert: {
          business_id: string;
          actor_user_id?: string | null;
          action_type: string;
          target_type?: string | null;
          target_id?: string | null;
          proposal?: Json;
          status?: string;
          reason?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          executed_at?: string | null;
          executed_by?: string | null;
        };
        Update: {
          business_id?: string;
          actor_user_id?: string | null;
          action_type?: string;
          target_type?: string | null;
          target_id?: string | null;
          proposal?: Json;
          status?: string;
          reason?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          executed_at?: string | null;
          executed_by?: string | null;
        };
        Relationships: [];
      };
    };
      ai_agents: {
        Row: { id: string; business_id: string; name: string; description: string | null; role: string; system_prompt: string; model: string | null; status: string; config: Json; capabilities: Json; starter_prompts: Json; created_by: string | null; created_at: string; updated_at: string; auto_update_enabled: boolean; evolution_policy: Json; };
        Insert: { id?: string; business_id: string; name: string; description?: string | null; role?: string; system_prompt?: string; model?: string | null; status?: string; config?: Json; capabilities?: Json; starter_prompts?: Json; created_by?: string | null; auto_update_enabled?: boolean; evolution_policy?: Json; };
        Update: { name?: string; description?: string | null; role?: string; system_prompt?: string; model?: string | null; status?: string; config?: Json; capabilities?: Json; starter_prompts?: Json; auto_update_enabled?: boolean; evolution_policy?: Json; };
        Relationships: [];
      };
      ai_agent_memories: {
        Row: { id: string; business_id: string; agent_id: string; memory_type: string; content: string; source: string; confidence: number | null; metadata: Json; created_at: string; updated_at: string; };
        Insert: { id?: string; business_id: string; agent_id: string; memory_type: string; content: string; source?: string; confidence?: number | null; metadata?: Json; };
        Update: { memory_type?: string; content?: string; source?: string; confidence?: number | null; metadata?: Json; };
        Relationships: [];
      };
      ai_conversations: {
        Row: { id: string; business_id: string; agent_id: string; user_id: string | null; title: string | null; summary: string | null; status: string; created_at: string; updated_at: string; };
        Insert: { id?: string; business_id: string; agent_id: string; user_id?: string | null; title?: string | null; summary?: string | null; status?: string; };
        Update: { title?: string | null; summary?: string | null; status?: string; updated_at?: string; };
        Relationships: [];
      };
      ai_messages: {
        Row: { id: string; conversation_id: string; business_id: string; role: string; content: string; citations: Json; tool_calls: Json; created_at: string; };
        Insert: { id?: string; conversation_id: string; business_id: string; role: string; content: string; citations?: Json; tool_calls?: Json; };
        Update: { content?: string; citations?: Json; tool_calls?: Json; };
        Relationships: [];
      };
      ai_generation_jobs: {
        Row: { id: string; business_id: string; agent_id: string | null; user_id: string | null; job_type: string; prompt: string; status: string; input: Json; output: Json; error: string | null; created_at: string; started_at: string | null; completed_at: string | null; };
        Insert: { id?: string; business_id: string; agent_id?: string | null; user_id?: string | null; job_type: string; prompt: string; status?: string; input?: Json; output?: Json; error?: string | null; started_at?: string | null; completed_at?: string | null; };
        Update: { status?: string; output?: Json; error?: string | null; started_at?: string | null; completed_at?: string | null; };
        Relationships: [];
      };
      ai_agent_tools: {
        Row: { id: string; business_id: string; agent_id: string; name: string; description: string | null; tool_type: string; config: Json; approval_required: boolean; enabled: boolean; created_at: string; updated_at: string; };
        Insert: { id?: string; business_id: string; agent_id: string; name: string; description?: string | null; tool_type: string; config?: Json; approval_required?: boolean; enabled?: boolean; };
        Update: { name?: string; description?: string | null; tool_type?: string; config?: Json; approval_required?: boolean; enabled?: boolean; updated_at?: string; };
        Relationships: [];
      };
      ai_agent_schedules: {
        Row: { id: string; business_id: string; agent_id: string; name: string; cron: string; prompt: string; timezone: string; enabled: boolean; last_run_at: string | null; next_run_at: string | null; created_at: string; updated_at: string; };
        Insert: { id?: string; business_id: string; agent_id: string; name: string; cron: string; prompt: string; timezone?: string; enabled?: boolean; last_run_at?: string | null; next_run_at?: string | null; };
        Update: { name?: string; cron?: string; prompt?: string; timezone?: string; enabled?: boolean; last_run_at?: string | null; next_run_at?: string | null; updated_at?: string; };
        Relationships: [];
      };
      ai_agent_handoffs: {
        Row: { id: string; business_id: string; agent_id: string; conversation_id: string | null; reason: string; status: string; assigned_to: string | null; notes: string | null; created_at: string; resolved_at: string | null; };
        Insert: { id?: string; business_id: string; agent_id: string; conversation_id?: string | null; reason: string; status?: string; assigned_to?: string | null; notes?: string | null; };
        Update: { status?: string; assigned_to?: string | null; notes?: string | null; resolved_at?: string | null; };
        Relationships: [];
      };
      ai_agent_evaluations: {
        Row: { id: string; business_id: string; agent_id: string; conversation_id: string | null; question: string; answer: string; grounded: boolean; support_score: number | null; citation_count: number; evaluator: string | null; feedback: string | null; created_at: string; };
        Insert: { id?: string; business_id: string; agent_id: string; conversation_id?: string | null; question: string; answer: string; grounded?: boolean; support_score?: number | null; citation_count?: number; evaluator?: string | null; feedback?: string | null; };
        Update: { grounded?: boolean; support_score?: number | null; citation_count?: number; evaluator?: string | null; feedback?: string | null; };
        Relationships: [];
      };
      ai_agent_deployments: {
        Row: { id: string; business_id: string; agent_id: string; channel: string; public_key: string | null; settings: Json; enabled: boolean; created_at: string; updated_at: string; };
        Insert: { id?: string; business_id: string; agent_id: string; channel: string; public_key?: string | null; settings?: Json; enabled?: boolean; };
        Update: { channel?: string; public_key?: string | null; settings?: Json; enabled?: boolean; updated_at?: string; };
        Relationships: [];
      };
      ai_model_catalog: {
        Row: { id: string; provider: string; model_key: string; runtime_model: string | null; runtime_compatible: boolean; display_name: string; capabilities: Json; context_window: number | null; status: string; source_url: string | null; evidence: Json; discovered_at: string; last_seen_at: string; updated_at: string; };
        Insert: { id?: string; provider: string; model_key: string; runtime_model?: string | null; runtime_compatible?: boolean; display_name: string; capabilities?: Json; context_window?: number | null; status?: string; source_url?: string | null; evidence?: Json; discovered_at?: string; last_seen_at?: string; updated_at?: string; };
        Update: { runtime_model?: string | null; runtime_compatible?: boolean; display_name?: string; capabilities?: Json; context_window?: number | null; status?: string; source_url?: string | null; evidence?: Json; last_seen_at?: string; updated_at?: string; };
        Relationships: [];
      };
      ai_trainer_sources: {
        Row: { id: string; name: string; source_type: string; source_url: string; trust_level: string; enabled: boolean; fetch_interval_minutes: number; last_fetched_at: string | null; last_http_status: number | null; content_digest: string | null; last_title: string | null; last_excerpt: string | null; metadata: Json; created_at: string; updated_at: string; };
        Insert: { id?: string; name: string; source_type: string; source_url: string; trust_level?: string; enabled?: boolean; fetch_interval_minutes?: number; last_fetched_at?: string | null; last_http_status?: number | null; content_digest?: string | null; last_title?: string | null; last_excerpt?: string | null; metadata?: Json; };
        Update: { name?: string; source_type?: string; source_url?: string; trust_level?: string; enabled?: boolean; fetch_interval_minutes?: number; last_fetched_at?: string | null; last_http_status?: number | null; content_digest?: string | null; last_title?: string | null; last_excerpt?: string | null; metadata?: Json; updated_at?: string; };
        Relationships: [];
      };
      ai_evolution_runs: {
        Row: { id: string; business_id: string | null; agent_id: string | null; status: string; trigger: string; sources_scanned: number; models_discovered: number; candidates_created: number; summary: string | null; error: string | null; started_at: string | null; completed_at: string | null; created_at: string; };
        Insert: { id?: string; business_id?: string | null; agent_id?: string | null; status?: string; trigger?: string; sources_scanned?: number; models_discovered?: number; candidates_created?: number; summary?: string | null; error?: string | null; started_at?: string | null; completed_at?: string | null; };
        Update: { status?: string; summary?: string | null; error?: string | null; started_at?: string | null; completed_at?: string | null; };
        Relationships: [];
      };
      ai_improvement_candidates: {
        Row: { id: string; business_id: string | null; agent_id: string | null; evolution_run_id: string | null; improvement_type: string; title: string; proposal: Json; evidence: Json; risk_level: string; baseline_score: number | null; candidate_score: number | null; regression_passed: boolean; approval_status: string; created_at: string; reviewed_at: string | null; };
        Insert: { id?: string; business_id?: string | null; agent_id?: string | null; evolution_run_id?: string | null; improvement_type: string; title: string; proposal?: Json; evidence?: Json; risk_level?: string; baseline_score?: number | null; candidate_score?: number | null; regression_passed?: boolean; approval_status?: string; created_at?: string; reviewed_at?: string | null; };
        Update: { title?: string; proposal?: Json; evidence?: Json; risk_level?: string; baseline_score?: number | null; candidate_score?: number | null; regression_passed?: boolean; approval_status?: string; reviewed_at?: string | null; };
        Relationships: [];
      };
      ai_agent_eval_cases: {
        Row: { id: string; business_id: string; agent_id: string; name: string; input: string; expected_criteria: Json; enabled: boolean; created_at: string; };
        Insert: { id?: string; business_id: string; agent_id: string; name: string; input: string; expected_criteria?: Json; enabled?: boolean; };
        Update: { name?: string; input?: string; expected_criteria?: Json; enabled?: boolean; };
        Relationships: [];
      };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      ai_runtime_model: {
        Args: { p_business_id: string; p_agent_id: string };
        Returns: string;
      };
      ai_business_snapshot: {
        Args: { p_business_id: string; p_question?: string };
        Returns: Json;
      };
      create_api_key: {
        Args: {
          p_business_id: string;
          p_name: string;
          p_scopes?: string[] | null;
          p_expires_at?: string | null;
        };
        Returns: Json;
      };
      create_webhook: {
        Args: {
          p_business_id: string;
          p_name: string;
          p_endpoint_url: string;
          p_events?: string[] | null;
        };
        Returns: Json;
      };
      list_webhooks: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          name: string;
          endpoint_url: string;
          events: string[];
          is_active: boolean;
          created_at: string;
        }[];
      };
      claim_ai_embedding_chunks: {
        Args: { p_limit?: number };
        Returns: {
          id: string;
          business_id: string;
          source_id: string;
          content: string;
          attempt_count: number;
        }[];
      };
      finish_ai_embedding: {
        Args: { p_chunk_id: string; p_embedding: number[]; p_model?: string };
        Returns: boolean;
      };
      fail_ai_embedding: {
        Args: { p_chunk_id: string; p_error: string };
        Returns: boolean;
      };
      index_ai_knowledge_source: {
        Args: { p_source_id: string };
        Returns: number;
      };
      create_ai_action_request: {
        Args: {
          p_business_id: string;
          p_action_type: string;
          p_target_type?: string | null;
          p_target_id?: string | null;
          p_proposal?: Json;
          p_reason?: string | null;
        };
        Returns: string;
      };
      set_ai_action_request_decision: {
        Args: { p_request_id: string; p_status: string; p_reason?: string | null };
        Returns: boolean;
      };
      create_business_for_current_user: {
        Args: {
          p_address: string | null;
          p_currency: string;
          p_description: string | null;
          p_email: string | null;
          p_name: string;
          p_phone: string | null;
          p_timezone: string;
        };
        Returns: Json;
      };
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
      search_ai_knowledge_text: {
        Args: { p_business_id: string; p_query: string; p_match_count?: number };
        Returns: {
          chunk_id: string;
          source_id: string;
          content: string;
          metadata: Json;
          rank: number;
        }[];
      };
      execute_ai_action: {
        Args: { p_action_id: string };
        Returns: Json;
      };
      claim_automation_run: {
        Args: { p_run_id: string };
        Returns: Json;
      };
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
