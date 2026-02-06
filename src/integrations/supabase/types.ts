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
      agent_conversations: {
        Row: {
          actions_taken: Json[] | null
          contact_id: string
          content: string
          created_at: string
          extracted_data: Json | null
          id: string
          role: string
          session_id: string
          tenant_id: string
        }
        Insert: {
          actions_taken?: Json[] | null
          contact_id: string
          content: string
          created_at?: string
          extracted_data?: Json | null
          id?: string
          role: string
          session_id?: string
          tenant_id: string
        }
        Update: {
          actions_taken?: Json[] | null
          contact_id?: string
          content?: string
          created_at?: string
          extracted_data?: Json | null
          id?: string
          role?: string
          session_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "agent_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_recommendation_actions: {
        Row: {
          action_taken: string
          contact_ids: string[] | null
          created_at: string | null
          id: string
          recommendation_hash: string
          recommendation_title: string
          recommendation_type: string
          related_task_id: string | null
          tenant_id: string
        }
        Insert: {
          action_taken: string
          contact_ids?: string[] | null
          created_at?: string | null
          id?: string
          recommendation_hash: string
          recommendation_title: string
          recommendation_type: string
          related_task_id?: string | null
          tenant_id: string
        }
        Update: {
          action_taken?: string
          contact_ids?: string[] | null
          created_at?: string | null
          id?: string
          recommendation_hash?: string
          recommendation_title?: string
          recommendation_type?: string
          related_task_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_recommendation_actions_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_recommendation_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_recommendation_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      bi_ai_outputs: {
        Row: {
          business_interview_id: string
          connection_recommendations: Json | null
          created_at: string | null
          error_message: string | null
          id: string
          missing_info: Json | null
          needs_offers: Json | null
          processing_status: string | null
          summary: Json | null
          task_proposals: Json | null
          tenant_id: string
          updated_at: string | null
          version: number
        }
        Insert: {
          business_interview_id: string
          connection_recommendations?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          missing_info?: Json | null
          needs_offers?: Json | null
          processing_status?: string | null
          summary?: Json | null
          task_proposals?: Json | null
          tenant_id: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          business_interview_id?: string
          connection_recommendations?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          missing_info?: Json | null
          needs_offers?: Json | null
          processing_status?: string | null
          summary?: Json | null
          task_proposals?: Json | null
          tenant_id?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "bi_ai_outputs_business_interview_id_fkey"
            columns: ["business_interview_id"]
            isOneToOne: false
            referencedRelation: "business_interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bi_ai_outputs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "bi_ai_outputs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bi_interview_sessions: {
        Row: {
          completed_at: string | null
          contact_bi_id: string | null
          conversation_log: Json | null
          id: string
          questions_answered: number | null
          questions_asked: number | null
          sections_completed: string[] | null
          session_type: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          contact_bi_id?: string | null
          conversation_log?: Json | null
          id?: string
          questions_answered?: number | null
          questions_asked?: number | null
          sections_completed?: string[] | null
          session_type?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          contact_bi_id?: string | null
          conversation_log?: Json | null
          id?: string
          questions_answered?: number | null
          questions_asked?: number | null
          sections_completed?: string[] | null
          session_type?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bi_interview_sessions_contact_bi_id_fkey"
            columns: ["contact_bi_id"]
            isOneToOne: false
            referencedRelation: "contact_bi_data"
            referencedColumns: ["id"]
          },
        ]
      }
      bi_versions: {
        Row: {
          ai_output_id: string | null
          business_interview_id: string
          created_at: string | null
          created_by: string | null
          id: string
          snapshot: Json
          tenant_id: string
          version: number
        }
        Insert: {
          ai_output_id?: string | null
          business_interview_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          snapshot: Json
          tenant_id: string
          version: number
        }
        Update: {
          ai_output_id?: string | null
          business_interview_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          snapshot?: Json
          tenant_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "bi_versions_ai_output_id_fkey"
            columns: ["ai_output_id"]
            isOneToOne: false
            referencedRelation: "bi_ai_outputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bi_versions_business_interview_id_fkey"
            columns: ["business_interview_id"]
            isOneToOne: false
            referencedRelation: "business_interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bi_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bi_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "bi_versions_tenant_id_fkey"
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
      business_interviews: {
        Row: {
          contact_id: string
          created_at: string | null
          filled_by: string | null
          id: string
          meeting_date: string | null
          section_a_basic: Json | null
          section_c_company_profile: Json | null
          section_d_scale: Json | null
          section_f_strategy: Json | null
          section_g_needs: Json | null
          section_h_investments: Json | null
          section_j_value_for_cc: Json | null
          section_k_engagement: Json | null
          section_l_personal: Json | null
          section_m_organizations: Json | null
          section_n_followup: Json | null
          status: string
          tenant_id: string
          updated_at: string | null
          version: number
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          filled_by?: string | null
          id?: string
          meeting_date?: string | null
          section_a_basic?: Json | null
          section_c_company_profile?: Json | null
          section_d_scale?: Json | null
          section_f_strategy?: Json | null
          section_g_needs?: Json | null
          section_h_investments?: Json | null
          section_j_value_for_cc?: Json | null
          section_k_engagement?: Json | null
          section_l_personal?: Json | null
          section_m_organizations?: Json | null
          section_n_followup?: Json | null
          status?: string
          tenant_id: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          filled_by?: string | null
          id?: string
          meeting_date?: string | null
          section_a_basic?: Json | null
          section_c_company_profile?: Json | null
          section_d_scale?: Json | null
          section_f_strategy?: Json | null
          section_g_needs?: Json | null
          section_h_investments?: Json | null
          section_j_value_for_cc?: Json | null
          section_k_engagement?: Json | null
          section_l_personal?: Json | null
          section_m_organizations?: Json | null
          section_n_followup?: Json | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_interviews_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_interviews_filled_by_fkey"
            columns: ["filled_by"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_interviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "business_interviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      contact_activity_log: {
        Row: {
          activity_type: string
          contact_id: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          tenant_id: string
        }
        Insert: {
          activity_type: string
          contact_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          tenant_id: string
        }
        Update: {
          activity_type?: string
          contact_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_activity_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_activity_log_tenant_id_fkey"
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
      contact_bi_data: {
        Row: {
          bi_profile: Json | null
          bi_status: string | null
          completeness_score: number | null
          contact_id: string
          created_at: string | null
          id: string
          interviewer_name: string | null
          last_bi_update: string | null
          next_review_date: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          bi_profile?: Json | null
          bi_status?: string | null
          completeness_score?: number | null
          contact_id: string
          created_at?: string | null
          id?: string
          interviewer_name?: string | null
          last_bi_update?: string | null
          next_review_date?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          bi_profile?: Json | null
          bi_status?: string | null
          completeness_score?: number | null
          contact_id?: string
          created_at?: string | null
          id?: string
          interviewer_name?: string | null
          last_bi_update?: string | null
          next_review_date?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_bi_data_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_bi_data_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_bi_data_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_bi_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          contact_bi_id: string | null
          created_at: string | null
          field_path: string
          id: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          contact_bi_id?: string | null
          created_at?: string | null
          field_path: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          contact_bi_id?: string | null
          created_at?: string | null
          field_path?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_bi_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_bi_history_contact_bi_id_fkey"
            columns: ["contact_bi_id"]
            isOneToOne: false
            referencedRelation: "contact_bi_data"
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
      contact_merge_history: {
        Row: {
          ai_integrated_fields: string[] | null
          created_at: string | null
          id: string
          merge_source: string | null
          merged_contact_data: Json
          primary_contact_id: string | null
          tenant_id: string
        }
        Insert: {
          ai_integrated_fields?: string[] | null
          created_at?: string | null
          id?: string
          merge_source?: string | null
          merged_contact_data: Json
          primary_contact_id?: string | null
          tenant_id: string
        }
        Update: {
          ai_integrated_fields?: string[] | null
          created_at?: string | null
          id?: string
          merge_source?: string | null
          merged_contact_data?: Json
          primary_contact_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_merge_history_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_merge_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_merge_history_tenant_id_fkey"
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
          city: string | null
          company: string | null
          company_id: string | null
          company_verified_at: string | null
          created_at: string | null
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
          city?: string | null
          company?: string | null
          company_id?: string | null
          company_verified_at?: string | null
          created_at?: string | null
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
          city?: string | null
          company?: string | null
          company_id?: string | null
          company_verified_at?: string | null
          created_at?: string | null
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
      deal_team_members: {
        Row: {
          created_at: string | null
          director_id: string
          id: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          director_id: string
          id?: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          director_id?: string
          id?: string
          team_id?: string
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
      deal_teams: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
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
          company_id: string | null
          contact_id: string | null
          created_at: string
          currency: string
          description: string | null
          expected_close_date: string | null
          id: string
          lost_reason: string | null
          owner_id: string | null
          probability: number
          source: string | null
          stage_id: string
          status: string
          team_id: string | null
          tenant_id: string
          title: string
          updated_at: string
          value: number
          won_at: string | null
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          owner_id?: string | null
          probability?: number
          source?: string | null
          stage_id: string
          status?: string
          team_id?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          value?: number
          won_at?: string | null
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          owner_id?: string | null
          probability?: number
          source?: string | null
          stage_id?: string
          status?: string
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
          created_at: string | null
          end_date: string
          forecasted_commission: number | null
          forecasted_premium: number | null
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
          created_at?: string | null
          end_date: string
          forecasted_commission?: number | null
          forecasted_premium?: number | null
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
          created_at?: string | null
          end_date?: string
          forecasted_commission?: number | null
          forecasted_premium?: number | null
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
          id: string
          is_active: boolean | null
          name: string
          subcategory: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          default_commission_rate?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          subcategory?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          default_commission_rate?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
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
      master_agent_queries: {
        Row: {
          agents_consulted: string[] | null
          created_at: string | null
          id: string
          query: string
          query_type: string | null
          reasoning: Json | null
          response: string | null
          tenant_id: string
        }
        Insert: {
          agents_consulted?: string[] | null
          created_at?: string | null
          id?: string
          query: string
          query_type?: string | null
          reasoning?: Json | null
          response?: string | null
          tenant_id: string
        }
        Update: {
          agents_consulted?: string[] | null
          created_at?: string | null
          id?: string
          query?: string
          query_type?: string | null
          reasoning?: Json | null
          response?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_agent_queries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "master_agent_queries_tenant_id_fkey"
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
      meeting_participants: {
        Row: {
          attendance_status: string | null
          contact_id: string
          created_at: string | null
          id: string
          is_member: boolean | null
          is_new: boolean | null
          meeting_id: string
          notes: string | null
        }
        Insert: {
          attendance_status?: string | null
          contact_id: string
          created_at?: string | null
          id?: string
          is_member?: boolean | null
          is_new?: boolean | null
          meeting_id: string
          notes?: string | null
        }
        Update: {
          attendance_status?: string | null
          contact_id?: string
          created_at?: string | null
          id?: string
          is_member?: boolean | null
          is_new?: boolean | null
          meeting_id?: string
          notes?: string | null
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
      pipeline_kpi_targets: {
        Row: {
          created_at: string | null
          id: string
          month: number | null
          notes: string | null
          target_commission: number | null
          target_commission_rate: number | null
          target_premium: number
          tenant_id: string
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          month?: number | null
          notes?: string | null
          target_commission?: number | null
          target_commission_rate?: number | null
          target_premium?: number
          tenant_id: string
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: number | null
          notes?: string | null
          target_commission?: number | null
          target_commission_rate?: number | null
          target_premium?: number
          tenant_id?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_kpi_targets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pipeline_kpi_targets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      remek_conversations: {
        Row: {
          assistant_id: string | null
          context: Json | null
          created_at: string | null
          director_id: string | null
          helpful_rating: number | null
          id: string
          message: string
          role: string
          session_id: string
          tenant_id: string
        }
        Insert: {
          assistant_id?: string | null
          context?: Json | null
          created_at?: string | null
          director_id?: string | null
          helpful_rating?: number | null
          id?: string
          message: string
          role: string
          session_id?: string
          tenant_id: string
        }
        Update: {
          assistant_id?: string | null
          context?: Json | null
          created_at?: string | null
          director_id?: string | null
          helpful_rating?: number | null
          id?: string
          message?: string
          role?: string
          session_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remek_conversations_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remek_conversations_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remek_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "remek_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      remek_knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string | null
          fts: unknown
          id: string
          is_global: boolean | null
          keywords: string[] | null
          module: string | null
          related_articles: string[] | null
          sort_order: number | null
          tenant_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          fts?: unknown
          id?: string
          is_global?: boolean | null
          keywords?: string[] | null
          module?: string | null
          related_articles?: string[] | null
          sort_order?: number | null
          tenant_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          fts?: unknown
          id?: string
          is_global?: boolean | null
          keywords?: string[] | null
          module?: string | null
          related_articles?: string[] | null
          sort_order?: number | null
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remek_knowledge_base_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "remek_knowledge_base_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      search_synonyms: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          synonyms: string[]
          term: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          synonyms: string[]
          term: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          synonyms?: string[]
          term?: string
          updated_at?: string | null
        }
        Relationships: []
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
      task_workflow_history: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          id: string
          notes: string | null
          step_id: string
          task_id: string
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          notes?: string | null
          step_id: string
          task_id: string
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          notes?: string | null
          step_id?: string
          task_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_workflow_history_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_workflow_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_workflow_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_workflow_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          category_id: string | null
          consultation_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          owner_id: string | null
          priority: string | null
          snoozed_until: string | null
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
          assigned_to?: string | null
          category_id?: string | null
          consultation_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          owner_id?: string | null
          priority?: string | null
          snoozed_until?: string | null
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
          assigned_to?: string | null
          category_id?: string | null
          consultation_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          owner_id?: string | null
          priority?: string | null
          snoozed_until?: string | null
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
            foreignKeyName: "tasks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "directors"
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
      turbo_agent_sessions: {
        Row: {
          agents_responded: number | null
          agents_selected: number | null
          categories: Json | null
          completed_at: string | null
          created_at: string | null
          id: string
          insights: string[] | null
          master_response: string | null
          original_query: string
          queries_completed_at: string | null
          query_intent: string | null
          selection_completed_at: string | null
          started_at: string | null
          status: string | null
          tenant_id: string
          top_results: Json | null
          total_agents_available: number | null
          total_duration_ms: number | null
          updated_at: string | null
        }
        Insert: {
          agents_responded?: number | null
          agents_selected?: number | null
          categories?: Json | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          insights?: string[] | null
          master_response?: string | null
          original_query: string
          queries_completed_at?: string | null
          query_intent?: string | null
          selection_completed_at?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id: string
          top_results?: Json | null
          total_agents_available?: number | null
          total_duration_ms?: number | null
          updated_at?: string | null
        }
        Update: {
          agents_responded?: number | null
          agents_selected?: number | null
          categories?: Json | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          insights?: string[] | null
          master_response?: string | null
          original_query?: string
          queries_completed_at?: string | null
          query_intent?: string | null
          selection_completed_at?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string
          top_results?: Json | null
          total_agents_available?: number | null
          total_duration_ms?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turbo_agent_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_stats"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "turbo_agent_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      turbo_agent_sub_queries: {
        Row: {
          agent_response: string | null
          confidence_score: number | null
          contact_id: string
          contact_name: string | null
          evidence: string[] | null
          id: string
          processing_time_ms: number | null
          query_sent_at: string | null
          reasoning: Json | null
          relevance_score: number | null
          response_received_at: string | null
          selection_reason: string | null
          session_id: string | null
          status: string | null
          sub_query: string
        }
        Insert: {
          agent_response?: string | null
          confidence_score?: number | null
          contact_id: string
          contact_name?: string | null
          evidence?: string[] | null
          id?: string
          processing_time_ms?: number | null
          query_sent_at?: string | null
          reasoning?: Json | null
          relevance_score?: number | null
          response_received_at?: string | null
          selection_reason?: string | null
          session_id?: string | null
          status?: string | null
          sub_query: string
        }
        Update: {
          agent_response?: string | null
          confidence_score?: number | null
          contact_id?: string
          contact_name?: string | null
          evidence?: string[] | null
          id?: string
          processing_time_ms?: number | null
          query_sent_at?: string | null
          reasoning?: Json | null
          relevance_score?: number | null
          response_received_at?: string | null
          selection_reason?: string | null
          session_id?: string | null
          status?: string | null
          sub_query?: string
        }
        Relationships: [
          {
            foreignKeyName: "turbo_agent_sub_queries_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turbo_agent_sub_queries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "turbo_agent_sessions"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
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
    }
    Functions: {
      add_synonym: {
        Args: { p_category?: string; p_synonyms: string[]; p_term: string }
        Returns: string
      }
      assistant_can_access_contact: {
        Args: { p_assistant_id: string; p_contact_id: string }
        Returns: boolean
      }
      calculate_relationship_health: {
        Args: { p_contact_id: string }
        Returns: number
      }
      delete_synonym: { Args: { p_id: string }; Returns: boolean }
      expand_search_query: { Args: { p_query: string }; Returns: string[] }
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
      get_all_synonyms: {
        Args: never
        Returns: {
          category: string
          created_at: string
          id: string
          synonyms: string[]
          term: string
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
      get_sales_representative_id: {
        Args: { _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      immutable_unaccent: { Args: { "": string }; Returns: string }
      is_assistant: { Args: { _user_id: string }; Returns: boolean }
      is_deal_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_sales_representative: { Args: { _user_id: string }; Returns: boolean }
      is_superadmin:
        | { Args: never; Returns: boolean }
        | { Args: { check_user_id: string }; Returns: boolean }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      representative_can_access_contact: {
        Args: { _contact_id: string; _rep_id: string }
        Returns: boolean
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
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      test_expand_query: { Args: { p_query: string }; Returns: string[] }
      text2ltree: { Args: { "": string }; Returns: unknown }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role: "owner" | "admin" | "director"
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
      app_role: ["owner", "admin", "director"],
    },
  },
} as const
