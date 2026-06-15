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
      active_sessions: {
        Row: {
          device_info: string | null
          expires_at: string
          id: string
          ip_address: unknown
          is_revoked: boolean
          last_active_at: string
          revoked_at: string | null
          started_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          device_info?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_revoked?: boolean
          last_active_at?: string
          revoked_at?: string | null
          started_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          device_info?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_revoked?: boolean
          last_active_at?: string
          revoked_at?: string | null
          started_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          tenant_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          tenant_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          tenant_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_controls: {
        Row: {
          audit_id: string
          category: string
          created_at: string
          description: string | null
          evidence: string | null
          id: string
          is_compliant: boolean | null
          notes: string | null
          severity: Database["public"]["Enums"]["audit_finding_severity"]
          tenant_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audit_id: string
          category?: string
          created_at?: string
          description?: string | null
          evidence?: string | null
          id?: string
          is_compliant?: boolean | null
          notes?: string | null
          severity?: Database["public"]["Enums"]["audit_finding_severity"]
          tenant_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audit_id?: string
          category?: string
          created_at?: string
          description?: string | null
          evidence?: string | null
          id?: string
          is_compliant?: boolean | null
          notes?: string | null
          severity?: Database["public"]["Enums"]["audit_finding_severity"]
          tenant_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_controls_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "security_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_controls_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          action: Database["public"]["Enums"]["consent_action"]
          consent_given_at: string
          cookie_categories: Database["public"]["Enums"]["cookie_category"][]
          created_at: string
          expires_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          purposes: Database["public"]["Enums"]["consent_purpose"][]
          tenant_id: string | null
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          action?: Database["public"]["Enums"]["consent_action"]
          consent_given_at?: string
          cookie_categories?: Database["public"]["Enums"]["cookie_category"][]
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          purposes?: Database["public"]["Enums"]["consent_purpose"][]
          tenant_id?: string | null
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["consent_action"]
          consent_given_at?: string
          cookie_categories?: Database["public"]["Enums"]["cookie_category"][]
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          purposes?: Database["public"]["Enums"]["consent_purpose"][]
          tenant_id?: string | null
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cookie_definitions: {
        Row: {
          category: Database["public"]["Enums"]["cookie_category"]
          created_at: string
          description: string | null
          duration: string
          id: string
          is_required: boolean
          name: string
          policy_id: string | null
          provider: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["cookie_category"]
          created_at?: string
          description?: string | null
          duration?: string
          id?: string
          is_required?: boolean
          name: string
          policy_id?: string | null
          provider?: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["cookie_category"]
          created_at?: string
          description?: string | null
          duration?: string
          id?: string
          is_required?: boolean
          name?: string
          policy_id?: string | null
          provider?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cookie_definitions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "cookie_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cookie_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cookie_policies: {
        Row: {
          auto_block_scripts: boolean
          banner_description: string
          banner_position: string
          banner_theme: string
          banner_title: string
          cookie_policy_url: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          privacy_policy_url: string | null
          show_preferences: boolean
          show_reject_all: boolean
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_block_scripts?: boolean
          banner_description?: string
          banner_position?: string
          banner_theme?: string
          banner_title?: string
          cookie_policy_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          privacy_policy_url?: string | null
          show_preferences?: boolean
          show_reject_all?: boolean
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_block_scripts?: boolean
          banner_description?: string
          banner_position?: string
          banner_theme?: string
          banner_title?: string
          cookie_policy_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          privacy_policy_url?: string | null
          show_preferences?: boolean
          show_reject_all?: boolean
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cookie_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      data_subject_requests: {
        Row: {
          assigned_to: string | null
          cpf: string
          created_at: string
          details: string
          email: string
          id: string
          name: string
          protocol: string
          response: string | null
          right_type: Database["public"]["Enums"]["right_type"]
          status: Database["public"]["Enums"]["request_status"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          cpf: string
          created_at?: string
          details: string
          email: string
          id?: string
          name: string
          protocol: string
          response?: string | null
          right_type: Database["public"]["Enums"]["right_type"]
          status?: Database["public"]["Enums"]["request_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          cpf?: string
          created_at?: string
          details?: string
          email?: string
          id?: string
          name?: string
          protocol?: string
          response?: string | null
          right_type?: Database["public"]["Enums"]["right_type"]
          status?: Database["public"]["Enums"]["request_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_subject_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostics: {
        Row: {
          answers: Json
          created_at: string
          id: string
          overall_score: number
          scores: Json
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          overall_score?: number
          scores?: Json
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          overall_score?: number
          scores?: Json
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          content: string | null
          created_at: string
          description: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          expires_at: string | null
          file_name: string | null
          file_url: string | null
          id: string
          parent_id: string | null
          status: Database["public"]["Enums"]["document_status"]
          tags: string[] | null
          tenant_id: string | null
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          expires_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          parent_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          tags?: string[] | null
          tenant_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          expires_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          parent_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          tags?: string[] | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dpo_activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dpo_activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dpo_tasks: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dpo_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_timeline: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          incident_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          incident_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          incident_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_timeline_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          affected_count: number | null
          affected_data_types: string[] | null
          anpd_report_date: string | null
          category: string
          contained_at: string | null
          corrective_actions: string | null
          created_at: string
          description: string
          detected_at: string
          dpo_notes: string | null
          id: string
          preventive_actions: string | null
          reported_to_anpd: boolean | null
          reported_to_subjects: boolean | null
          resolved_at: string | null
          root_cause: string | null
          severity: Database["public"]["Enums"]["incident_severity"]
          status: Database["public"]["Enums"]["incident_status"]
          tenant_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          affected_count?: number | null
          affected_data_types?: string[] | null
          anpd_report_date?: string | null
          category?: string
          contained_at?: string | null
          corrective_actions?: string | null
          created_at?: string
          description: string
          detected_at?: string
          dpo_notes?: string | null
          id?: string
          preventive_actions?: string | null
          reported_to_anpd?: boolean | null
          reported_to_subjects?: boolean | null
          resolved_at?: string | null
          root_cause?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          tenant_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          affected_count?: number | null
          affected_data_types?: string[] | null
          anpd_report_date?: string | null
          category?: string
          contained_at?: string | null
          corrective_actions?: string | null
          created_at?: string
          description?: string
          detected_at?: string
          dpo_notes?: string | null
          id?: string
          preventive_actions?: string | null
          reported_to_anpd?: boolean | null
          reported_to_subjects?: boolean | null
          resolved_at?: string | null
          root_cause?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          tenant_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role_id: string
          status: Database["public"]["Enums"]["invitation_status"]
          tenant_id: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role_id: string
          status?: Database["public"]["Enums"]["invitation_status"]
          tenant_id: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role_id?: string
          status?: Database["public"]["Enums"]["invitation_status"]
          tenant_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: unknown
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      mfa_settings: {
        Row: {
          backup_codes_hash: string[] | null
          created_at: string
          id: string
          is_verified: boolean
          method: Database["public"]["Enums"]["mfa_method"]
          totp_secret_encrypted: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          backup_codes_hash?: string[] | null
          created_at?: string
          id?: string
          is_verified?: boolean
          method?: Database["public"]["Enums"]["mfa_method"]
          totp_secret_encrypted?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          backup_codes_hash?: string[] | null
          created_at?: string
          id?: string
          is_verified?: boolean
          method?: Database["public"]["Enums"]["mfa_method"]
          totp_secret_encrypted?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      password_history: {
        Row: {
          changed_at: string
          id: string
          password_hash: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          password_hash: string
          user_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          password_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          description: string | null
          id: string
          resource: string
        }
        Insert: {
          action: string
          description?: string | null
          id?: string
          resource: string
        }
        Update: {
          action?: string
          description?: string | null
          id?: string
          resource?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          category: string
          id: string
          settings: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          id?: string
          settings?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          id?: string
          settings?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      processing_activities: {
        Row: {
          controller: string
          created_at: string
          data_source: string | null
          data_subjects: string
          data_types: string[]
          department: string
          description: string | null
          disposal_method: string | null
          dpo_contact: string | null
          id: string
          international_transfer: boolean
          legal_basis: Database["public"]["Enums"]["legal_basis"]
          legal_basis_detail: string | null
          name: string
          operator: string | null
          purpose: string
          retention_period: string | null
          risk_level: Database["public"]["Enums"]["risk_level"]
          security_measures: string[] | null
          sensitive_data: boolean
          sensitive_data_types: string[] | null
          shared_with: string | null
          status: Database["public"]["Enums"]["process_status"]
          storage_location: string | null
          tenant_id: string | null
          transfer_country: string | null
          transfer_safeguard: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          controller: string
          created_at?: string
          data_source?: string | null
          data_subjects: string
          data_types?: string[]
          department: string
          description?: string | null
          disposal_method?: string | null
          dpo_contact?: string | null
          id?: string
          international_transfer?: boolean
          legal_basis: Database["public"]["Enums"]["legal_basis"]
          legal_basis_detail?: string | null
          name: string
          operator?: string | null
          purpose: string
          retention_period?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          security_measures?: string[] | null
          sensitive_data?: boolean
          sensitive_data_types?: string[] | null
          shared_with?: string | null
          status?: Database["public"]["Enums"]["process_status"]
          storage_location?: string | null
          tenant_id?: string | null
          transfer_country?: string | null
          transfer_safeguard?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          controller?: string
          created_at?: string
          data_source?: string | null
          data_subjects?: string
          data_types?: string[]
          department?: string
          description?: string | null
          disposal_method?: string | null
          dpo_contact?: string | null
          id?: string
          international_transfer?: boolean
          legal_basis?: Database["public"]["Enums"]["legal_basis"]
          legal_basis_detail?: string | null
          name?: string
          operator?: string | null
          purpose?: string
          retention_period?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          security_measures?: string[] | null
          sensitive_data?: boolean
          sensitive_data_types?: string[] | null
          shared_with?: string | null
          status?: Database["public"]["Enums"]["process_status"]
          storage_location?: string | null
          tenant_id?: string | null
          transfer_country?: string | null
          transfer_safeguard?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processing_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          mfa_enforced: boolean
          must_change_password: boolean
          password_changed_at: string | null
          password_expires_at: string | null
          phone: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          mfa_enforced?: boolean
          must_change_password?: boolean
          password_changed_at?: string | null
          password_expires_at?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          mfa_enforced?: boolean
          must_change_password?: boolean
          password_changed_at?: string | null
          password_expires_at?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      security_audits: {
        Row: {
          completed_at: string | null
          compliant_controls: number
          created_at: string
          description: string | null
          id: string
          name: string
          overall_score: number
          started_at: string | null
          status: Database["public"]["Enums"]["audit_status"]
          tenant_id: string | null
          total_controls: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          compliant_controls?: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
          overall_score?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["audit_status"]
          tenant_id?: string | null
          total_controls?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          compliant_controls?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          overall_score?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["audit_status"]
          tenant_id?: string | null
          total_controls?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_audits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          features: Json | null
          id: string
          is_active: boolean
          max_modules: number
          max_users: number
          name: string
          price_monthly: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: Json | null
          id?: string
          is_active?: boolean
          max_modules?: number
          max_users?: number
          name: string
          price_monthly?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: Json | null
          id?: string
          is_active?: boolean
          max_modules?: number
          max_users?: number
          name?: string
          price_monthly?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      supplier_assessment_tokens: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          expires_at: string
          id: string
          supplier_email: string | null
          supplier_id: string
          supplier_name: string
          token: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          supplier_email?: string | null
          supplier_id: string
          supplier_name?: string
          token?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          supplier_email?: string | null
          supplier_id?: string
          supplier_name?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_assessment_tokens_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_assessments: {
        Row: {
          answer: string | null
          category: string
          created_at: string
          id: string
          notes: string | null
          question: string
          score: number | null
          supplier_id: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          answer?: string | null
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          question: string
          score?: number | null
          supplier_id: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          answer?: string | null
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          question?: string
          score?: number | null
          supplier_id?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_assessments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_assessments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          category: string
          cnpj: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string
          data_shared: string | null
          dpa_expires_at: string | null
          has_dpa: boolean | null
          id: string
          last_assessment_at: string | null
          name: string
          notes: string | null
          overall_score: number | null
          risk_level: Database["public"]["Enums"]["supplier_risk"]
          services_description: string | null
          status: Database["public"]["Enums"]["supplier_status"]
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          cnpj?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          data_shared?: string | null
          dpa_expires_at?: string | null
          has_dpa?: boolean | null
          id?: string
          last_assessment_at?: string | null
          name: string
          notes?: string | null
          overall_score?: number | null
          risk_level?: Database["public"]["Enums"]["supplier_risk"]
          services_description?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          cnpj?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          data_shared?: string | null
          dpa_expires_at?: string | null
          has_dpa?: boolean | null
          id?: string
          last_assessment_at?: string | null
          name?: string
          notes?: string | null
          overall_score?: number | null
          risk_level?: Database["public"]["Enums"]["supplier_risk"]
          services_description?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_impersonation_logs: {
        Row: {
          admin_id: string
          ended_at: string | null
          id: string
          reason: string
          started_at: string | null
          target_user_id: string
          tenant_id: string
        }
        Insert: {
          admin_id: string
          ended_at?: string | null
          id?: string
          reason: string
          started_at?: string | null
          target_user_id: string
          tenant_id: string
        }
        Update: {
          admin_id?: string
          ended_at?: string | null
          id?: string
          reason?: string
          started_at?: string | null
          target_user_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_impersonation_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          mentions: string[] | null
          task_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          mentions?: string[] | null
          task_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          mentions?: string[] | null
          task_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          ai_priority_score: number | null
          ai_recommendation: string | null
          assigned_to: string | null
          category: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_priority_score?: number | null
          ai_recommendation?: string | null
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_priority_score?: number | null
          ai_recommendation?: string | null
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_user_profile_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
      tenant_branding: {
        Row: {
          created_at: string
          custom_css: string | null
          favicon_url: string | null
          footer_text: string | null
          id: string
          login_bg_image_url: string | null
          logo_url: string | null
          platform_name: string | null
          primary_color: string | null
          secondary_color: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_css?: string | null
          favicon_url?: string | null
          footer_text?: string | null
          id?: string
          login_bg_image_url?: string | null
          logo_url?: string | null
          platform_name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_css?: string | null
          favicon_url?: string | null
          footer_text?: string | null
          id?: string
          login_bg_image_url?: string | null
          logo_url?: string | null
          platform_name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_branding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_modules: {
        Row: {
          config: Json | null
          created_at: string
          enabled_by: string | null
          id: string
          is_enabled: boolean
          module_name: string
          tenant_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean
          module_name: string
          tenant_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean
          module_name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          cnpj: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          is_trial: boolean
          max_users: number
          name: string
          plan_id: string | null
          settings: Json | null
          slug: string
          subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_trial?: boolean
          max_users?: number
          name: string
          plan_id?: string | null
          settings?: Json | null
          slug: string
          subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_trial?: boolean
          max_users?: number
          name?: string
          plan_id?: string | null
          settings?: Json | null
          slug?: string
          subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
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
      user_tenant_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          role_id: string
          user_tenant_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role_id: string
          user_tenant_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role_id?: string
          user_tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenant_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tenant_roles_user_tenant_id_fkey"
            columns: ["user_tenant_id"]
            isOneToOne: false
            referencedRelation: "user_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tenants: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          is_active: boolean
          joined_at: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          rule_id: string | null
          status: string
          target_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          rule_id?: string | null
          status: string
          target_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          rule_id?: string | null
          status?: string
          target_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "workflow_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_rules: {
        Row: {
          action_config: Json | null
          action_type: string
          condition_config: Json | null
          created_at: string | null
          description: string | null
          event_type: string
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          condition_config?: Json | null
          created_at?: string | null
          description?: string | null
          event_type: string
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          condition_config?: Json | null
          created_at?: string | null
          description?: string | null
          event_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      tenant_task_analytics: {
        Row: {
          avg_completion_time: number | null
          completed_tasks: number | null
          pending_tasks: number | null
          tenant_id: string | null
          total_tasks: number | null
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
    }
    Functions: {
      complete_supplier_assessment_token: {
        Args: { _token: string }
        Returns: boolean
      }
      get_supplier_assessment_token: {
        Args: { _token: string }
        Returns: {
          completed_at: string
          expires_at: string
          id: string
          supplier_id: string
          supplier_name: string
        }[]
      }
      get_tenant_by_slug: {
        Args: { _slug: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_tenant_member: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      track_request_by_protocol: {
        Args: { _protocol: string }
        Returns: {
          created_at: string
          name: string
          protocol: string
          response: string
          right_type: string
          status: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "dpo"
        | "juridico"
        | "ti"
        | "auditor"
        | "operador"
        | "superadmin"
        | "tenant_admin"
        | "manager"
        | "analyst"
        | "viewer"
      audit_finding_severity:
        | "informativo"
        | "baixo"
        | "medio"
        | "alto"
        | "critico"
      audit_status: "pendente" | "em_andamento" | "concluida"
      consent_action: "aceito" | "recusado" | "revogado" | "atualizado"
      consent_purpose:
        | "cookies_essenciais"
        | "cookies_desempenho"
        | "cookies_funcionalidade"
        | "cookies_marketing"
        | "comunicacao_email"
        | "comunicacao_sms"
        | "compartilhamento_terceiros"
        | "pesquisa"
        | "outro"
      cookie_category:
        | "essencial"
        | "desempenho"
        | "funcionalidade"
        | "marketing"
      document_status:
        | "rascunho"
        | "em_revisao"
        | "aprovado"
        | "publicado"
        | "arquivado"
        | "expirado"
      document_type:
        | "politica_privacidade"
        | "relatorio_impacto"
        | "registro_consentimento"
        | "contrato_dpa"
        | "politica_retencao"
        | "termo_consentimento"
        | "plano_resposta_incidentes"
        | "politica_seguranca"
        | "contrato_operador"
        | "relatorio_auditoria"
        | "outro"
      incident_severity: "baixa" | "media" | "alta" | "critica"
      incident_status:
        | "detectado"
        | "em_analise"
        | "contido"
        | "erradicado"
        | "recuperado"
        | "encerrado"
      invitation_status: "pending" | "accepted" | "expired" | "revoked"
      legal_basis:
        | "consentimento"
        | "obrigacao_legal"
        | "execucao_contrato"
        | "exercicio_regular_direitos"
        | "protecao_vida"
        | "tutela_saude"
        | "interesse_legitimo"
        | "protecao_credito"
        | "estudo_pesquisa"
        | "execucao_politicas_publicas"
      mfa_method: "totp" | "email_otp"
      process_status: "ativo" | "inativo" | "em_revisao" | "rascunho"
      request_status: "pendente" | "em_andamento" | "concluido" | "cancelado"
      right_type:
        | "access"
        | "correction"
        | "deletion"
        | "portability"
        | "opposition"
        | "revoke"
        | "info"
        | "other"
      risk_level: "baixo" | "medio" | "alto" | "critico"
      supplier_risk: "baixo" | "medio" | "alto" | "critico"
      supplier_status: "pendente" | "aprovado" | "reprovado" | "em_revisao"
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
      app_role: [
        "admin",
        "dpo",
        "juridico",
        "ti",
        "auditor",
        "operador",
        "superadmin",
        "tenant_admin",
        "manager",
        "analyst",
        "viewer",
      ],
      audit_finding_severity: [
        "informativo",
        "baixo",
        "medio",
        "alto",
        "critico",
      ],
      audit_status: ["pendente", "em_andamento", "concluida"],
      consent_action: ["aceito", "recusado", "revogado", "atualizado"],
      consent_purpose: [
        "cookies_essenciais",
        "cookies_desempenho",
        "cookies_funcionalidade",
        "cookies_marketing",
        "comunicacao_email",
        "comunicacao_sms",
        "compartilhamento_terceiros",
        "pesquisa",
        "outro",
      ],
      cookie_category: [
        "essencial",
        "desempenho",
        "funcionalidade",
        "marketing",
      ],
      document_status: [
        "rascunho",
        "em_revisao",
        "aprovado",
        "publicado",
        "arquivado",
        "expirado",
      ],
      document_type: [
        "politica_privacidade",
        "relatorio_impacto",
        "registro_consentimento",
        "contrato_dpa",
        "politica_retencao",
        "termo_consentimento",
        "plano_resposta_incidentes",
        "politica_seguranca",
        "contrato_operador",
        "relatorio_auditoria",
        "outro",
      ],
      incident_severity: ["baixa", "media", "alta", "critica"],
      incident_status: [
        "detectado",
        "em_analise",
        "contido",
        "erradicado",
        "recuperado",
        "encerrado",
      ],
      invitation_status: ["pending", "accepted", "expired", "revoked"],
      legal_basis: [
        "consentimento",
        "obrigacao_legal",
        "execucao_contrato",
        "exercicio_regular_direitos",
        "protecao_vida",
        "tutela_saude",
        "interesse_legitimo",
        "protecao_credito",
        "estudo_pesquisa",
        "execucao_politicas_publicas",
      ],
      mfa_method: ["totp", "email_otp"],
      process_status: ["ativo", "inativo", "em_revisao", "rascunho"],
      request_status: ["pendente", "em_andamento", "concluido", "cancelado"],
      right_type: [
        "access",
        "correction",
        "deletion",
        "portability",
        "opposition",
        "revoke",
        "info",
        "other",
      ],
      risk_level: ["baixo", "medio", "alto", "critico"],
      supplier_risk: ["baixo", "medio", "alto", "critico"],
      supplier_status: ["pendente", "aprovado", "reprovado", "em_revisao"],
    },
  },
} as const
