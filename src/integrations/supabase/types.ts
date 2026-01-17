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
          fts: unknown
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
          search_text: string | null
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
          fts?: unknown
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
          search_text?: string | null
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
          fts?: unknown
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
          search_text?: string | null
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
          fts: unknown
          id: string
          search_text: string | null
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
          fts?: unknown
          id?: string
          search_text?: string | null
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
          fts?: unknown
          id?: string
          search_text?: string | null
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
          consultation_id: string | null
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
          consultation_id?: string | null
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
          consultation_id?: string | null
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
            foreignKeyName: "tasks_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_synonym: {
        Args: { p_category?: string; p_synonyms: string[]; p_term: string }
        Returns: string
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
      get_current_tenant_id: { Args: never; Returns: string }
      immutable_unaccent: { Args: { "": string }; Returns: string }
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
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      test_expand_query: { Args: { p_query: string }; Returns: string[] }
      text2ltree: { Args: { "": string }; Returns: unknown }
      unaccent: { Args: { "": string }; Returns: string }
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
