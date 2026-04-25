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
      ai_conversations: {
        Row: {
          actor_id: string
          id: string
          last_message_at: string
          metadata: Json
          persona: string
          scope_id: string | null
          scope_type: string | null
          started_at: string
          tenant_id: string
          title: string | null
        }
        Insert: {
          actor_id: string
          id?: string
          last_message_at?: string
          metadata?: Json
          persona?: string
          scope_id?: string | null
          scope_type?: string | null
          started_at?: string
          tenant_id: string
          title?: string | null
        }
        Update: {
          actor_id?: string
          id?: string
          last_message_at?: string
          metadata?: Json
          persona?: string
          scope_id?: string | null
          scope_type?: string | null
          started_at?: string
          tenant_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_memory: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          embedding: string | null
          id: string
          memory_type: string
          scope_id: string | null
          scope_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          embedding?: string | null
          id?: string
          memory_type: string
          scope_id?: string | null
          scope_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          embedding?: string | null
          id?: string
          memory_type?: string
          scope_id?: string | null
          scope_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_memory_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_memory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_memory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          cost_cents: number | null
          created_at: string
          id: string
          model: string | null
          provider: string | null
          role: string
          tokens_in: number | null
          tokens_out: number | null
          tool_calls: Json | null
          tool_results: Json | null
        }
        Insert: {
          content?: string
          conversation_id: string
          cost_cents?: number | null
          created_at?: string
          id?: string
          model?: string | null
          provider?: string | null
          role: string
          tokens_in?: number | null
          tokens_out?: number | null
          tool_calls?: Json | null
          tool_results?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          cost_cents?: number | null
          created_at?: string
          id?: string
          model?: string | null
          provider?: string | null
          role?: string
          tokens_in?: number | null
          tokens_out?: number | null
          tool_calls?: Json | null
          tool_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_log: {
        Row: {
          actor_id: string | null
          cost_cents: number | null
          created_at: string
          error: string | null
          function_name: string
          id: string
          latency_ms: number | null
          metadata: Json
          model: string | null
          persona: string | null
          provider: string
          request_id: string | null
          tenant_id: string | null
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: []
      }
      ai_usage_log_2026_04: {
        Row: {
          actor_id: string | null
          cost_cents: number | null
          created_at: string
          error: string | null
          function_name: string
          id: string
          latency_ms: number | null
          metadata: Json
          model: string | null
          persona: string | null
          provider: string
          request_id: string | null
          tenant_id: string | null
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: []
      }
      ai_usage_log_2026_05: {
        Row: {
          actor_id: string | null
          cost_cents: number | null
          created_at: string
          error: string | null
          function_name: string
          id: string
          latency_ms: number | null
          metadata: Json
          model: string | null
          persona: string | null
          provider: string
          request_id: string | null
          tenant_id: string | null
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: []
      }
      ai_usage_log_2026_06: {
        Row: {
          actor_id: string | null
          cost_cents: number | null
          created_at: string
          error: string | null
          function_name: string
          id: string
          latency_ms: number | null
          metadata: Json
          model: string | null
          persona: string | null
          provider: string
          request_id: string | null
          tenant_id: string | null
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: []
      }
      ai_usage_log_2026_07: {
        Row: {
          actor_id: string | null
          cost_cents: number | null
          created_at: string
          error: string | null
          function_name: string
          id: string
          latency_ms: number | null
          metadata: Json
          model: string | null
          persona: string | null
          provider: string
          request_id: string | null
          tenant_id: string | null
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: []
      }
      ai_usage_log_2026_08: {
        Row: {
          actor_id: string | null
          cost_cents: number | null
          created_at: string
          error: string | null
          function_name: string
          id: string
          latency_ms: number | null
          metadata: Json
          model: string | null
          persona: string | null
          provider: string
          request_id: string | null
          tenant_id: string | null
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: []
      }
      ai_usage_log_2026_09: {
        Row: {
          actor_id: string | null
          cost_cents: number | null
          created_at: string
          error: string | null
          function_name: string
          id: string
          latency_ms: number | null
          metadata: Json
          model: string | null
          persona: string | null
          provider: string
          request_id: string | null
          tenant_id: string | null
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: []
      }
      ai_usage_log_2026_10: {
        Row: {
          actor_id: string | null
          cost_cents: number | null
          created_at: string
          error: string | null
          function_name: string
          id: string
          latency_ms: number | null
          metadata: Json
          model: string | null
          persona: string | null
          provider: string
          request_id: string | null
          tenant_id: string | null
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: []
      }
      ai_usage_log_2026_11: {
        Row: {
          actor_id: string | null
          cost_cents: number | null
          created_at: string
          error: string | null
          function_name: string
          id: string
          latency_ms: number | null
          metadata: Json
          model: string | null
          persona: string | null
          provider: string
          request_id: string | null
          tenant_id: string | null
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: []
      }
      ai_usage_log_2026_12: {
        Row: {
          actor_id: string | null
          cost_cents: number | null
          created_at: string
          error: string | null
          function_name: string
          id: string
          latency_ms: number | null
          metadata: Json
          model: string | null
          persona: string | null
          provider: string
          request_id: string | null
          tenant_id: string | null
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: []
      }
      ai_usage_log_2027_01: {
        Row: {
          actor_id: string | null
          cost_cents: number | null
          created_at: string
          error: string | null
          function_name: string
          id: string
          latency_ms: number | null
          metadata: Json
          model: string | null
          persona: string | null
          provider: string
          request_id: string | null
          tenant_id: string | null
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          actor_id?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          function_name?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          persona?: string | null
          provider?: string
          request_id?: string | null
          tenant_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: []
      }
      assistant_group_access: {
        Row: {
          assistant_id: string
          created_at: string | null
          group_id: string
          id: string
        }
        Insert: {
          assistant_id: string
          created_at?: string | null
          group_id: string
          id?: string
        }
        Update: {
          assistant_id?: string
          created_at?: string | null
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_group_access_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_group_access_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "contact_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      assistants: {
        Row: {
          created_at: string | null
          director_id: string
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          director_id: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          director_id?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistants_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "assistants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_crm_contact_reads: {
        Row: {
          client_ip: unknown
          contact_id: string
          id: number
          read_at: string | null
          reader_user_id: string | null
          tenant_id: string | null
          via_rpc: string
        }
        Insert: {
          client_ip?: unknown
          contact_id: string
          id?: number
          read_at?: string | null
          reader_user_id?: string | null
          tenant_id?: string | null
          via_rpc: string
        }
        Update: {
          client_ip?: unknown
          contact_id?: string
          id?: number
          read_at?: string | null
          reader_user_id?: string | null
          tenant_id?: string | null
          via_rpc?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_crm_contact_reads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_crm_contact_reads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          tenant_id?: string
        }
        Relationships: []
      }
      audit_log_2026_01: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          tenant_id?: string
        }
        Relationships: []
      }
      audit_log_2026_02: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          tenant_id?: string
        }
        Relationships: []
      }
      audit_log_2026_03: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          tenant_id?: string
        }
        Relationships: []
      }
      audit_log_2026_04: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          tenant_id?: string
        }
        Relationships: []
      }
      audit_log_2026_05: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          tenant_id?: string
        }
        Relationships: []
      }
      audit_log_2026_06: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          tenant_id?: string
        }
        Relationships: []
      }
      audit_log_2026_07: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          tenant_id?: string
        }
        Relationships: []
      }
      audit_log_2026_08: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          tenant_id?: string
        }
        Relationships: []
      }
      audit_log_2026_09: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          tenant_id?: string
        }
        Relationships: []
      }
      audit_log_2026_10: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          tenant_id?: string
        }
        Relationships: []
      }
      audit_log_2026_11: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          tenant_id?: string
        }
        Relationships: []
      }
      audit_log_2026_12: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          tenant_id?: string
        }
        Relationships: []
      }
      audit_log_pre_2026: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          tenant_id?: string
        }
        Relationships: []
      }
      background_jobs: {
        Row: {
          actor_id: string | null
          actor_user_id: string | null
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          job_type: string
          payload: Json
          progress: number
          result: Json | null
          started_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actor_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          job_type: string
          payload?: Json
          progress?: number
          result?: Json | null
          started_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actor_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          job_type?: string
          payload?: Json
          progress?: number
          result?: Json | null
          started_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "background_jobs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "background_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "background_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          context_data: Json | null
          created_at: string | null
          description: string
          id: string
          page_url: string | null
          priority: string | null
          remek_conversation_snapshot: Json | null
          remek_session_id: string | null
          reporter_name: string | null
          reporter_user_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          screenshot_url: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string | null
          user_context: Json | null
        }
        Insert: {
          context_data?: Json | null
          created_at?: string | null
          description: string
          id?: string
          page_url?: string | null
          priority?: string | null
          remek_conversation_snapshot?: Json | null
          remek_session_id?: string | null
          reporter_name?: string | null
          reporter_user_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          screenshot_url?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string | null
          user_context?: Json | null
        }
        Update: {
          context_data?: Json | null
          created_at?: string | null
          description?: string
          id?: string
          page_url?: string | null
          priority?: string | null
          remek_conversation_snapshot?: Json | null
          remek_session_id?: string | null
          reporter_name?: string | null
          reporter_user_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          screenshot_url?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
          user_context?: Json | null
        }
        Relationships: []
      }
      capital_group_members: {
        Row: {
          created_at: string | null
          data_source: string | null
          external_krs: string | null
          external_name: string
          external_nip: string | null
          external_regon: string | null
          id: string
          krs_verified: boolean | null
          member_company_id: string | null
          ownership_percent: number | null
          parent_company_id: string
          relationship_type: string
          revenue_amount: number | null
          revenue_year: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_source?: string | null
          external_krs?: string | null
          external_name: string
          external_nip?: string | null
          external_regon?: string | null
          id?: string
          krs_verified?: boolean | null
          member_company_id?: string | null
          ownership_percent?: number | null
          parent_company_id: string
          relationship_type?: string
          revenue_amount?: number | null
          revenue_year?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_source?: string | null
          external_krs?: string | null
          external_name?: string
          external_nip?: string | null
          external_regon?: string | null
          id?: string
          krs_verified?: boolean | null
          member_company_id?: string | null
          ownership_percent?: number | null
          parent_company_id?: string
          relationship_type?: string
          revenue_amount?: number | null
          revenue_year?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capital_group_members_member_company_id_fkey"
            columns: ["member_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_group_members_parent_company_id_fkey"
            columns: ["parent_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_referrals: {
        Row: {
          created_at: string | null
          created_by_user_id: string | null
          id: string
          notes: string | null
          referred_deal_team_contact_id: string | null
          referred_email: string | null
          referred_name: string
          referred_phone: string | null
          referrer_deal_team_contact_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          referred_deal_team_contact_id?: string | null
          referred_email?: string | null
          referred_name: string
          referred_phone?: string | null
          referrer_deal_team_contact_id: string
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          referred_deal_team_contact_id?: string | null
          referred_email?: string | null
          referred_name?: string
          referred_phone?: string | null
          referrer_deal_team_contact_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_referrals_referred_deal_team_contact_id_fkey"
            columns: ["referred_deal_team_contact_id"]
            isOneToOne: false
            referencedRelation: "deal_team_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_referrals_referrer_deal_team_contact_id_fkey"
            columns: ["referrer_deal_team_contact_id"]
            isOneToOne: false
            referencedRelation: "deal_team_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_referrals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "client_referrals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_base_split: {
        Row: {
          active_from: string
          active_to: string | null
          created_at: string | null
          created_by_user_id: string | null
          id: string
          notes: string | null
          recipient_user_id: string | null
          role_key: string
          share_pct: number
          tenant_id: string
        }
        Insert: {
          active_from?: string
          active_to?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          recipient_user_id?: string | null
          role_key: string
          share_pct: number
          tenant_id: string
        }
        Update: {
          active_from?: string
          active_to?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          recipient_user_id?: string | null
          role_key?: string
          share_pct?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_base_split_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "commission_base_split_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_entries: {
        Row: {
          algorithm_version: string
          amount_gr: number
          base_commission_gr: number
          calculation_log: Json
          created_at: string | null
          deal_team_contact_id: string | null
          id: string
          insurance_policy_id: string
          modifiers_applied: Json
          paid_out: boolean
          paid_out_at: string | null
          paid_out_by_user_id: string | null
          payment_schedule_id: string | null
          recipient_label: string
          recipient_type: string
          recipient_user_id: string | null
          role_key: string | null
          share_pct: number
          team_id: string
          tenant_id: string
        }
        Insert: {
          algorithm_version?: string
          amount_gr: number
          base_commission_gr: number
          calculation_log?: Json
          created_at?: string | null
          deal_team_contact_id?: string | null
          id?: string
          insurance_policy_id: string
          modifiers_applied?: Json
          paid_out?: boolean
          paid_out_at?: string | null
          paid_out_by_user_id?: string | null
          payment_schedule_id?: string | null
          recipient_label: string
          recipient_type: string
          recipient_user_id?: string | null
          role_key?: string | null
          share_pct: number
          team_id: string
          tenant_id: string
        }
        Update: {
          algorithm_version?: string
          amount_gr?: number
          base_commission_gr?: number
          calculation_log?: Json
          created_at?: string | null
          deal_team_contact_id?: string | null
          id?: string
          insurance_policy_id?: string
          modifiers_applied?: Json
          paid_out?: boolean
          paid_out_at?: string | null
          paid_out_by_user_id?: string | null
          payment_schedule_id?: string | null
          recipient_label?: string
          recipient_type?: string
          recipient_user_id?: string | null
          role_key?: string | null
          share_pct?: number
          team_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_entries_deal_team_contact_id_fkey"
            columns: ["deal_team_contact_id"]
            isOneToOne: false
            referencedRelation: "deal_team_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_insurance_policy_id_fkey"
            columns: ["insurance_policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_payment_schedule_id_fkey"
            columns: ["payment_schedule_id"]
            isOneToOne: false
            referencedRelation: "deal_team_payment_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "commission_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          ai_analysis: Json | null
          analysis_confidence_score: number | null
          analysis_data_sources: Json | null
          analysis_missing_sections: string[] | null
          city: string | null
          company_analysis_date: string | null
          company_analysis_status: string | null
          company_size: string | null
          company_status: string | null
          country: string | null
          created_at: string
          created_by: string | null
          description: string | null
          employee_count: string | null
          external_data: Json | null
          external_data_date: string | null
          external_data_status: string | null
          financial_data_3y: Json | null
          financial_data_date: string | null
          financial_data_status: string | null
          group_companies: Json | null
          growth_rate: number | null
          id: string
          industry: string | null
          is_group: boolean | null
          krs: string | null
          legal_form: string | null
          logo_url: string | null
          name: string
          nip: string | null
          notes: string | null
          parent_company_id: string | null
          phone: string | null
          pkd_codes: string[] | null
          postal_code: string | null
          registration_date: string | null
          regon: string | null
          revenue_amount: number | null
          revenue_currency: string | null
          revenue_year: number | null
          short_name: string | null
          source_data_api: Json | null
          source_data_date: string | null
          source_data_status: string | null
          tagline: string | null
          tenant_id: string
          updated_at: string
          website: string | null
          www_data: Json | null
          www_data_date: string | null
          www_data_status: string | null
        }
        Insert: {
          address?: string | null
          ai_analysis?: Json | null
          analysis_confidence_score?: number | null
          analysis_data_sources?: Json | null
          analysis_missing_sections?: string[] | null
          city?: string | null
          company_analysis_date?: string | null
          company_analysis_status?: string | null
          company_size?: string | null
          company_status?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_count?: string | null
          external_data?: Json | null
          external_data_date?: string | null
          external_data_status?: string | null
          financial_data_3y?: Json | null
          financial_data_date?: string | null
          financial_data_status?: string | null
          group_companies?: Json | null
          growth_rate?: number | null
          id?: string
          industry?: string | null
          is_group?: boolean | null
          krs?: string | null
          legal_form?: string | null
          logo_url?: string | null
          name: string
          nip?: string | null
          notes?: string | null
          parent_company_id?: string | null
          phone?: string | null
          pkd_codes?: string[] | null
          postal_code?: string | null
          registration_date?: string | null
          regon?: string | null
          revenue_amount?: number | null
          revenue_currency?: string | null
          revenue_year?: number | null
          short_name?: string | null
          source_data_api?: Json | null
          source_data_date?: string | null
          source_data_status?: string | null
          tagline?: string | null
          tenant_id: string
          updated_at?: string
          website?: string | null
          www_data?: Json | null
          www_data_date?: string | null
          www_data_status?: string | null
        }
        Update: {
          address?: string | null
          ai_analysis?: Json | null
          analysis_confidence_score?: number | null
          analysis_data_sources?: Json | null
          analysis_missing_sections?: string[] | null
          city?: string | null
          company_analysis_date?: string | null
          company_analysis_status?: string | null
          company_size?: string | null
          company_status?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_count?: string | null
          external_data?: Json | null
          external_data_date?: string | null
          external_data_status?: string | null
          financial_data_3y?: Json | null
          financial_data_date?: string | null
          financial_data_status?: string | null
          group_companies?: Json | null
          growth_rate?: number | null
          id?: string
          industry?: string | null
          is_group?: boolean | null
          krs?: string | null
          legal_form?: string | null
          logo_url?: string | null
          name?: string
          nip?: string | null
          notes?: string | null
          parent_company_id?: string | null
          phone?: string | null
          pkd_codes?: string[] | null
          postal_code?: string | null
          registration_date?: string | null
          regon?: string | null
          revenue_amount?: number | null
          revenue_currency?: string | null
          revenue_year?: number | null
          short_name?: string | null
          source_data_api?: Json | null
          source_data_date?: string | null
          source_data_status?: string | null
          tagline?: string | null
          tenant_id?: string
          updated_at?: string
          website?: string | null
          www_data?: Json | null
          www_data_date?: string | null
          www_data_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_parent_company_id_fkey"
            columns: ["parent_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "companies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      company_data_sources: {
        Row: {
          company_id: string
          created_at: string
          data: Json
          fetched_at: string | null
          id: string
          source_type: string
          status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          data?: Json
          fetched_at?: string | null
          id?: string
          source_type: string
          status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          data?: Json
          fetched_at?: string | null
          id?: string
          source_type?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_data_sources_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_data_sources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "company_data_sources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          connection_type: string | null
          contact_a_id: string | null
          contact_b_id: string | null
          created_at: string
          id: string
          metadata: Json
          relationship_type: string | null
          strength: number | null
          tenant_id: string
        }
        Insert: {
          connection_type?: string | null
          contact_a_id?: string | null
          contact_b_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          relationship_type?: string | null
          strength?: number | null
          tenant_id: string
        }
        Update: {
          connection_type?: string | null
          contact_a_id?: string | null
          contact_b_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          relationship_type?: string | null
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
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
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
      consultation_chat_messages: {
        Row: {
          chat_type: string
          consultation_id: string
          content: string
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          chat_type: string
          consultation_id: string
          content: string
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          chat_type?: string
          consultation_id?: string
          content?: string
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_chat_messages_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_guests: {
        Row: {
          comment: string | null
          consultation_id: string
          contact_id: string | null
          created_at: string | null
          guest_name: string | null
          guest_type: string
          id: string
          meeting_date: string | null
          sort_order: number | null
        }
        Insert: {
          comment?: string | null
          consultation_id: string
          contact_id?: string | null
          created_at?: string | null
          guest_name?: string | null
          guest_type: string
          id?: string
          meeting_date?: string | null
          sort_order?: number | null
        }
        Update: {
          comment?: string | null
          consultation_id?: string
          contact_id?: string | null
          created_at?: string | null
          guest_name?: string | null
          guest_type?: string
          id?: string
          meeting_date?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_guests_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_guests_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_meetings: {
        Row: {
          cc_group: string | null
          comment: string | null
          company: string | null
          consultation_id: string
          contact_id: string | null
          contact_name: string | null
          created_at: string | null
          follow_up: string | null
          id: string
          meeting_date: string | null
          meeting_type: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          cc_group?: string | null
          comment?: string | null
          company?: string | null
          consultation_id: string
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          follow_up?: string | null
          id?: string
          meeting_date?: string | null
          meeting_type: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          cc_group?: string | null
          comment?: string | null
          company?: string | null
          consultation_id?: string
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          follow_up?: string | null
          id?: string
          meeting_date?: string | null
          meeting_type?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_meetings_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_meetings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_questionnaire: {
        Row: {
          business_goals_needing_support: string | null
          cc_group: string | null
          consultation_id: string
          created_at: string | null
          current_engagement: string | null
          director_name: string | null
          expertise_contribution: string | null
          group_engagement_details: string | null
          group_engagement_rating: number | null
          id: string
          key_cc_events_plan: string | null
          member_email: string | null
          member_name: string | null
          next_meeting_date: string | null
          previous_projects_review: string | null
          strategic_contacts_needed: string | null
          strategic_partners_sought: string | null
          tenant_id: string
          updated_at: string | null
          valuable_education_topics: string | null
          value_for_community: string | null
        }
        Insert: {
          business_goals_needing_support?: string | null
          cc_group?: string | null
          consultation_id: string
          created_at?: string | null
          current_engagement?: string | null
          director_name?: string | null
          expertise_contribution?: string | null
          group_engagement_details?: string | null
          group_engagement_rating?: number | null
          id?: string
          key_cc_events_plan?: string | null
          member_email?: string | null
          member_name?: string | null
          next_meeting_date?: string | null
          previous_projects_review?: string | null
          strategic_contacts_needed?: string | null
          strategic_partners_sought?: string | null
          tenant_id: string
          updated_at?: string | null
          valuable_education_topics?: string | null
          value_for_community?: string | null
        }
        Update: {
          business_goals_needing_support?: string | null
          cc_group?: string | null
          consultation_id?: string
          created_at?: string | null
          current_engagement?: string | null
          director_name?: string | null
          expertise_contribution?: string | null
          group_engagement_details?: string | null
          group_engagement_rating?: number | null
          id?: string
          key_cc_events_plan?: string | null
          member_email?: string | null
          member_name?: string | null
          next_meeting_date?: string | null
          previous_projects_review?: string | null
          strategic_contacts_needed?: string | null
          strategic_partners_sought?: string | null
          tenant_id?: string
          updated_at?: string | null
          valuable_education_topics?: string | null
          value_for_community?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_questionnaire_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: true
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_questionnaire_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "consultation_questionnaire_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_recommendations: {
        Row: {
          company: string | null
          consultation_id: string
          contact_id: string | null
          contact_name: string | null
          created_at: string | null
          id: string
          recommendation_kind: string | null
          recommendation_type: string
          sort_order: number | null
          topic: string | null
        }
        Insert: {
          company?: string | null
          consultation_id: string
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          id?: string
          recommendation_kind?: string | null
          recommendation_type: string
          sort_order?: number | null
          topic?: string | null
        }
        Update: {
          company?: string | null
          consultation_id?: string
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          id?: string
          recommendation_kind?: string | null
          recommendation_type?: string
          sort_order?: number | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_recommendations_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_recommendations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_thanks: {
        Row: {
          business_benefit_type: string | null
          consultation_id: string
          contact_id: string | null
          contact_name: string | null
          created_at: string | null
          id: string
          sort_order: number | null
          transaction_amount: string | null
        }
        Insert: {
          business_benefit_type?: string | null
          consultation_id: string
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          id?: string
          sort_order?: number | null
          transaction_amount?: string | null
        }
        Update: {
          business_benefit_type?: string | null
          consultation_id?: string
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          id?: string
          sort_order?: number | null
          transaction_amount?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_thanks_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_thanks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          agenda: string | null
          ai_summary: string | null
          contact_id: string
          created_at: string | null
          director_id: string
          duration_minutes: number | null
          id: string
          is_virtual: boolean | null
          location: string | null
          meeting_url: string | null
          notes: string | null
          preparation_brief: string | null
          scheduled_at: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          agenda?: string | null
          ai_summary?: string | null
          contact_id: string
          created_at?: string | null
          director_id: string
          duration_minutes?: number | null
          id?: string
          is_virtual?: boolean | null
          location?: string | null
          meeting_url?: string | null
          notes?: string | null
          preparation_brief?: string | null
          scheduled_at: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          agenda?: string | null
          ai_summary?: string | null
          contact_id?: string
          created_at?: string | null
          director_id?: string
          duration_minutes?: number | null
          id?: string
          is_virtual?: boolean | null
          location?: string | null
          meeting_url?: string | null
          notes?: string | null
          preparation_brief?: string | null
          scheduled_at?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
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
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
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
      contact_agent_memory: {
        Row: {
          agent_persona: string | null
          agent_profile: Json | null
          contact_id: string
          conversation_count: number | null
          created_at: string | null
          id: string
          insights: Json | null
          knowledge_sources: Json | null
          last_learning_at: string | null
          last_refresh_at: string | null
          memory_summary: string | null
          refresh_sources: Json | null
          tenant_id: string
          topics: string[] | null
          updated_at: string | null
        }
        Insert: {
          agent_persona?: string | null
          agent_profile?: Json | null
          contact_id: string
          conversation_count?: number | null
          created_at?: string | null
          id?: string
          insights?: Json | null
          knowledge_sources?: Json | null
          last_learning_at?: string | null
          last_refresh_at?: string | null
          memory_summary?: string | null
          refresh_sources?: Json | null
          tenant_id: string
          topics?: string[] | null
          updated_at?: string | null
        }
        Update: {
          agent_persona?: string | null
          agent_profile?: Json | null
          contact_id?: string
          conversation_count?: number | null
          created_at?: string | null
          id?: string
          insights?: Json | null
          knowledge_sources?: Json | null
          last_learning_at?: string | null
          last_refresh_at?: string | null
          memory_summary?: string | null
          refresh_sources?: Json | null
          tenant_id?: string
          topics?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_agent_memory_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_agent_memory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_agent_memory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_ai_cache: {
        Row: {
          contact_id: string
          cost_cents: number | null
          generated_at: string
          id: string
          invalidated_at: string | null
          model: string | null
          summary_json: Json | null
          tenant_id: string
          tldr: string | null
        }
        Insert: {
          contact_id: string
          cost_cents?: number | null
          generated_at?: string
          id?: string
          invalidated_at?: string | null
          model?: string | null
          summary_json?: Json | null
          tenant_id: string
          tldr?: string | null
        }
        Update: {
          contact_id?: string
          cost_cents?: number | null
          generated_at?: string
          id?: string
          invalidated_at?: string | null
          model?: string | null
          summary_json?: Json | null
          tenant_id?: string
          tldr?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_ai_cache_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_ai_cache_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_ai_cache_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_bi: {
        Row: {
          ai_summary: string | null
          answers: Json
          contact_id: string
          filled_by_ai: boolean
          last_filled_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          answers?: Json
          contact_id: string
          filled_by_ai?: boolean
          last_filled_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          answers?: Json
          contact_id?: string
          filled_by_ai?: boolean
          last_filled_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_bi_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_bi_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_bi_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_group_shares: {
        Row: {
          created_at: string
          group_id: string
          id: string
          shared_with_director_id: string | null
          shared_with_team_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          shared_with_director_id?: string | null
          shared_with_team_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          shared_with_director_id?: string | null
          shared_with_team_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_group_shares_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "contact_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_group_shares_shared_with_director_id_fkey"
            columns: ["shared_with_director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_group_shares_shared_with_team_id_fkey"
            columns: ["shared_with_team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_group_shares_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_group_shares_tenant_id_fkey"
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
          include_in_health_stats: boolean | null
          is_system: boolean | null
          name: string
          refresh_days: number | null
          refresh_policy: string | null
          sort_order: number | null
          tenant_id: string
        }
        Insert: {
          color?: string | null
          description?: string | null
          id?: string
          include_in_health_stats?: boolean | null
          is_system?: boolean | null
          name: string
          refresh_days?: number | null
          refresh_policy?: string | null
          sort_order?: number | null
          tenant_id: string
        }
        Update: {
          color?: string | null
          description?: string | null
          id?: string
          include_in_health_stats?: boolean | null
          is_system?: boolean | null
          name?: string
          refresh_days?: number | null
          refresh_policy?: string | null
          sort_order?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_notes: {
        Row: {
          contact_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          contact_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          contact_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_shares: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          permission: string
          shared_by_director_id: string
          shared_with_director_id: string
          tenant_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          permission?: string
          shared_by_director_id: string
          shared_with_director_id: string
          tenant_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          permission?: string
          shared_by_director_id?: string
          shared_with_director_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_shares_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_shares_shared_by_director_id_fkey"
            columns: ["shared_by_director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_shares_shared_with_director_id_fkey"
            columns: ["shared_with_director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_shares_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_shares_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          address_secondary: string | null
          business_card_image_url: string | null
          city: string | null
          company: string | null
          company_id: string | null
          company_verified_at: string | null
          created_at: string | null
          director_id: string | null
          email: string | null
          email_secondary: string | null
          first_name: string | null
          fts: unknown
          full_name: string
          id: string
          is_active: boolean | null
          is_owner: boolean | null
          last_contact_date: string | null
          last_name: string | null
          linkedin_data: Json | null
          linkedin_url: string | null
          met_date: string | null
          met_source: string | null
          notes: string | null
          phone: string | null
          phone_business: string | null
          position: string | null
          primary_group_id: string | null
          profile_embedding: string | null
          profile_summary: string | null
          relationship_strength: number | null
          search_text: string | null
          source: string | null
          tags: string[] | null
          tenant_id: string
          title: string | null
          total_ownership_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          address_secondary?: string | null
          business_card_image_url?: string | null
          city?: string | null
          company?: string | null
          company_id?: string | null
          company_verified_at?: string | null
          created_at?: string | null
          director_id?: string | null
          email?: string | null
          email_secondary?: string | null
          first_name?: string | null
          fts?: unknown
          full_name: string
          id?: string
          is_active?: boolean | null
          is_owner?: boolean | null
          last_contact_date?: string | null
          last_name?: string | null
          linkedin_data?: Json | null
          linkedin_url?: string | null
          met_date?: string | null
          met_source?: string | null
          notes?: string | null
          phone?: string | null
          phone_business?: string | null
          position?: string | null
          primary_group_id?: string | null
          profile_embedding?: string | null
          profile_summary?: string | null
          relationship_strength?: number | null
          search_text?: string | null
          source?: string | null
          tags?: string[] | null
          tenant_id: string
          title?: string | null
          total_ownership_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          address_secondary?: string | null
          business_card_image_url?: string | null
          city?: string | null
          company?: string | null
          company_id?: string | null
          company_verified_at?: string | null
          created_at?: string | null
          director_id?: string | null
          email?: string | null
          email_secondary?: string | null
          first_name?: string | null
          fts?: unknown
          full_name?: string
          id?: string
          is_active?: boolean | null
          is_owner?: boolean | null
          last_contact_date?: string | null
          last_name?: string | null
          linkedin_data?: Json | null
          linkedin_url?: string | null
          met_date?: string | null
          met_source?: string | null
          notes?: string | null
          phone?: string | null
          phone_business?: string | null
          position?: string | null
          primary_group_id?: string | null
          profile_embedding?: string | null
          profile_summary?: string | null
          relationship_strength?: number | null
          search_text?: string | null
          source?: string | null
          tags?: string[] | null
          tenant_id?: string
          title?: string | null
          total_ownership_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
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
          discussed_with_a: boolean | null
          discussed_with_a_at: string | null
          discussed_with_b: boolean | null
          discussed_with_b_at: string | null
          id: string
          intro_made: boolean | null
          intro_made_at: string | null
          suggested_intro: string | null
          task_id: string | null
        }
        Insert: {
          connection_reason?: string | null
          contact_a_id?: string | null
          contact_b_id?: string | null
          discussed_with_a?: boolean | null
          discussed_with_a_at?: string | null
          discussed_with_b?: boolean | null
          discussed_with_b_at?: string | null
          id?: string
          intro_made?: boolean | null
          intro_made_at?: string | null
          suggested_intro?: string | null
          task_id?: string | null
        }
        Update: {
          connection_reason?: string | null
          contact_a_id?: string | null
          contact_b_id?: string | null
          discussed_with_a?: boolean | null
          discussed_with_a_at?: string | null
          discussed_with_b?: boolean | null
          discussed_with_b_at?: string | null
          id?: string
          intro_made?: boolean | null
          intro_made_at?: string | null
          suggested_intro?: string | null
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
      daily_serendipity: {
        Row: {
          acted_at: string | null
          acted_on: boolean | null
          contact_a_id: string | null
          contact_b_id: string | null
          created_at: string | null
          date: string
          description: string
          director_id: string
          feedback: string | null
          id: string
          match_id: string | null
          need_id: string | null
          offer_id: string | null
          reasoning: string | null
          tenant_id: string
          title: string
          type: string
          viewed_at: string | null
        }
        Insert: {
          acted_at?: string | null
          acted_on?: boolean | null
          contact_a_id?: string | null
          contact_b_id?: string | null
          created_at?: string | null
          date?: string
          description: string
          director_id: string
          feedback?: string | null
          id?: string
          match_id?: string | null
          need_id?: string | null
          offer_id?: string | null
          reasoning?: string | null
          tenant_id: string
          title: string
          type: string
          viewed_at?: string | null
        }
        Update: {
          acted_at?: string | null
          acted_on?: boolean | null
          contact_a_id?: string | null
          contact_b_id?: string | null
          created_at?: string | null
          date?: string
          description?: string
          director_id?: string
          feedback?: string | null
          id?: string
          match_id?: string | null
          need_id?: string | null
          offer_id?: string | null
          reasoning?: string | null
          tenant_id?: string
          title?: string
          type?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_serendipity_contact_a_id_fkey"
            columns: ["contact_a_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_serendipity_contact_b_id_fkey"
            columns: ["contact_b_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_serendipity_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_serendipity_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_serendipity_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_serendipity_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_serendipity_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "daily_serendipity_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_activities: {
        Row: {
          activity_type: string
          created_at: string
          created_by: string | null
          deal_id: string
          description: string | null
          details: Json | null
          id: string
          new_value: string | null
          old_value: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          created_by?: string | null
          deal_id: string
          description?: string | null
          details?: Json | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          created_by?: string | null
          deal_id?: string
          description?: string | null
          details?: Json | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_products: {
        Row: {
          created_at: string
          deal_id: string
          description: string | null
          discount_percent: number | null
          id: string
          name: string
          quantity: number
          total_price: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          deal_id: string
          description?: string | null
          discount_percent?: number | null
          id?: string
          name: string
          quantity?: number
          total_price?: number | null
          unit_price: number
        }
        Update: {
          created_at?: string
          deal_id?: string
          description?: string | null
          discount_percent?: number | null
          id?: string
          name?: string
          quantity?: number
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "deal_products_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stages: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_closed_lost: boolean | null
          is_closed_won: boolean | null
          name: string
          position: number
          probability_default: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_closed_lost?: boolean | null
          is_closed_won?: boolean | null
          name: string
          position?: number
          probability_default?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_closed_lost?: boolean | null
          is_closed_won?: boolean | null
          name?: string
          position?: number
          probability_default?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_team_activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          team_contact_id: string
          team_id: string
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          team_contact_id: string
          team_id: string
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          team_contact_id?: string
          team_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_team_activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_activity_log_team_contact_id_fkey"
            columns: ["team_contact_id"]
            isOneToOne: false
            referencedRelation: "deal_team_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_activity_log_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_team_activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_team_actual_commissions: {
        Row: {
          actual_commission: number
          actual_premium: number
          client_product_id: string | null
          created_at: string
          id: string
          month_date: string
          notes: string | null
          team_contact_id: string
          team_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actual_commission?: number
          actual_premium?: number
          client_product_id?: string | null
          created_at?: string
          id?: string
          month_date: string
          notes?: string | null
          team_contact_id: string
          team_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actual_commission?: number
          actual_premium?: number
          client_product_id?: string | null
          created_at?: string
          id?: string
          month_date?: string
          notes?: string | null
          team_contact_id?: string
          team_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_team_actual_commissions_client_product_id_fkey"
            columns: ["client_product_id"]
            isOneToOne: false
            referencedRelation: "deal_team_client_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_actual_commissions_team_contact_id_fkey"
            columns: ["team_contact_id"]
            isOneToOne: false
            referencedRelation: "deal_team_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_actual_commissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_actual_commissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_team_actual_commissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_team_assignments: {
        Row: {
          assigned_by: string
          assigned_to: string
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          status: string | null
          team_contact_id: string
          team_id: string
          tenant_id: string
          title: string
        }
        Insert: {
          assigned_by: string
          assigned_to: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          team_contact_id: string
          team_id: string
          tenant_id: string
          title: string
        }
        Update: {
          assigned_by?: string
          assigned_to?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          team_contact_id?: string
          team_id?: string
          tenant_id?: string
          title?: string
        }
        Relationships: []
      }
      deal_team_client_products: {
        Row: {
          commission_percent: number
          contract_duration_months: number | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          deal_value: number
          expected_commission: number
          id: string
          notes: string | null
          offering_start_date: string | null
          policy_id: string | null
          probability_percent: number
          product_category_id: string
          team_contact_id: string
          team_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          commission_percent?: number
          contract_duration_months?: number | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          deal_value?: number
          expected_commission?: number
          id?: string
          notes?: string | null
          offering_start_date?: string | null
          policy_id?: string | null
          probability_percent?: number
          product_category_id: string
          team_contact_id: string
          team_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          commission_percent?: number
          contract_duration_months?: number | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          deal_value?: number
          expected_commission?: number
          id?: string
          notes?: string | null
          offering_start_date?: string | null
          policy_id?: string | null
          probability_percent?: number
          product_category_id?: string
          team_contact_id?: string
          team_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_team_client_products_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_client_products_product_category_id_fkey"
            columns: ["product_category_id"]
            isOneToOne: false
            referencedRelation: "deal_team_product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_client_products_team_contact_id_fkey"
            columns: ["team_contact_id"]
            isOneToOne: false
            referencedRelation: "deal_team_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_client_products_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_client_products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_team_client_products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_team_contacts: {
        Row: {
          ai_brief: string | null
          ai_brief_generated_at: string | null
          assigned_to: string | null
          audit_done_at: string | null
          category: string
          category_changed_at: string | null
          client_complexity: Json | null
          client_status: string | null
          contact_id: string
          created_at: string | null
          deal_id: string | null
          deal_stage: string | null
          estimated_value: number | null
          expected_annual_premium_gr: number | null
          handshake_at: string | null
          id: string
          is_lost: boolean | null
          k1_meeting_done_at: string | null
          k1_meeting_scheduled_at: string | null
          k2_handshake_at: string | null
          k3_poa_signed_at: string | null
          k4_offer_accepted_at: string | null
          k4_policy_signed_at: string | null
          last_status_update: string | null
          lost_at: string | null
          lost_reason: string | null
          next_action: string | null
          next_action_date: string | null
          next_action_owner: string | null
          next_meeting_date: string | null
          next_meeting_with: string | null
          notes: string | null
          offering_stage: string | null
          poa_signed_at: string | null
          potential_communication_gr: number | null
          potential_financial_gr: number | null
          potential_life_group_gr: number | null
          potential_property_gr: number | null
          priority: string | null
          prospect_source: string | null
          representative_user_id: string | null
          review_frequency: string | null
          snooze_reason: string | null
          snoozed_from_category: string | null
          snoozed_until: string | null
          source_contact_id: string | null
          status: string
          status_overdue: boolean | null
          team_id: string
          temperature: string | null
          tenant_id: string
          updated_at: string | null
          value_currency: string | null
          won_at: string | null
        }
        Insert: {
          ai_brief?: string | null
          ai_brief_generated_at?: string | null
          assigned_to?: string | null
          audit_done_at?: string | null
          category?: string
          category_changed_at?: string | null
          client_complexity?: Json | null
          client_status?: string | null
          contact_id: string
          created_at?: string | null
          deal_id?: string | null
          deal_stage?: string | null
          estimated_value?: number | null
          expected_annual_premium_gr?: number | null
          handshake_at?: string | null
          id?: string
          is_lost?: boolean | null
          k1_meeting_done_at?: string | null
          k1_meeting_scheduled_at?: string | null
          k2_handshake_at?: string | null
          k3_poa_signed_at?: string | null
          k4_offer_accepted_at?: string | null
          k4_policy_signed_at?: string | null
          last_status_update?: string | null
          lost_at?: string | null
          lost_reason?: string | null
          next_action?: string | null
          next_action_date?: string | null
          next_action_owner?: string | null
          next_meeting_date?: string | null
          next_meeting_with?: string | null
          notes?: string | null
          offering_stage?: string | null
          poa_signed_at?: string | null
          potential_communication_gr?: number | null
          potential_financial_gr?: number | null
          potential_life_group_gr?: number | null
          potential_property_gr?: number | null
          priority?: string | null
          prospect_source?: string | null
          representative_user_id?: string | null
          review_frequency?: string | null
          snooze_reason?: string | null
          snoozed_from_category?: string | null
          snoozed_until?: string | null
          source_contact_id?: string | null
          status?: string
          status_overdue?: boolean | null
          team_id: string
          temperature?: string | null
          tenant_id: string
          updated_at?: string | null
          value_currency?: string | null
          won_at?: string | null
        }
        Update: {
          ai_brief?: string | null
          ai_brief_generated_at?: string | null
          assigned_to?: string | null
          audit_done_at?: string | null
          category?: string
          category_changed_at?: string | null
          client_complexity?: Json | null
          client_status?: string | null
          contact_id?: string
          created_at?: string | null
          deal_id?: string | null
          deal_stage?: string | null
          estimated_value?: number | null
          expected_annual_premium_gr?: number | null
          handshake_at?: string | null
          id?: string
          is_lost?: boolean | null
          k1_meeting_done_at?: string | null
          k1_meeting_scheduled_at?: string | null
          k2_handshake_at?: string | null
          k3_poa_signed_at?: string | null
          k4_offer_accepted_at?: string | null
          k4_policy_signed_at?: string | null
          last_status_update?: string | null
          lost_at?: string | null
          lost_reason?: string | null
          next_action?: string | null
          next_action_date?: string | null
          next_action_owner?: string | null
          next_meeting_date?: string | null
          next_meeting_with?: string | null
          notes?: string | null
          offering_stage?: string | null
          poa_signed_at?: string | null
          potential_communication_gr?: number | null
          potential_financial_gr?: number | null
          potential_life_group_gr?: number | null
          potential_property_gr?: number | null
          priority?: string | null
          prospect_source?: string | null
          representative_user_id?: string | null
          review_frequency?: string | null
          snooze_reason?: string | null
          snoozed_from_category?: string | null
          snoozed_until?: string | null
          source_contact_id?: string | null
          status?: string
          status_overdue?: boolean | null
          team_id?: string
          temperature?: string | null
          tenant_id?: string
          updated_at?: string | null
          value_currency?: string | null
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_team_contacts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_contacts_source_contact_id_fkey"
            columns: ["source_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_contacts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_team_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_team_members: {
        Row: {
          created_at: string | null
          director_id: string
          id: string
          is_active: boolean | null
          joined_at: string | null
          role: string
          team_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          director_id: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          role?: string
          team_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          director_id?: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          role?: string
          team_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_team_members_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_team_payment_schedule: {
        Row: {
          amount: number
          client_product_id: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          is_paid: boolean
          paid_at: string | null
          payment_type: string
          scheduled_date: string
          team_contact_id: string
          team_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          client_product_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_paid?: boolean
          paid_at?: string | null
          payment_type?: string
          scheduled_date: string
          team_contact_id: string
          team_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_product_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_paid?: boolean
          paid_at?: string | null
          payment_type?: string
          scheduled_date?: string
          team_contact_id?: string
          team_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_team_payment_schedule_client_product_id_fkey"
            columns: ["client_product_id"]
            isOneToOne: false
            referencedRelation: "deal_team_client_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_payment_schedule_team_contact_id_fkey"
            columns: ["team_contact_id"]
            isOneToOne: false
            referencedRelation: "deal_team_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_payment_schedule_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_payment_schedule_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_team_payment_schedule_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_team_product_categories: {
        Row: {
          color: string
          created_at: string
          default_commission_percent: number | null
          id: string
          is_active: boolean
          name: string
          sales_area: string | null
          sort_order: number
          team_id: string
          tenant_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          default_commission_percent?: number | null
          id?: string
          is_active?: boolean
          name: string
          sales_area?: string | null
          sort_order?: number
          team_id: string
          tenant_id: string
        }
        Update: {
          color?: string
          created_at?: string
          default_commission_percent?: number | null
          id?: string
          is_active?: boolean
          name?: string
          sales_area?: string | null
          sort_order?: number
          team_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_team_product_categories_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_team_product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_team_representative_assignments: {
        Row: {
          active: boolean
          assigned_at: string | null
          assigned_by_user_id: string | null
          deal_team_contact_id: string
          id: string
          notes: string | null
          representative_user_id: string
          team_id: string
          tenant_id: string
          unassigned_at: string | null
        }
        Insert: {
          active?: boolean
          assigned_at?: string | null
          assigned_by_user_id?: string | null
          deal_team_contact_id: string
          id?: string
          notes?: string | null
          representative_user_id: string
          team_id: string
          tenant_id: string
          unassigned_at?: string | null
        }
        Update: {
          active?: boolean
          assigned_at?: string | null
          assigned_by_user_id?: string | null
          deal_team_contact_id?: string
          id?: string
          notes?: string | null
          representative_user_id?: string
          team_id?: string
          tenant_id?: string
          unassigned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_team_representative_assignments_deal_team_contact_id_fkey"
            columns: ["deal_team_contact_id"]
            isOneToOne: false
            referencedRelation: "deal_team_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_representative_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_representative_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_team_representative_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_team_revenue_forecasts: {
        Row: {
          amount: number
          client_product_id: string
          created_at: string
          id: string
          month_date: string
          month_offset: number
          percentage: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          client_product_id: string
          created_at?: string
          id?: string
          month_date: string
          month_offset: number
          percentage?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_product_id?: string
          created_at?: string
          id?: string
          month_date?: string
          month_offset?: number
          percentage?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_team_revenue_forecasts_client_product_id_fkey"
            columns: ["client_product_id"]
            isOneToOne: false
            referencedRelation: "deal_team_client_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_revenue_forecasts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_team_revenue_forecasts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_team_watched_contacts: {
        Row: {
          added_by: string | null
          contact_id: string
          created_at: string | null
          id: string
          team_id: string
          tenant_id: string
        }
        Insert: {
          added_by?: string | null
          contact_id: string
          created_at?: string | null
          id?: string
          team_id: string
          tenant_id: string
        }
        Update: {
          added_by?: string | null
          contact_id?: string
          created_at?: string | null
          id?: string
          team_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_team_watched_contacts_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_watched_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_watched_contacts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_team_watched_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_team_watched_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_team_weekly_statuses: {
        Row: {
          blockers: string | null
          category_recommendation: string | null
          created_at: string | null
          id: string
          meeting_happened: boolean | null
          meeting_outcome: string | null
          next_steps: string | null
          reported_by: string
          status_summary: string
          team_contact_id: string
          team_id: string
          tenant_id: string
          week_start: string
        }
        Insert: {
          blockers?: string | null
          category_recommendation?: string | null
          created_at?: string | null
          id?: string
          meeting_happened?: boolean | null
          meeting_outcome?: string | null
          next_steps?: string | null
          reported_by: string
          status_summary: string
          team_contact_id: string
          team_id: string
          tenant_id: string
          week_start: string
        }
        Update: {
          blockers?: string | null
          category_recommendation?: string | null
          created_at?: string | null
          id?: string
          meeting_happened?: boolean | null
          meeting_outcome?: string | null
          next_steps?: string | null
          reported_by?: string
          status_summary?: string
          team_contact_id?: string
          team_id?: string
          tenant_id?: string
          week_start?: string
        }
        Relationships: []
      }
      deal_teams: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          kpi_targets: Json | null
          name: string
          status_frequency_days: Json | null
          tenant_id: string
          updated_at: string | null
          weekly_status_day: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          kpi_targets?: Json | null
          name: string
          status_frequency_days?: Json | null
          tenant_id: string
          updated_at?: string | null
          weekly_status_day?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          kpi_targets?: Json | null
          name?: string
          status_frequency_days?: Json | null
          tenant_id?: string
          updated_at?: string | null
          weekly_status_day?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_teams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_teams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          actual_close_date: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          currency: string
          description: string | null
          expected_close_date: string | null
          id: string
          lost_reason: string | null
          notes: string | null
          owner_id: string | null
          priority: string | null
          probability: number
          sort_order: number | null
          source: string | null
          stage_id: string
          status: string
          tags: string[] | null
          team_id: string | null
          tenant_id: string
          title: string
          updated_at: string
          value: number
          won_at: string | null
        }
        Insert: {
          actual_close_date?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          notes?: string | null
          owner_id?: string | null
          priority?: string | null
          probability?: number
          sort_order?: number | null
          source?: string | null
          stage_id: string
          status?: string
          tags?: string[] | null
          team_id?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          value?: number
          won_at?: string | null
        }
        Update: {
          actual_close_date?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          notes?: string | null
          owner_id?: string | null
          priority?: string | null
          probability?: number
          sort_order?: number | null
          source?: string | null
          stage_id?: string
          status?: string
          tags?: string[] | null
          team_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          value?: number
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "deal_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "mv_deal_pipeline_stats"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "deals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      default_positions: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          sort_order: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          sort_order?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          sort_order?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "default_positions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "default_positions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      directors: {
        Row: {
          created_at: string | null
          email: string
          feature_flags: Json
          full_name: string
          id: string
          role: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          feature_flags?: Json
          full_name: string
          id?: string
          role?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          feature_flags?: Json
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
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "directors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          component_stack: string | null
          created_at: string | null
          error_message: string
          error_stack: string | null
          id: string
          tenant_id: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component_stack?: string | null
          created_at?: string | null
          error_message: string
          error_stack?: string | null
          id?: string
          tenant_id?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component_stack?: string | null
          created_at?: string | null
          error_message?: string
          error_stack?: string | null
          id?: string
          tenant_id?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "error_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exposure_locations: {
        Row: {
          activity_type: string
          address: string | null
          building_value: number | null
          city: string | null
          company_id: string
          construction_type: string
          created_at: string | null
          id: string
          lat: number | null
          lng: number | null
          machinery_value: number | null
          name: string
          notes: string | null
          stock_fluctuation: boolean | null
          stock_value: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          activity_type: string
          address?: string | null
          building_value?: number | null
          city?: string | null
          company_id: string
          construction_type?: string
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          machinery_value?: number | null
          name: string
          notes?: string | null
          stock_fluctuation?: boolean | null
          stock_value?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          activity_type?: string
          address?: string | null
          building_value?: number | null
          city?: string | null
          company_id?: string
          construction_type?: string
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          machinery_value?: number | null
          name?: string
          notes?: string | null
          stock_fluctuation?: boolean | null
          stock_value?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exposure_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exposure_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "exposure_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gcal_event_links: {
        Row: {
          created_at: string
          director_id: string
          gcal_calendar_id: string
          gcal_event_id: string
          id: string
          linked_id: string
          linked_type: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          director_id: string
          gcal_calendar_id: string
          gcal_event_id: string
          id?: string
          linked_id: string
          linked_type: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          director_id?: string
          gcal_calendar_id?: string
          gcal_event_id?: string
          id?: string
          linked_id?: string
          linked_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gcal_event_links_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gcal_event_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "gcal_event_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gcal_events: {
        Row: {
          all_day: boolean | null
          attendees: Json | null
          calendar_color: string | null
          calendar_id: string
          calendar_name: string | null
          created_at: string
          description: string | null
          director_id: string
          end_at: string | null
          gcal_event_id: string
          html_link: string | null
          id: string
          location: string | null
          start_at: string | null
          summary: string | null
          synced_at: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean | null
          attendees?: Json | null
          calendar_color?: string | null
          calendar_id: string
          calendar_name?: string | null
          created_at?: string
          description?: string | null
          director_id: string
          end_at?: string | null
          gcal_event_id: string
          html_link?: string | null
          id?: string
          location?: string | null
          start_at?: string | null
          summary?: string | null
          synced_at?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean | null
          attendees?: Json | null
          calendar_color?: string | null
          calendar_id?: string
          calendar_name?: string | null
          created_at?: string
          description?: string | null
          director_id?: string
          end_at?: string | null
          gcal_event_id?: string
          html_link?: string | null
          id?: string
          location?: string | null
          start_at?: string | null
          summary?: string | null
          synced_at?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gcal_events_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gcal_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "gcal_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gcal_tokens: {
        Row: {
          connected_email: string | null
          created_at: string
          deprecated_access_token_20260419: string | null
          deprecated_refresh_token_20260419: string | null
          director_id: string
          expires_at: string
          gmail_history_id: string | null
          gmail_initial_synced_at: string | null
          id: string
          refresh_token_encrypted: string | null
          refresh_token_iv: string | null
          scopes: string[] | null
          selected_calendars: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          connected_email?: string | null
          created_at?: string
          deprecated_access_token_20260419?: string | null
          deprecated_refresh_token_20260419?: string | null
          director_id: string
          expires_at: string
          gmail_history_id?: string | null
          gmail_initial_synced_at?: string | null
          id?: string
          refresh_token_encrypted?: string | null
          refresh_token_iv?: string | null
          scopes?: string[] | null
          selected_calendars?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          connected_email?: string | null
          created_at?: string
          deprecated_access_token_20260419?: string | null
          deprecated_refresh_token_20260419?: string | null
          director_id?: string
          expires_at?: string
          gmail_history_id?: string | null
          gmail_initial_synced_at?: string | null
          id?: string
          refresh_token_encrypted?: string | null
          refresh_token_iv?: string | null
          scopes?: string[] | null
          selected_calendars?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gcal_tokens_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gcal_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "gcal_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_labels: {
        Row: {
          color: Json | null
          created_at: string
          director_id: string
          gmail_label_id: string
          id: string
          name: string
          tenant_id: string
          type: string | null
          updated_at: string
        }
        Insert: {
          color?: Json | null
          created_at?: string
          director_id: string
          gmail_label_id: string
          id?: string
          name: string
          tenant_id: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          color?: Json | null
          created_at?: string
          director_id?: string
          gmail_label_id?: string
          id?: string
          name?: string
          tenant_id?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_labels_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_messages: {
        Row: {
          bcc: string | null
          body_html: string | null
          body_plain: string | null
          cc: string | null
          created_at: string
          date: string | null
          director_id: string
          from: string | null
          fts: unknown
          gmail_message_id: string
          id: string
          labels: string[] | null
          raw_headers: Json | null
          subject: string | null
          tenant_id: string
          thread_id: string
          to: string | null
        }
        Insert: {
          bcc?: string | null
          body_html?: string | null
          body_plain?: string | null
          cc?: string | null
          created_at?: string
          date?: string | null
          director_id: string
          from?: string | null
          fts?: unknown
          gmail_message_id: string
          id?: string
          labels?: string[] | null
          raw_headers?: Json | null
          subject?: string | null
          tenant_id: string
          thread_id: string
          to?: string | null
        }
        Update: {
          bcc?: string | null
          body_html?: string | null
          body_plain?: string | null
          cc?: string | null
          created_at?: string
          date?: string | null
          director_id?: string
          from?: string | null
          fts?: unknown
          gmail_message_id?: string
          id?: string
          labels?: string[] | null
          raw_headers?: Json | null
          subject?: string | null
          tenant_id?: string
          thread_id?: string
          to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gmail_messages_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmail_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "gmail_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_outbox: {
        Row: {
          bcc: string | null
          body_html: string | null
          body_plain: string
          cc: string | null
          contact_id: string | null
          created_at: string
          director_id: string
          error: string | null
          gmail_draft_id: string | null
          gmail_message_id: string | null
          gmail_thread_id: string | null
          id: string
          sent_at: string | null
          status: string
          subject: string
          tenant_id: string
          to: string
        }
        Insert: {
          bcc?: string | null
          body_html?: string | null
          body_plain: string
          cc?: string | null
          contact_id?: string | null
          created_at?: string
          director_id: string
          error?: string | null
          gmail_draft_id?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          subject: string
          tenant_id: string
          to: string
        }
        Update: {
          bcc?: string | null
          body_html?: string | null
          body_plain?: string
          cc?: string | null
          contact_id?: string | null
          created_at?: string
          director_id?: string
          error?: string | null
          gmail_draft_id?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          subject?: string
          tenant_id?: string
          to?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_outbox_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmail_outbox_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmail_outbox_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "gmail_outbox_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_threads: {
        Row: {
          contact_id: string | null
          created_at: string
          director_id: string
          gmail_thread_id: string
          history_id: string | null
          id: string
          is_unread: boolean
          label_ids: string[] | null
          last_message_at: string | null
          message_count: number
          snippet: string | null
          subject: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          director_id: string
          gmail_thread_id: string
          history_id?: string | null
          id?: string
          is_unread?: boolean
          label_ids?: string[] | null
          last_message_at?: string | null
          message_count?: number
          snippet?: string | null
          subject?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          director_id?: string
          gmail_thread_id?: string
          history_id?: string | null
          id?: string
          is_unread?: boolean
          label_ids?: string[] | null
          last_message_at?: string | null
          message_count?: number
          snippet?: string | null
          subject?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_threads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmail_threads_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
        ]
      }
      group_meetings: {
        Row: {
          actual_participant_count: number | null
          city: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          expected_participant_count: number | null
          id: string
          location: string | null
          name: string
          recommendations_generated: boolean | null
          scheduled_at: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          actual_participant_count?: number | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          expected_participant_count?: number | null
          id?: string
          location?: string | null
          name: string
          recommendations_generated?: boolean | null
          scheduled_at: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          actual_participant_count?: number | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          expected_participant_count?: number | null
          id?: string
          location?: string | null
          name?: string
          recommendations_generated?: boolean | null
          scheduled_at?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      insurance_policies: {
        Row: {
          actual_commission: number | null
          actual_premium: number | null
          broker_name: string | null
          closed_at: string | null
          commission_rate: number | null
          company_id: string
          contact_id: string | null
          created_at: string | null
          deal_team_contact_id: string | null
          deal_team_id: string | null
          end_date: string
          forecasted_commission: number | null
          forecasted_premium: number | null
          has_handling: boolean
          id: string
          insurer_name: string | null
          is_our_policy: boolean | null
          moved_to_finalization_at: string | null
          notes: string | null
          policy_name: string
          policy_number: string | null
          policy_type: string
          premium: number | null
          product_id: string | null
          renewal_checklist: Json | null
          representative_user_id: string | null
          start_date: string
          sum_insured: number | null
          tenant_id: string
          updated_at: string | null
          workflow_status: string | null
        }
        Insert: {
          actual_commission?: number | null
          actual_premium?: number | null
          broker_name?: string | null
          closed_at?: string | null
          commission_rate?: number | null
          company_id: string
          contact_id?: string | null
          created_at?: string | null
          deal_team_contact_id?: string | null
          deal_team_id?: string | null
          end_date: string
          forecasted_commission?: number | null
          forecasted_premium?: number | null
          has_handling?: boolean
          id?: string
          insurer_name?: string | null
          is_our_policy?: boolean | null
          moved_to_finalization_at?: string | null
          notes?: string | null
          policy_name: string
          policy_number?: string | null
          policy_type: string
          premium?: number | null
          product_id?: string | null
          renewal_checklist?: Json | null
          representative_user_id?: string | null
          start_date: string
          sum_insured?: number | null
          tenant_id: string
          updated_at?: string | null
          workflow_status?: string | null
        }
        Update: {
          actual_commission?: number | null
          actual_premium?: number | null
          broker_name?: string | null
          closed_at?: string | null
          commission_rate?: number | null
          company_id?: string
          contact_id?: string | null
          created_at?: string | null
          deal_team_contact_id?: string | null
          deal_team_id?: string | null
          end_date?: string
          forecasted_commission?: number | null
          forecasted_premium?: number | null
          has_handling?: boolean
          id?: string
          insurer_name?: string | null
          is_our_policy?: boolean | null
          moved_to_finalization_at?: string | null
          notes?: string | null
          policy_name?: string
          policy_number?: string | null
          policy_type?: string
          premium?: number | null
          product_id?: string | null
          renewal_checklist?: Json | null
          representative_user_id?: string | null
          start_date?: string
          sum_insured?: number | null
          tenant_id?: string
          updated_at?: string | null
          workflow_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_deal_team_contact_id_fkey"
            columns: ["deal_team_contact_id"]
            isOneToOne: false
            referencedRelation: "deal_team_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_deal_team_id_fkey"
            columns: ["deal_team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "insurance_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "insurance_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_products: {
        Row: {
          category: string
          code: string
          created_at: string | null
          default_commission_rate: number | null
          has_handling: boolean
          id: string
          is_active: boolean | null
          name: string
          requires_pesel: boolean
          subcategory: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          default_commission_rate?: number | null
          has_handling?: boolean
          id?: string
          is_active?: boolean | null
          name: string
          requires_pesel?: boolean
          subcategory?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          default_commission_rate?: number | null
          has_handling?: boolean
          id?: string
          is_active?: boolean | null
          name?: string
          requires_pesel?: boolean
          subcategory?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "insurance_products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_risk_assessments: {
        Row: {
          ai_analiza_kontekstu: string | null
          ai_brief_brokerski: string | null
          ai_podpowiedzi: Json | null
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          ryzyka_specyficzne_branzowe: Json | null
          ryzyko_finansowe: Json | null
          ryzyko_flota: Json | null
          ryzyko_majatkowe: Json | null
          ryzyko_oc: Json | null
          ryzyko_pracownicy: Json | null
          ryzyko_specjalistyczne: Json | null
          tenant_id: string
          typy_dzialalnosci: string[] | null
          updated_at: string | null
        }
        Insert: {
          ai_analiza_kontekstu?: string | null
          ai_brief_brokerski?: string | null
          ai_podpowiedzi?: Json | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          ryzyka_specyficzne_branzowe?: Json | null
          ryzyko_finansowe?: Json | null
          ryzyko_flota?: Json | null
          ryzyko_majatkowe?: Json | null
          ryzyko_oc?: Json | null
          ryzyko_pracownicy?: Json | null
          ryzyko_specjalistyczne?: Json | null
          tenant_id: string
          typy_dzialalnosci?: string[] | null
          updated_at?: string | null
        }
        Update: {
          ai_analiza_kontekstu?: string | null
          ai_brief_brokerski?: string | null
          ai_podpowiedzi?: Json | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          ryzyka_specyficzne_branzowe?: Json | null
          ryzyko_finansowe?: Json | null
          ryzyko_flota?: Json | null
          ryzyko_majatkowe?: Json | null
          ryzyko_oc?: Json | null
          ryzyko_pracownicy?: Json | null
          ryzyko_specjalistyczne?: Json | null
          tenant_id?: string
          typy_dzialalnosci?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_risk_assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      liability_exposure_profiles: {
        Row: {
          activity_installation: boolean | null
          activity_manufacturing: boolean | null
          activity_services: boolean | null
          activity_trading: boolean | null
          ai_generated_at: string | null
          ai_recommendation_reason: string | null
          ai_suggested_limit_eur: number | null
          b2b_vs_b2c_pct: number | null
          company_id: string
          created_at: string | null
          currency: string
          exposure_aviation_auto_rail_offshore: boolean | null
          exposure_ecommerce: boolean | null
          id: string
          notes: string | null
          services_advisory_pct: number | null
          tenant_id: string
          territory_eu_oecd_pct: number | null
          territory_poland_pct: number | null
          territory_rest_world_pct: number | null
          territory_usa_canada_pct: number | null
          total_annual_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          activity_installation?: boolean | null
          activity_manufacturing?: boolean | null
          activity_services?: boolean | null
          activity_trading?: boolean | null
          ai_generated_at?: string | null
          ai_recommendation_reason?: string | null
          ai_suggested_limit_eur?: number | null
          b2b_vs_b2c_pct?: number | null
          company_id: string
          created_at?: string | null
          currency?: string
          exposure_aviation_auto_rail_offshore?: boolean | null
          exposure_ecommerce?: boolean | null
          id?: string
          notes?: string | null
          services_advisory_pct?: number | null
          tenant_id: string
          territory_eu_oecd_pct?: number | null
          territory_poland_pct?: number | null
          territory_rest_world_pct?: number | null
          territory_usa_canada_pct?: number | null
          total_annual_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          activity_installation?: boolean | null
          activity_manufacturing?: boolean | null
          activity_services?: boolean | null
          activity_trading?: boolean | null
          ai_generated_at?: string | null
          ai_recommendation_reason?: string | null
          ai_suggested_limit_eur?: number | null
          b2b_vs_b2c_pct?: number | null
          company_id?: string
          created_at?: string | null
          currency?: string
          exposure_aviation_auto_rail_offshore?: boolean | null
          exposure_ecommerce?: boolean | null
          id?: string
          notes?: string | null
          services_advisory_pct?: number | null
          tenant_id?: string
          territory_eu_oecd_pct?: number | null
          territory_poland_pct?: number | null
          territory_rest_world_pct?: number | null
          territory_usa_canada_pct?: number | null
          total_annual_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liability_exposure_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_network_contacts: {
        Row: {
          company: string | null
          created_at: string | null
          full_name: string
          id: string
          linkedin_url: string | null
          matched_contact_id: string | null
          position: string | null
          source_contact_id: string
          tenant_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          full_name: string
          id?: string
          linkedin_url?: string | null
          matched_contact_id?: string | null
          position?: string | null
          source_contact_id: string
          tenant_id: string
        }
        Update: {
          company?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          linkedin_url?: string | null
          matched_contact_id?: string | null
          position?: string | null
          source_contact_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_network_contacts_matched_contact_id_fkey"
            columns: ["matched_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkedin_network_contacts_source_contact_id_fkey"
            columns: ["source_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkedin_network_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "linkedin_network_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      master_agent_memory: {
        Row: {
          created_at: string | null
          id: string
          industry_clusters: Json | null
          key_relationships: Json | null
          last_analysis_at: string | null
          network_insights: Json | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          industry_clusters?: Json | null
          key_relationships?: Json | null
          last_analysis_at?: string | null
          network_insights?: Json | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          industry_clusters?: Json | null
          key_relationships?: Json | null
          last_analysis_at?: string | null
          network_insights?: Json | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_agent_memory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "master_agent_memory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
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
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
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
      meeting_decisions: {
        Row: {
          created_at: string
          created_by: string
          dead_reason: string | null
          deal_team_contact_id: string
          decision_type: string
          id: string
          meeting_date: string
          milestone_variant: string | null
          next_action_date: string | null
          notes: string | null
          odprawa_session_id: string | null
          postponed_until: string | null
          prev_category: string | null
          prev_offering_stage: string | null
          prev_temperature: string | null
          team_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          dead_reason?: string | null
          deal_team_contact_id: string
          decision_type: string
          id?: string
          meeting_date: string
          milestone_variant?: string | null
          next_action_date?: string | null
          notes?: string | null
          odprawa_session_id?: string | null
          postponed_until?: string | null
          prev_category?: string | null
          prev_offering_stage?: string | null
          prev_temperature?: string | null
          team_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          dead_reason?: string | null
          deal_team_contact_id?: string
          decision_type?: string
          id?: string
          meeting_date?: string
          milestone_variant?: string | null
          next_action_date?: string | null
          notes?: string | null
          odprawa_session_id?: string | null
          postponed_until?: string | null
          prev_category?: string | null
          prev_offering_stage?: string | null
          prev_temperature?: string | null
          team_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_decisions_deal_team_contact_id_fkey"
            columns: ["deal_team_contact_id"]
            isOneToOne: false
            referencedRelation: "deal_team_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_decisions_odprawa_session_id_fkey"
            columns: ["odprawa_session_id"]
            isOneToOne: false
            referencedRelation: "odprawa_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_decisions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_decisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "meeting_decisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          attendance_status: string | null
          contact_id: string | null
          created_at: string | null
          id: string
          is_member: boolean | null
          is_new: boolean | null
          meeting_id: string
          notes: string | null
          prospect_id: string | null
        }
        Insert: {
          attendance_status?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          is_member?: boolean | null
          is_new?: boolean | null
          meeting_id: string
          notes?: string | null
          prospect_id?: string | null
        }
        Update: {
          attendance_status?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          is_member?: boolean | null
          is_new?: boolean | null
          meeting_id?: string
          notes?: string | null
          prospect_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "group_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_participants_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_questions: {
        Row: {
          answer_text: string | null
          answered_at: string | null
          answered_by: string | null
          ask_count: number
          created_at: string
          created_by: string
          deal_team_contact_id: string
          id: string
          last_asked_at: string
          last_asked_by: string | null
          question_text: string
          status: string
          team_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          answer_text?: string | null
          answered_at?: string | null
          answered_by?: string | null
          ask_count?: number
          created_at?: string
          created_by: string
          deal_team_contact_id: string
          id?: string
          last_asked_at?: string
          last_asked_by?: string | null
          question_text: string
          status?: string
          team_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          answer_text?: string | null
          answered_at?: string | null
          answered_by?: string | null
          ask_count?: number
          created_at?: string
          created_by?: string
          deal_team_contact_id?: string
          id?: string
          last_asked_at?: string
          last_asked_by?: string | null
          question_text?: string
          status?: string
          team_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_questions_deal_team_contact_id_fkey"
            columns: ["deal_team_contact_id"]
            isOneToOne: false
            referencedRelation: "deal_team_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_questions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "meeting_questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_recommendations: {
        Row: {
          created_at: string | null
          for_contact_id: string
          id: string
          match_type: string | null
          meeting_id: string
          rank: number
          reasoning: string | null
          recommended_contact_id: string
          status: string | null
          talking_points: string | null
        }
        Insert: {
          created_at?: string | null
          for_contact_id: string
          id?: string
          match_type?: string | null
          meeting_id: string
          rank: number
          reasoning?: string | null
          recommended_contact_id: string
          status?: string | null
          talking_points?: string | null
        }
        Update: {
          created_at?: string | null
          for_contact_id?: string
          id?: string
          match_type?: string | null
          meeting_id?: string
          rank?: number
          reasoning?: string | null
          recommended_contact_id?: string
          status?: string | null
          talking_points?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_recommendations_for_contact_id_fkey"
            columns: ["for_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_recommendations_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "group_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_recommendations_recommended_contact_id_fkey"
            columns: ["recommended_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
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
          fts: unknown
          id: string
          priority: string | null
          search_text: string | null
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category_path?: unknown
          contact_id: string
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          fts?: unknown
          id?: string
          priority?: string | null
          search_text?: string | null
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category_path?: unknown
          contact_id?: string
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          fts?: unknown
          id?: string
          priority?: string | null
          search_text?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
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
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
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
      notification_preferences: {
        Row: {
          consultation_reminders: boolean | null
          created_at: string | null
          daily_serendipity: boolean | null
          director_id: string
          id: string
          new_matches: boolean | null
          relationship_decay: boolean | null
          task_overdue: boolean | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          consultation_reminders?: boolean | null
          created_at?: string | null
          daily_serendipity?: boolean | null
          director_id: string
          id?: string
          new_matches?: boolean | null
          relationship_decay?: boolean | null
          task_overdue?: boolean | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          consultation_reminders?: boolean | null
          created_at?: string | null
          daily_serendipity?: boolean | null
          director_id?: string
          id?: string
          new_matches?: boolean | null
          relationship_decay?: boolean | null
          task_overdue?: boolean | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: true
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_taken: boolean | null
          action_taken_at: string | null
          created_at: string | null
          director_id: string
          entity_id: string | null
          entity_type: string | null
          expires_at: string | null
          id: string
          message: string
          priority: string | null
          read: boolean | null
          read_at: string | null
          tenant_id: string
          title: string
          type: string
        }
        Insert: {
          action_taken?: boolean | null
          action_taken_at?: string | null
          created_at?: string | null
          director_id: string
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          message: string
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          tenant_id: string
          title: string
          type: string
        }
        Update: {
          action_taken?: boolean | null
          action_taken_at?: string | null
          created_at?: string | null
          director_id?: string
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          tenant_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      odprawa_sessions: {
        Row: {
          agenda_snapshot: Json
          created_at: string
          ended_at: string | null
          id: string
          mode: string
          notes: string | null
          started_at: string
          started_by: string
          status: Database["public"]["Enums"]["odprawa_session_status"]
          team_id: string
          updated_at: string
        }
        Insert: {
          agenda_snapshot?: Json
          created_at?: string
          ended_at?: string | null
          id?: string
          mode?: string
          notes?: string | null
          started_at?: string
          started_by: string
          status?: Database["public"]["Enums"]["odprawa_session_status"]
          team_id: string
          updated_at?: string
        }
        Update: {
          agenda_snapshot?: Json
          created_at?: string
          ended_at?: string | null
          id?: string
          mode?: string
          notes?: string | null
          started_at?: string
          started_by?: string
          status?: Database["public"]["Enums"]["odprawa_session_status"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "odprawa_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
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
          fts: unknown
          id: string
          search_text: string | null
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category_path?: unknown
          contact_id: string
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          fts?: unknown
          id?: string
          search_text?: string | null
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category_path?: unknown
          contact_id?: string
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          fts?: unknown
          id?: string
          search_text?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
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
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
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
      one_on_one_meetings: {
        Row: {
          contact_a_id: string
          contact_b_id: string
          created_at: string | null
          follow_up_needed: boolean | null
          group_meeting_id: string
          id: string
          notes: string | null
          outcome: string | null
          recommendation_id: string | null
          updated_at: string | null
          was_recommended: boolean | null
        }
        Insert: {
          contact_a_id: string
          contact_b_id: string
          created_at?: string | null
          follow_up_needed?: boolean | null
          group_meeting_id: string
          id?: string
          notes?: string | null
          outcome?: string | null
          recommendation_id?: string | null
          updated_at?: string | null
          was_recommended?: boolean | null
        }
        Update: {
          contact_a_id?: string
          contact_b_id?: string
          created_at?: string | null
          follow_up_needed?: boolean | null
          group_meeting_id?: string
          id?: string
          notes?: string | null
          outcome?: string | null
          recommendation_id?: string | null
          updated_at?: string | null
          was_recommended?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "one_on_one_meetings_contact_a_id_fkey"
            columns: ["contact_a_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_on_one_meetings_contact_b_id_fkey"
            columns: ["contact_b_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_on_one_meetings_group_meeting_id_fkey"
            columns: ["group_meeting_id"]
            isOneToOne: false
            referencedRelation: "group_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_on_one_meetings_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "meeting_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      ownership_stakes: {
        Row: {
          added_by: string | null
          company_id: string
          contact_id: string
          created_at: string | null
          id: string
          notes: string | null
          ownership_percent: number | null
          revenue_share: number | null
          role: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          added_by?: string | null
          company_id: string
          contact_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          ownership_percent?: number | null
          revenue_share?: number | null
          role?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          added_by?: string | null
          company_id?: string
          contact_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          ownership_percent?: number | null
          revenue_share?: number | null
          role?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ownership_stakes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_stakes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_stakes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ownership_stakes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string | null
          icon: string
          id: string
          is_default: boolean | null
          kanban_type: string
          label: string
          parent_stage_key: string | null
          position: number
          section: string | null
          stage_key: string
          team_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          icon?: string
          id?: string
          is_default?: boolean | null
          kanban_type: string
          label: string
          parent_stage_key?: string | null
          position?: number
          section?: string | null
          stage_key: string
          team_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          icon?: string
          id?: string
          is_default?: boolean | null
          kanban_type?: string
          label?: string
          parent_stage_key?: string | null
          position?: number
          section?: string | null
          stage_key?: string
          team_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pipeline_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pkd_codes_seed: {
        Row: {
          code: string
          name: string
          search_tsv: unknown
          sector: string | null
        }
        Insert: {
          code: string
          name: string
          search_tsv?: unknown
          sector?: string | null
        }
        Update: {
          code?: string
          name?: string
          search_tsv?: unknown
          sector?: string | null
        }
        Relationships: []
      }
      policy_production_records: {
        Row: {
          actual_commission: number | null
          actual_premium: number | null
          commission_rate: number | null
          company_id: string | null
          created_at: string | null
          forecasted_commission: number | null
          forecasted_premium: number | null
          id: string
          invoice_date: string | null
          notes: string | null
          payment_date: string | null
          policy_id: string | null
          product_category: string | null
          product_id: string | null
          production_month: number
          production_year: number
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          actual_commission?: number | null
          actual_premium?: number | null
          commission_rate?: number | null
          company_id?: string | null
          created_at?: string | null
          forecasted_commission?: number | null
          forecasted_premium?: number | null
          id?: string
          invoice_date?: string | null
          notes?: string | null
          payment_date?: string | null
          policy_id?: string | null
          product_category?: string | null
          product_id?: string | null
          production_month: number
          production_year: number
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          actual_commission?: number | null
          actual_premium?: number | null
          commission_rate?: number | null
          company_id?: string | null
          created_at?: string | null
          forecasted_commission?: number | null
          forecasted_premium?: number | null
          id?: string
          invoice_date?: string | null
          notes?: string | null
          payment_date?: string | null
          policy_id?: string | null
          product_category?: string | null
          product_id?: string | null
          production_month?: number
          production_year?: number
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_production_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_production_records_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_production_records_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "insurance_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_production_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "policy_production_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_comments: {
        Row: {
          content: string
          created_at: string
          director_id: string | null
          id: string
          task_id: string
          tenant_id: string
        }
        Insert: {
          content: string
          created_at?: string
          director_id?: string | null
          id?: string
          task_id: string
          tenant_id: string
        }
        Update: {
          content?: string
          created_at?: string
          director_id?: string | null
          id?: string
          task_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      project_contacts: {
        Row: {
          added_at: string
          added_by: string | null
          contact_id: string
          id: string
          project_id: string
          role_in_project: string | null
          tenant_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          contact_id: string
          id?: string
          project_id: string
          role_in_project?: string | null
          tenant_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          contact_id?: string
          id?: string
          project_id?: string
          role_in_project?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_contacts_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          project_id: string
          tenant_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          project_id: string
          tenant_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          project_id?: string
          tenant_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
        ]
      }
      project_links: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          tenant_id: string
          title: string
          url: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          tenant_id: string
          title: string
          url: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          tenant_id?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "project_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          assistant_id: string | null
          director_id: string | null
          id: string
          joined_at: string
          project_id: string
          role: string
          tenant_id: string
        }
        Insert: {
          assistant_id?: string | null
          director_id?: string | null
          id?: string
          joined_at?: string
          project_id: string
          role?: string
          tenant_id: string
        }
        Update: {
          assistant_id?: string | null
          director_id?: string | null
          id?: string
          joined_at?: string
          project_id?: string
          role?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          name: string
          project_id: string
          sort_order: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          project_id: string
          sort_order?: number
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          project_id?: string
          sort_order?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "project_milestones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          contact_id: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          source: string
          tenant_id: string
        }
        Insert: {
          contact_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          source?: string
          tenant_id: string
        }
        Update: {
          contact_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          source?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          created_at: string
          default_tasks: Json | null
          description: string | null
          id: string
          name: string
          template_data: Json | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          default_tasks?: Json | null
          description?: string | null
          id?: string
          name: string
          template_data?: Json | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          default_tasks?: Json | null
          description?: string | null
          id?: string
          name?: string
          template_data?: Json | null
          tenant_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          auto_assign_mode: string | null
          color: string | null
          created_at: string
          description: string | null
          due_date: string | null
          embedding: string | null
          id: string
          name: string
          owner_id: string
          start_date: string | null
          status: string
          team_id: string | null
          template_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auto_assign_mode?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          embedding?: string | null
          id?: string
          name: string
          owner_id: string
          start_date?: string | null
          status?: string
          team_id?: string | null
          template_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auto_assign_mode?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          embedding?: string | null
          id?: string
          name?: string
          owner_id?: string
          start_date?: string | null
          status?: string
          team_id?: string | null
          template_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          ai_brief: Json | null
          ai_brief_generated_at: string | null
          company: string | null
          company_id: string | null
          converted_at: string | null
          converted_to_contact_id: string | null
          converted_to_team_contact_id: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          imported_at: string | null
          imported_by: string | null
          industry: string | null
          is_prospecting: boolean | null
          linkedin_url: string | null
          meeting_id: string | null
          notes: string | null
          phone: string | null
          position: string | null
          priority: string | null
          source_event: string | null
          source_file_name: string | null
          source_id: string | null
          source_type: string
          status: string
          team_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          ai_brief?: Json | null
          ai_brief_generated_at?: string | null
          company?: string | null
          company_id?: string | null
          converted_at?: string | null
          converted_to_contact_id?: string | null
          converted_to_team_contact_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          industry?: string | null
          is_prospecting?: boolean | null
          linkedin_url?: string | null
          meeting_id?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          priority?: string | null
          source_event?: string | null
          source_file_name?: string | null
          source_id?: string | null
          source_type: string
          status?: string
          team_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          ai_brief?: Json | null
          ai_brief_generated_at?: string | null
          company?: string | null
          company_id?: string | null
          converted_at?: string | null
          converted_to_contact_id?: string | null
          converted_to_team_contact_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          industry?: string | null
          is_prospecting?: boolean | null
          linkedin_url?: string | null
          meeting_id?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          priority?: string | null
          source_event?: string | null
          source_file_name?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          team_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_converted_to_contact_id_fkey"
            columns: ["converted_to_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
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
      representative_contacts: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          completed_at: string | null
          contact_id: string
          deadline_at: string | null
          deadline_days: number | null
          extended_count: number | null
          id: string
          notes: string | null
          representative_id: string
          status: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          completed_at?: string | null
          contact_id: string
          deadline_at?: string | null
          deadline_days?: number | null
          extended_count?: number | null
          id?: string
          notes?: string | null
          representative_id: string
          status?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          completed_at?: string | null
          contact_id?: string
          deadline_at?: string | null
          deadline_days?: number | null
          extended_count?: number | null
          id?: string
          notes?: string | null
          representative_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "representative_contacts_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representative_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representative_contacts_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "sales_representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_connectors: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string | null
          id: string
          last_verified_at: string | null
          relationship_description: string | null
          resource_entry_id: string
          strength: string
          tenant_id: string
          verified: boolean
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_verified_at?: string | null
          relationship_description?: string | null
          resource_entry_id: string
          strength?: string
          tenant_id: string
          verified?: boolean
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_verified_at?: string | null
          relationship_description?: string | null
          resource_entry_id?: string
          strength?: string
          tenant_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "resource_connectors_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_connectors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_connectors_resource_entry_id_fkey"
            columns: ["resource_entry_id"]
            isOneToOne: false
            referencedRelation: "resource_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_connectors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "resource_connectors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_entries: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          importance: string
          institution_id: string
          notes: string | null
          person_name: string | null
          person_position: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          importance?: string
          institution_id: string
          notes?: string | null
          person_name?: string | null
          person_position?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          importance?: string
          institution_id?: string
          notes?: string | null
          person_name?: string | null
          person_position?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_entries_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "resource_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "resource_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_institutions: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_institutions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_institutions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "resource_institutions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_audit_log: {
        Row: {
          action: string
          changed_by_user_id: string
          created_at: string
          id: string
          new_role: string | null
          old_role: string | null
          target_user_id: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          changed_by_user_id: string
          created_at?: string
          id?: string
          new_role?: string | null
          old_role?: string | null
          target_user_id: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          changed_by_user_id?: string
          created_at?: string
          id?: string
          new_role?: string | null
          old_role?: string | null
          target_user_id?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      sales_representatives: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          parent_director_id: string
          role_type: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          parent_director_id: string
          role_type?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          parent_director_id?: string
          role_type?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_representatives_parent_director_id_fkey"
            columns: ["parent_director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_representatives_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "sales_representatives_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_task_views: {
        Row: {
          created_at: string
          director_id: string
          filters: Json
          id: string
          is_default: boolean | null
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          director_id: string
          filters?: Json
          id?: string
          is_default?: boolean | null
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          director_id?: string
          filters?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_task_views_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_task_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "saved_task_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sgu_csv_import_presets: {
        Row: {
          column_mapping: Json
          created_at: string
          created_by_user_id: string | null
          description: string | null
          id: string
          last_used_at: string | null
          name: string
          tenant_id: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          column_mapping: Json
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          tenant_id: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          column_mapping?: Json
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          tenant_id?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "sgu_csv_import_presets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "sgu_csv_import_presets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sgu_prospecting_candidates: {
        Row: {
          added_as_deal_team_contact_id: string | null
          address_city: string | null
          address_postal: string | null
          address_street: string | null
          ai_model: string | null
          ai_reasoning: string | null
          ai_score: number | null
          created_at: string
          email: string | null
          employees_estimate: number | null
          founded_year: number | null
          id: string
          krs_number: string | null
          name: string
          nip: string | null
          phone: string | null
          pkd_codes: string[] | null
          primary_pkd: string | null
          regon: string | null
          rejection_reason: string | null
          revenue_estimate_gr: number | null
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          source: string
          source_job_id: string | null
          status: string
          tenant_id: string
          website: string | null
        }
        Insert: {
          added_as_deal_team_contact_id?: string | null
          address_city?: string | null
          address_postal?: string | null
          address_street?: string | null
          ai_model?: string | null
          ai_reasoning?: string | null
          ai_score?: number | null
          created_at?: string
          email?: string | null
          employees_estimate?: number | null
          founded_year?: number | null
          id?: string
          krs_number?: string | null
          name: string
          nip?: string | null
          phone?: string | null
          pkd_codes?: string[] | null
          primary_pkd?: string | null
          regon?: string | null
          rejection_reason?: string | null
          revenue_estimate_gr?: number | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          source: string
          source_job_id?: string | null
          status?: string
          tenant_id: string
          website?: string | null
        }
        Update: {
          added_as_deal_team_contact_id?: string | null
          address_city?: string | null
          address_postal?: string | null
          address_street?: string | null
          ai_model?: string | null
          ai_reasoning?: string | null
          ai_score?: number | null
          created_at?: string
          email?: string | null
          employees_estimate?: number | null
          founded_year?: number | null
          id?: string
          krs_number?: string | null
          name?: string
          nip?: string | null
          phone?: string | null
          pkd_codes?: string[] | null
          primary_pkd?: string | null
          regon?: string | null
          rejection_reason?: string | null
          revenue_estimate_gr?: number | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          source?: string
          source_job_id?: string | null
          status?: string
          tenant_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sgu_prospecting_candidates_added_as_deal_team_contact_id_fkey"
            columns: ["added_as_deal_team_contact_id"]
            isOneToOne: false
            referencedRelation: "deal_team_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sgu_prospecting_candidates_source_job_id_fkey"
            columns: ["source_job_id"]
            isOneToOne: false
            referencedRelation: "background_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sgu_prospecting_candidates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "sgu_prospecting_candidates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sgu_reports_snapshots: {
        Row: {
          data: Json
          generated_at: string
          generated_by: string
          generated_by_user_id: string | null
          id: string
          pdf_generated_at: string | null
          pdf_storage_path: string | null
          period_end: string
          period_start: string
          period_type: string
          team_id: string
          tenant_id: string
        }
        Insert: {
          data: Json
          generated_at?: string
          generated_by?: string
          generated_by_user_id?: string | null
          id?: string
          pdf_generated_at?: string | null
          pdf_storage_path?: string | null
          period_end: string
          period_start: string
          period_type: string
          team_id: string
          tenant_id: string
        }
        Update: {
          data?: Json
          generated_at?: string
          generated_by?: string
          generated_by_user_id?: string | null
          id?: string
          pdf_generated_at?: string | null
          pdf_storage_path?: string | null
          period_end?: string
          period_start?: string
          period_type?: string
          team_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sgu_reports_snapshots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sgu_reports_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "sgu_reports_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sgu_representative_profiles: {
        Row: {
          active: boolean
          commission_override_pct: number | null
          deactivated_at: string | null
          deactivated_by_user_id: string | null
          first_name: string | null
          invited_at: string
          invited_by_user_id: string | null
          last_name: string | null
          notes: string | null
          onboarded_at: string | null
          phone: string | null
          region: string | null
          team_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          active?: boolean
          commission_override_pct?: number | null
          deactivated_at?: string | null
          deactivated_by_user_id?: string | null
          first_name?: string | null
          invited_at?: string
          invited_by_user_id?: string | null
          last_name?: string | null
          notes?: string | null
          onboarded_at?: string | null
          phone?: string | null
          region?: string | null
          team_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          active?: boolean
          commission_override_pct?: number | null
          deactivated_at?: string | null
          deactivated_by_user_id?: string | null
          first_name?: string | null
          invited_at?: string
          invited_by_user_id?: string | null
          last_name?: string | null
          notes?: string | null
          onboarded_at?: string | null
          phone?: string | null
          region?: string | null
          team_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sgu_representative_profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sgu_representative_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "sgu_representative_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sgu_settings: {
        Row: {
          case_d_confirmed: boolean
          case_d_confirmed_at: string | null
          case_d_confirmed_by_user_id: string | null
          created_at: string | null
          default_handling_pct: number
          default_rep_commission_pct: number
          enable_sgu_layout: boolean
          enable_sgu_prospecting_ai: boolean
          enable_sgu_reports: boolean
          notes: string | null
          sgu_team_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          case_d_confirmed?: boolean
          case_d_confirmed_at?: string | null
          case_d_confirmed_by_user_id?: string | null
          created_at?: string | null
          default_handling_pct?: number
          default_rep_commission_pct?: number
          enable_sgu_layout?: boolean
          enable_sgu_prospecting_ai?: boolean
          enable_sgu_reports?: boolean
          notes?: string | null
          sgu_team_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          case_d_confirmed?: boolean
          case_d_confirmed_at?: string | null
          case_d_confirmed_by_user_id?: string | null
          created_at?: string | null
          default_handling_pct?: number
          default_rep_commission_pct?: number
          enable_sgu_layout?: boolean
          enable_sgu_prospecting_ai?: boolean
          enable_sgu_reports?: boolean
          notes?: string | null
          sgu_team_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sgu_settings_sgu_team_id_fkey"
            columns: ["sgu_team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sgu_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "sgu_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sgu_web_source_runs: {
        Row: {
          candidates_added: number
          error: string | null
          finished_at: string | null
          id: string
          items_found: number
          job_id: string | null
          source_id: string
          started_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          candidates_added?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          items_found?: number
          job_id?: string | null
          source_id: string
          started_at?: string
          status?: string
          tenant_id: string
        }
        Update: {
          candidates_added?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          items_found?: number
          job_id?: string | null
          source_id?: string
          started_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sgu_web_source_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "background_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sgu_web_source_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sgu_web_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sgu_web_sources: {
        Row: {
          active: boolean
          ai_prompt_override: string | null
          created_at: string
          created_by_user_id: string | null
          id: string
          last_error: string | null
          last_result_count: number | null
          last_scraped_at: string | null
          name: string
          parser_config: Json
          product_hint_filter: string[] | null
          scrape_interval_hours: number
          search_keywords: string[] | null
          source_type: string
          tenant_id: string
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          ai_prompt_override?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          last_error?: string | null
          last_result_count?: number | null
          last_scraped_at?: string | null
          name: string
          parser_config?: Json
          product_hint_filter?: string[] | null
          scrape_interval_hours?: number
          search_keywords?: string[] | null
          source_type: string
          tenant_id: string
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          ai_prompt_override?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          last_error?: string | null
          last_result_count?: number | null
          last_scraped_at?: string | null
          name?: string
          parser_config?: Json
          product_hint_filter?: string[] | null
          scrape_interval_hours?: number
          search_keywords?: string[] | null
          source_type?: string
          tenant_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "sgu_web_sources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "sgu_web_sources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sovra_pending_actions: {
        Row: {
          actor_id: string
          args: Json
          confirmed_at: string | null
          conversation_id: string
          created_at: string
          error: string | null
          expires_at: string
          human_summary: string | null
          id: string
          message_id: string | null
          metadata: Json
          result: Json | null
          status: string
          tenant_id: string
          tool: string
        }
        Insert: {
          actor_id: string
          args: Json
          confirmed_at?: string | null
          conversation_id: string
          created_at?: string
          error?: string | null
          expires_at?: string
          human_summary?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json
          result?: Json | null
          status?: string
          tenant_id: string
          tool: string
        }
        Update: {
          actor_id?: string
          args?: Json
          confirmed_at?: string | null
          conversation_id?: string
          created_at?: string
          error?: string | null
          expires_at?: string
          human_summary?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json
          result?: Json | null
          status?: string
          tenant_id?: string
          tool?: string
        }
        Relationships: [
          {
            foreignKeyName: "sovra_pending_actions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sovra_pending_actions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sovra_pending_actions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sovra_pending_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "sovra_pending_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sovra_reminders: {
        Row: {
          channel: string | null
          director_id: string
          id: string
          message: string
          priority: string | null
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          scheduled_at: string
          sent_at: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          channel?: string | null
          director_id: string
          id?: string
          message: string
          priority?: string | null
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          scheduled_at: string
          sent_at?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          channel?: string | null
          director_id?: string
          id?: string
          message?: string
          priority?: string | null
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          scheduled_at?: string
          sent_at?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sovra_reminders_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sovra_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "sovra_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sovra_sessions: {
        Row: {
          content: Json | null
          director_id: string
          ended_at: string | null
          id: string
          metadata: Json | null
          notes_created: number | null
          started_at: string | null
          tasks_created: number | null
          tenant_id: string
          title: string | null
          type: string
        }
        Insert: {
          content?: Json | null
          director_id: string
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          notes_created?: number | null
          started_at?: string | null
          tasks_created?: number | null
          tenant_id: string
          title?: string | null
          type: string
        }
        Update: {
          content?: Json | null
          director_id?: string
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          notes_created?: number | null
          started_at?: string | null
          tasks_created?: number | null
          tenant_id?: string
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sovra_sessions_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sovra_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "sovra_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      superadmins: {
        Row: {
          created_at: string
          email: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          job_type: string
          logs: Json | null
          progress: Json | null
          started_at: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          job_type: string
          logs?: Json | null
          progress?: Json | null
          started_at?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          job_type?: string
          logs?: Json | null
          progress?: Json | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "sync_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          task_id: string
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          task_id: string
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          task_id?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
        ]
      }
      task_automation_rules: {
        Row: {
          action_config: Json | null
          action_type: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          project_id: string | null
          tenant_id: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          project_id?: string | null
          tenant_id: string
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          project_id?: string | null
          tenant_id?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_automation_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_kpi: boolean | null
          kpi_target: number | null
          name: string
          sort_order: number | null
          tenant_id: string
          updated_at: string | null
          visibility_type: string | null
          workflow_steps: Json | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_kpi?: boolean | null
          kpi_target?: number | null
          name: string
          sort_order?: number | null
          tenant_id: string
          updated_at?: string | null
          visibility_type?: string | null
          workflow_steps?: Json | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_kpi?: boolean | null
          kpi_target?: number | null
          name?: string
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string | null
          visibility_type?: string | null
          workflow_steps?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "task_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          task_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          task_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      task_custom_field_values: {
        Row: {
          created_at: string
          field_id: string
          id: string
          task_id: string
          tenant_id: string
          updated_at: string
          value_boolean: boolean | null
          value_date: string | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          field_id: string
          id?: string
          task_id: string
          tenant_id: string
          updated_at?: string
          value_boolean?: boolean | null
          value_date?: string | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          field_id?: string
          id?: string
          task_id?: string
          tenant_id?: string
          updated_at?: string
          value_boolean?: boolean | null
          value_date?: string | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_custom_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "task_custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_custom_field_values_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_custom_field_values_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_custom_field_values_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_custom_fields: {
        Row: {
          created_at: string
          field_type: string
          id: string
          is_required: boolean | null
          name: string
          options: Json | null
          project_id: string | null
          sort_order: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          name: string
          options?: Json | null
          project_id?: string | null
          sort_order?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          name?: string
          options?: Json | null
          project_id?: string | null
          sort_order?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_custom_fields_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_custom_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_custom_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string
          dependency_type: string
          depends_on_task_id: string
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          dependency_type?: string
          depends_on_task_id: string
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string
          dependency_type?: string
          depends_on_task_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_label_assignments: {
        Row: {
          created_at: string
          id: string
          label_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "task_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_label_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_labels: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_labels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_labels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_notifications: {
        Row: {
          created_at: string
          director_id: string
          id: string
          message: string | null
          read_at: string | null
          task_id: string | null
          tenant_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          director_id: string
          id?: string
          message?: string | null
          read_at?: string | null
          task_id?: string | null
          tenant_id: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          director_id?: string
          id?: string
          message?: string | null
          read_at?: string | null
          task_id?: string | null
          tenant_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_sections: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          project_id: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          project_id: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_sections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_sections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_time_entries: {
        Row: {
          created_at: string
          director_id: string
          duration_minutes: number
          ended_at: string | null
          id: string
          note: string | null
          started_at: string
          task_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          director_id: string
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          note?: string | null
          started_at: string
          task_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          director_id?: string
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          note?: string | null
          started_at?: string
          task_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          assigned_to_user_id: string | null
          category_id: string | null
          consultation_id: string | null
          created_at: string | null
          deal_team_contact_id: string | null
          deal_team_id: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          milestone_id: string | null
          owner_id: string | null
          parent_task_id: string | null
          priority: string | null
          project_id: string | null
          recurrence_rule: Json | null
          section_id: string | null
          snoozed_until: string | null
          sort_order: number | null
          source_task_id: string | null
          status: string | null
          task_type: string | null
          tenant_id: string
          title: string
          updated_at: string | null
          visibility: string | null
          workflow_step: string | null
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          category_id?: string | null
          consultation_id?: string | null
          created_at?: string | null
          deal_team_contact_id?: string | null
          deal_team_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          milestone_id?: string | null
          owner_id?: string | null
          parent_task_id?: string | null
          priority?: string | null
          project_id?: string | null
          recurrence_rule?: Json | null
          section_id?: string | null
          snoozed_until?: string | null
          sort_order?: number | null
          source_task_id?: string | null
          status?: string | null
          task_type?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
          visibility?: string | null
          workflow_step?: string | null
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          category_id?: string | null
          consultation_id?: string | null
          created_at?: string | null
          deal_team_contact_id?: string | null
          deal_team_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          milestone_id?: string | null
          owner_id?: string | null
          parent_task_id?: string | null
          priority?: string | null
          project_id?: string | null
          recurrence_rule?: Json | null
          section_id?: string | null
          snoozed_until?: string | null
          sort_order?: number | null
          source_task_id?: string | null
          status?: string | null
          task_type?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          visibility?: string | null
          workflow_step?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_team_contact_id_fkey"
            columns: ["deal_team_contact_id"]
            isOneToOne: false
            referencedRelation: "deal_team_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_team_id_fkey"
            columns: ["deal_team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "task_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_source_task_id_fkey"
            columns: ["source_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      team_meeting_task_snapshot: {
        Row: {
          column_key: string
          id: string
          meeting_id: string
          task_id: string
          task_status_at_snapshot: string
          team_contact_id: string
        }
        Insert: {
          column_key: string
          id?: string
          meeting_id: string
          task_id: string
          task_status_at_snapshot: string
          team_contact_id: string
        }
        Update: {
          column_key?: string
          id?: string
          meeting_id?: string
          task_id?: string
          task_status_at_snapshot?: string
          team_contact_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_meeting_task_snapshot_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "team_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_meeting_task_snapshot_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_meeting_task_snapshot_team_contact_id_fkey"
            columns: ["team_contact_id"]
            isOneToOne: false
            referencedRelation: "deal_team_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      team_meetings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          meeting_at: string
          notes: string | null
          team_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_at?: string
          notes?: string | null
          team_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_at?: string
          notes?: string | null
          team_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_meetings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_meetings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "team_meetings_tenant_id_fkey"
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
      user_password_policies: {
        Row: {
          created_at: string | null
          force_password_change: boolean | null
          id: string
          is_oauth_user: boolean | null
          password_changed_at: string
          password_expiry_days: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          force_password_change?: boolean | null
          id?: string
          is_oauth_user?: boolean | null
          password_changed_at?: string
          password_expiry_days?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          force_password_change?: boolean | null
          id?: string
          is_oauth_user?: boolean | null
          password_changed_at?: string
          password_expiry_days?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      wanted_contact_shares: {
        Row: {
          created_at: string
          id: string
          permission: string
          shared_by_director_id: string
          shared_with_director_id: string | null
          shared_with_team_id: string | null
          tenant_id: string
          wanted_contact_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission?: string
          shared_by_director_id: string
          shared_with_director_id?: string | null
          shared_with_team_id?: string | null
          tenant_id: string
          wanted_contact_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          shared_by_director_id?: string
          shared_with_director_id?: string | null
          shared_with_team_id?: string | null
          tenant_id?: string
          wanted_contact_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wanted_contact_shares_shared_by_director_id_fkey"
            columns: ["shared_by_director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wanted_contact_shares_shared_with_director_id_fkey"
            columns: ["shared_with_director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wanted_contact_shares_shared_with_team_id_fkey"
            columns: ["shared_with_team_id"]
            isOneToOne: false
            referencedRelation: "deal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wanted_contact_shares_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "wanted_contact_shares_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wanted_contact_shares_wanted_contact_id_fkey"
            columns: ["wanted_contact_id"]
            isOneToOne: false
            referencedRelation: "wanted_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      wanted_contacts: {
        Row: {
          company_context: string | null
          company_id: string | null
          company_industry: string | null
          company_name: string | null
          company_nip: string | null
          company_regon: string | null
          created_at: string
          created_by: string
          description: string | null
          expires_at: string | null
          fulfilled_at: string | null
          id: string
          matched_at: string | null
          matched_by: string | null
          matched_contact_id: string | null
          notes: string | null
          person_context: string | null
          person_email: string | null
          person_linkedin: string | null
          person_name: string | null
          person_phone: string | null
          person_position: string | null
          requested_by_contact_id: string
          search_context: string | null
          status: string
          tenant_id: string
          updated_at: string
          urgency: string
        }
        Insert: {
          company_context?: string | null
          company_id?: string | null
          company_industry?: string | null
          company_name?: string | null
          company_nip?: string | null
          company_regon?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          expires_at?: string | null
          fulfilled_at?: string | null
          id?: string
          matched_at?: string | null
          matched_by?: string | null
          matched_contact_id?: string | null
          notes?: string | null
          person_context?: string | null
          person_email?: string | null
          person_linkedin?: string | null
          person_name?: string | null
          person_phone?: string | null
          person_position?: string | null
          requested_by_contact_id: string
          search_context?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          company_context?: string | null
          company_id?: string | null
          company_industry?: string | null
          company_name?: string | null
          company_nip?: string | null
          company_regon?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          expires_at?: string | null
          fulfilled_at?: string | null
          id?: string
          matched_at?: string | null
          matched_by?: string | null
          matched_contact_id?: string | null
          notes?: string | null
          person_context?: string | null
          person_email?: string | null
          person_linkedin?: string | null
          person_name?: string | null
          person_phone?: string | null
          person_position?: string | null
          requested_by_contact_id?: string
          search_context?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "wanted_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wanted_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wanted_contacts_matched_by_fkey"
            columns: ["matched_by"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wanted_contacts_matched_contact_id_fkey"
            columns: ["matched_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wanted_contacts_requested_by_contact_id_fkey"
            columns: ["requested_by_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wanted_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "wanted_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_notes: {
        Row: {
          actor_id: string
          blocks: Json
          created_at: string
          id: string
          parent_note_id: string | null
          pinned: boolean
          position: number
          tenant_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          actor_id: string
          blocks?: Json
          created_at?: string
          id?: string
          parent_note_id?: string | null
          pinned?: boolean
          position?: number
          tenant_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          actor_id?: string
          blocks?: Json
          created_at?: string
          id?: string
          parent_note_id?: string | null
          pinned?: boolean
          position?: number
          tenant_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_notes_parent_note_id_fkey"
            columns: ["parent_note_id"]
            isOneToOne: false
            referencedRelation: "workspace_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_schedule: {
        Row: {
          created_at: string
          day_of_week: number
          director_id: string
          id: string
          project_id: string
          tenant_id: string
          time_block: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          director_id: string
          id?: string
          project_id: string
          tenant_id: string
          time_block?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          director_id?: string
          id?: string
          project_id?: string
          tenant_id?: string
          time_block?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_schedule_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_schedule_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_schedule_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "workspace_schedule_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_topics: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_resolved: boolean
          project_id: string
          resolved_at: string | null
          tenant_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          project_id: string
          resolved_at?: string | null
          tenant_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          project_id?: string
          resolved_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_topics_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_topics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_topics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "workspace_topics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_widgets: {
        Row: {
          actor_id: string
          config: Json
          created_at: string
          grid_h: number
          grid_w: number
          grid_x: number
          grid_y: number
          id: string
          size: string
          tenant_id: string
          widget_type: string
        }
        Insert: {
          actor_id: string
          config?: Json
          created_at?: string
          grid_h?: number
          grid_w?: number
          grid_x?: number
          grid_y?: number
          id?: string
          size?: string
          tenant_id: string
          widget_type: string
        }
        Update: {
          actor_id?: string
          config?: Json
          created_at?: string
          grid_h?: number
          grid_w?: number
          grid_x?: number
          grid_y?: number
          id?: string
          size?: string
          tenant_id?: string
          widget_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      cron_job_health: {
        Row: {
          active: boolean | null
          end_time: string | null
          jobname: string | null
          return_message: string | null
          runid: number | null
          schedule: string | null
          start_time: string | null
          status: string | null
        }
        Relationships: []
      }
      mv_dashboard_stats: {
        Row: {
          active_needs: number | null
          active_offers: number | null
          contacts_prev_30d: number | null
          critical_contacts: number | null
          healthy_contacts: number | null
          new_contacts_30d: number | null
          pending_matches: number | null
          pending_tasks: number | null
          refreshed_at: string | null
          tenant_id: string | null
          today_consultations: number | null
          total_contacts: number | null
          upcoming_meetings: number | null
          warning_contacts: number | null
        }
        Relationships: []
      }
      mv_deal_pipeline_stats: {
        Row: {
          avg_value: number | null
          deals_count: number | null
          stage_color: string | null
          stage_id: string | null
          stage_name: string | null
          stage_position: number | null
          stage_probability: number | null
          tenant_id: string | null
          total_value: number | null
          weighted_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_sgu_weekly_kpi: {
        Row: {
          booked_premium_gr: number | null
          collected_premium_gr: number | null
          commission_earned_gr: number | null
          new_policies_count: number | null
          overdue_tasks_count: number | null
          refreshed_at: string | null
          team_id: string | null
          tenant_id: string | null
          week_start: string | null
        }
        Relationships: []
      }
      unified_meetings: {
        Row: {
          contact_id_main: string | null
          created_at: string | null
          duration: number | null
          id: string | null
          location: string | null
          notes: string | null
          scheduled_at: string | null
          source_table: string | null
          status: string | null
          tenant_id: string | null
          type: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assistant_can_access_contact: {
        Args: { p_assistant_id: string; p_contact_id: string }
        Returns: boolean
      }
      calculate_relationship_health: {
        Args: { p_contact_id: string }
        Returns: number
      }
      can_access_contact: { Args: { _contact_id: string }; Returns: boolean }
      can_access_wanted_contact: {
        Args: { p_wanted_id: string }
        Returns: boolean
      }
      create_team_meeting: {
        Args: { p_notes?: string; p_snapshot?: Json; p_team_id: string }
        Returns: string
      }
      find_connection_path: {
        Args: {
          p_end_contact: string
          p_max_depth?: number
          p_start_contact: string
          p_tenant_id: string
        }
        Returns: {
          depth: number
          path: string[]
          path_types: string[]
        }[]
      }
      find_duplicate_contact: {
        Args: {
          p_email?: string
          p_first_name: string
          p_last_name: string
          p_phone?: string
          p_tenant_id: string
        }
        Returns: {
          contact_company: string
          contact_email: string
          contact_first_name: string
          contact_full_name: string
          contact_id: string
          contact_last_name: string
          contact_phone: string
          contact_phone_business: string
          contact_position: string
        }[]
      }
      find_mutual_connections: {
        Args: { p_contact_a: string; p_contact_b: string; p_tenant_id: string }
        Returns: {
          connection_to_a_type: string
          connection_to_b_type: string
          mutual_contact_id: string
          mutual_contact_name: string
        }[]
      }
      find_need_offer_matches: {
        Args: { p_limit?: number; p_tenant_id: string; p_threshold?: number }
        Returns: {
          match_need_contact_id: string
          match_need_id: string
          match_need_title: string
          match_offer_contact_id: string
          match_offer_id: string
          match_offer_title: string
          similarity: number
        }[]
      }
      get_assistant_group_ids: { Args: { _user_id: string }; Returns: string[] }
      get_assistant_tenant_id: { Args: { _user_id: string }; Returns: string }
      get_current_director_id: { Args: never; Returns: string }
      get_current_tenant_id: { Args: never; Returns: string }
      get_dashboard_stats:
        | {
            Args: never
            Returns: {
              active_needs: number
              active_offers: number
              contacts_prev_30d: number
              critical_contacts: number
              healthy_contacts: number
              new_contacts_30d: number
              pending_matches: number
              pending_tasks: number
              refreshed_at: string
              today_consultations: number
              total_contacts: number
              upcoming_meetings: number
              warning_contacts: number
            }[]
          }
        | {
            Args: { p_tenant_id: string }
            Returns: {
              active_contacts: number
              active_needs: number
              active_offers: number
              completed_tasks: number
              pending_tasks: number
              total_companies: number
              total_contacts: number
            }[]
          }
      get_odprawa_agenda: {
        Args: { p_mode?: string; p_team_id: string }
        Returns: {
          active_task_count: number
          company_name: string
          contact_id: string
          contact_name: string
          is_lost: boolean
          last_status_update: string
          next_action_date: string
          priority_bucket: string
          priority_rank: number
          stage: string
          temperature: string
        }[]
      }
      get_sales_representative_id: {
        Args: { _user_id: string }
        Returns: string
      }
      get_sgu_team_id: { Args: never; Returns: string }
      get_team_meeting_streak: { Args: { p_team_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      has_role_sgu: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      has_sgu_access: { Args: never; Returns: boolean }
      immutable_unaccent: { Args: { "": string }; Returns: string }
      invalidate_contact_ai_cache: {
        Args: { p_contact_id: string }
        Returns: undefined
      }
      is_admin_anywhere: { Args: { _user_id: string }; Returns: boolean }
      is_assistant: { Args: { _user_id: string }; Returns: boolean }
      is_contact_in_my_deal_team: {
        Args: { _contact_id: string }
        Returns: boolean
      }
      is_deal_team_member:
        | { Args: { _team_id: string; _user_id: string }; Returns: boolean }
        | { Args: { p_team_id: string }; Returns: boolean }
      is_group_shared_to_me: { Args: { _group_id: string }; Returns: boolean }
      is_sales_representative: { Args: { _user_id: string }; Returns: boolean }
      is_sgu_partner: { Args: never; Returns: boolean }
      is_sgu_representative: { Args: never; Returns: boolean }
      is_superadmin:
        | { Args: never; Returns: boolean }
        | { Args: { check_user_id: string }; Returns: boolean }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      log_entity_change: {
        Args: {
          p_action: string
          p_actor_id: string
          p_diff?: Json
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
        }
        Returns: string
      }
      match_contacts_by_project: {
        Args: {
          exclude_ids?: string[]
          match_count?: number
          match_tenant_id: string
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          company: string
          full_name: string
          id: string
          position: string
          similarity: number
        }[]
      }
      refresh_deal_pipeline_stats: { Args: never; Returns: undefined }
      representative_can_access_contact: {
        Args: { _contact_id: string; _rep_id: string }
        Returns: boolean
      }
      rpc_ai_cost_summary: {
        Args: { p_days_back?: number }
        Returns: {
          call_count: number
          day: string
          function_name: string
          provider: string
          total_cost_cents: number
          total_tokens_in: number
          total_tokens_out: number
        }[]
      }
      rpc_contact_neighbors: {
        Args: { p_contact_id: string; p_min_strength?: number }
        Returns: {
          company: string
          connection_id: string
          connection_type: string
          contact_id: string
          email: string
          full_name: string
          position: string
          relationship_type: string
          strength: number
        }[]
      }
      rpc_contact_timeline: {
        Args: {
          p_before?: string
          p_contact_id: string
          p_filter?: string
          p_limit?: number
        }
        Returns: {
          author: string
          id: string
          kind: string
          meta: Json
          preview: string
          title: string
          ts: string
        }[]
      }
      rpc_dashboard_myday: { Args: never; Returns: Json }
      rpc_mark_commission_paid_out: {
        Args: { p_entry_ids: string[] }
        Returns: number
      }
      rpc_network_paths: {
        Args: { p_from: string; p_max_hops?: number; p_to: string }
        Returns: {
          hops: number
          path_ids: string[]
          path_names: string[]
          total_strength: number
        }[]
      }
      rpc_sgu_accept_prospecting_candidate: {
        Args: { p_candidate_id: string }
        Returns: Json
      }
      rpc_sgu_complete_onboarding: {
        Args: { p_notes?: string; p_phone?: string; p_region?: string }
        Returns: undefined
      }
      rpc_sgu_deactivate_representative: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      rpc_sgu_generate_snapshot: {
        Args: {
          p_period_end?: string
          p_period_start: string
          p_period_type: string
        }
        Returns: Json
      }
      rpc_sgu_generate_snapshot_internal: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_period_type: string
          p_team_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      rpc_sgu_get_crm_contact_basic: {
        Args: { p_contact_id: string }
        Returns: Json
      }
      rpc_sgu_get_snapshot: {
        Args: { p_id: string }
        Returns: {
          data: Json
          generated_at: string
          generated_by: string
          generated_by_user_id: string
          id: string
          period_end: string
          period_start: string
          period_type: string
          team_id: string
          tenant_id: string
        }[]
      }
      rpc_sgu_reactivate_representative: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      rpc_sgu_reject_prospecting_candidate: {
        Args: { p_candidate_id: string; p_reason?: string }
        Returns: undefined
      }
      rpc_sgu_team_performance: {
        Args: { p_week_offset?: number }
        Returns: Json
      }
      rpc_sgu_weekly_kpi: { Args: { p_week_offset?: number }; Returns: Json }
      rpc_sovra_analyze_pipeline: {
        Args: { p_team_id?: string }
        Returns: Json
      }
      rpc_sovra_get_contact_details: {
        Args: { p_contact_id: string }
        Returns: Json
      }
      rpc_sovra_search_companies: {
        Args: { p_filters?: Json; p_query: string }
        Returns: Json[]
      }
      rpc_sovra_search_contacts: {
        Args: { p_filters?: Json; p_query: string }
        Returns: Json[]
      }
      rpc_sovra_search_deals: { Args: { p_filters?: Json }; Returns: Json[] }
      rpc_task_analytics: {
        Args: { p_filters?: Json; p_range: Json }
        Returns: Json
      }
      rpc_team_report: {
        Args: { p_team_id?: string; p_week_start: string }
        Returns: Json
      }
      rpc_workspace_kpi: {
        Args: { p_metric: string; p_range?: string }
        Returns: Json
      }
      schedule_edge_function: {
        Args: {
          p_body?: Json
          p_cron: string
          p_function_path: string
          p_job_name: string
        }
        Returns: number
      }
      search_all_fts: {
        Args: {
          p_limit?: number
          p_query: string
          p_tenant_id: string
          p_types?: string[]
        }
        Returns: {
          description: string
          id: string
          similarity: number
          subtitle: string
          title: string
          type: string
        }[]
      }
      search_all_hybrid: {
        Args: {
          p_fts_weight?: number
          p_limit?: number
          p_query: string
          p_query_embedding: string
          p_semantic_weight?: number
          p_tenant_id: string
          p_threshold?: number
          p_types: string[]
        }
        Returns: {
          combined_score: number
          contact_id: string
          description: string
          fts_score: number
          id: string
          match_source: string
          semantic_score: number
          subtitle: string
          title: string
          type: string
        }[]
      }
      search_contacts_semantic: {
        Args: {
          p_limit?: number
          p_query_embedding: string
          p_tenant_id: string
          p_threshold?: number
        }
        Returns: {
          company: string
          contact_id: string
          full_name: string
          job_position: string
          similarity: number
        }[]
      }
      search_needs_semantic: {
        Args: {
          p_limit?: number
          p_query_embedding: string
          p_tenant_id: string
          p_threshold?: number
        }
        Returns: {
          contact_name: string
          need_contact_id: string
          need_description: string
          need_id: string
          need_title: string
          similarity: number
        }[]
      }
      search_offers_semantic: {
        Args: {
          p_limit?: number
          p_query_embedding: string
          p_tenant_id: string
          p_threshold?: number
        }
        Returns: {
          contact_name: string
          offer_contact_id: string
          offer_description: string
          offer_id: string
          offer_title: string
          similarity: number
        }[]
      }
      seed_deal_stages_for_tenant: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      seed_default_positions_for_tenant: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      seed_pipeline_stages_for_team: {
        Args: { p_team_id: string; p_tenant_id: string }
        Returns: undefined
      }
      sgu_next_prospecting_job:
        | {
            Args: never
            Returns: {
              actor_user_id: string
              id: string
              payload: Json
              progress: number
              result: Json
              status: string
              tenant_id: string
            }[]
          }
        | {
            Args: { p_job_type?: string }
            Returns: {
              actor_user_id: string
              id: string
              payload: Json
              progress: number
              result: Json
              status: string
              tenant_id: string
            }[]
          }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      text2ltree: { Args: { "": string }; Returns: unknown }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role: "owner" | "admin" | "director" | "sgu"
      odprawa_session_status: "active" | "completed" | "abandoned" | "paused"
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
      app_role: ["owner", "admin", "director", "sgu"],
      odprawa_session_status: ["active", "completed", "abandoned", "paused"],
    },
  },
} as const
