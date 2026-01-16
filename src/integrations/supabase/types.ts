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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      connections: {
        Row: {
          connection_type: string | null
          contact_a_id: string | null
          contact_b_id: string | null
          id: string
          strength: number | null
          tenant_id: string
        }
        Insert: {
          connection_type?: string | null
          contact_a_id?: string | null
          contact_b_id?: string | null
          id?: string
          strength?: number | null
          tenant_id: string
        }
        Update: {
          connection_type?: string | null
          contact_a_id?: string | null
          contact_b_id?: string | null
          id?: string
          strength?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_contact_a_id_fkey"
            columns: ["contact_a_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_contact_b_id_fkey"
            columns: ["contact_b_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          ai_summary: string | null
          contact_id: string
          created_at: string | null
          director_id: string
          duration_minutes: number | null
          id: string
          notes: string | null
          preparation_brief: string | null
          scheduled_at: string
          status: string | null
          tenant_id: string
        }
        Insert: {
          ai_summary?: string | null
          contact_id: string
          created_at?: string | null
          director_id: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          preparation_brief?: string | null
          scheduled_at: string
          status?: string | null
          tenant_id: string
        }
        Update: {
          ai_summary?: string | null
          contact_id?: string
          created_at?: string | null
          director_id?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          preparation_brief?: string | null
          scheduled_at?: string
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_groups: {
        Row: {
          color: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          sort_order: number | null
          tenant_id: string
        }
        Insert: {
          color?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          sort_order?: number | null
          tenant_id: string
        }
        Update: {
          color?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          sort_order?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          city: string | null
          company: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          last_contact_date: string | null
          linkedin_url: string | null
          notes: string | null
          phone: string | null
          position: string | null
          primary_group_id: string | null
          profile_embedding: string | null
          profile_summary: string | null
          relationship_strength: number | null
          source: string | null
          tags: string[] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          last_contact_date?: string | null
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          primary_group_id?: string | null
          profile_embedding?: string | null
          profile_summary?: string | null
          relationship_strength?: number | null
          source?: string | null
          tags?: string[] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_contact_date?: string | null
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          primary_group_id?: string | null
          profile_embedding?: string | null
          profile_summary?: string | null
          relationship_strength?: number | null
          source?: string | null
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_primary_group_id_fkey"
            columns: ["primary_group_id"]
            isOneToOne: false
            referencedRelation: "contact_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_tasks: {
        Row: {
          connection_reason: string | null
          contact_a_id: string | null
          contact_b_id: string | null
          id: string
          intro_made: boolean | null
          task_id: string | null
        }
        Insert: {
          connection_reason?: string | null
          contact_a_id?: string | null
          contact_b_id?: string | null
          id?: string
          intro_made?: boolean | null
          task_id?: string | null
        }
        Update: {
          connection_reason?: string | null
          contact_a_id?: string | null
          contact_b_id?: string | null
          id?: string
          intro_made?: boolean | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cross_tasks_contact_a_id_fkey"
            columns: ["contact_a_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_tasks_contact_b_id_fkey"
            columns: ["contact_b_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      directors: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          role: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          role?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          role?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "directors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          ai_explanation: string | null
          created_at: string | null
          id: string
          need_id: string | null
          offer_id: string | null
          similarity_score: number | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          ai_explanation?: string | null
          created_at?: string | null
          id?: string
          need_id?: string | null
          offer_id?: string | null
          similarity_score?: number | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          ai_explanation?: string | null
          created_at?: string | null
          id?: string
          need_id?: string | null
          offer_id?: string | null
          similarity_score?: number | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      needs: {
        Row: {
          category_path: unknown
          contact_id: string
          created_at: string | null
          description: string | null
          embedding: string | null
          id: string
          priority: string | null
          status: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          category_path?: unknown
          contact_id: string
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          category_path?: unknown
          contact_id?: string
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "needs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "needs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          category_path: unknown
          contact_id: string
          created_at: string | null
          description: string | null
          embedding: string | null
          id: string
          status: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          category_path?: unknown
          contact_id: string
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          id?: string
          status?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          category_path?: unknown
          contact_id?: string
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          id?: string
          status?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_health: {
        Row: {
          calculated_at: string | null
          contact_id: string | null
          days_since_contact: number | null
          decay_alert_sent: boolean | null
          health_score: number | null
          id: string
        }
        Insert: {
          calculated_at?: string | null
          contact_id?: string | null
          days_since_contact?: number | null
          decay_alert_sent?: boolean | null
          health_score?: number | null
          id?: string
        }
        Update: {
          calculated_at?: string | null
          contact_id?: string | null
          days_since_contact?: number | null
          decay_alert_sent?: boolean | null
          health_score?: number | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_health_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      task_contacts: {
        Row: {
          contact_id: string
          role: string | null
          task_id: string
        }
        Insert: {
          contact_id: string
          role?: string | null
          task_id: string
        }
        Update: {
          contact_id?: string
          role?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_contacts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          status: string | null
          task_type: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          task_type?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          task_type?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          settings: Json | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          settings?: Json | null
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_tenant_id: { Args: never; Returns: string }
      text2ltree: { Args: { "": string }; Returns: unknown }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
