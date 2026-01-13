// Database types - generate with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          phone: string | null
          avatar_url: string | null
          is_superadmin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          phone?: string | null
          avatar_url?: string | null
          is_superadmin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          phone?: string | null
          avatar_url?: string | null
          is_superadmin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          profile_id: string
          role: 'owner' | 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          profile_id: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          profile_id?: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
      }
      workspace_api_keys: {
        Row: {
          id: string
          workspace_id: string
          name: string
          key_hash: string
          last_used_at: string | null
          is_revoked: boolean
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          key_hash: string
          last_used_at?: string | null
          is_revoked?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          key_hash?: string
          last_used_at?: string | null
          is_revoked?: boolean
          created_at?: string
        }
      }
      admin_audit_logs: {
        Row: {
          id: string
          admin_id: string
          action: string
          target_type: string
          target_id: string | null
          details: Json
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action: string
          target_type: string
          target_id?: string | null
          details?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          action?: string
          target_type?: string
          target_id?: string | null
          details?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      global_feature_flags: {
        Row: {
          id: string
          feature_key: string
          is_enabled: boolean
          config: Json
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          feature_key: string
          is_enabled?: boolean
          config?: Json
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          feature_key?: string
          is_enabled?: boolean
          config?: Json
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Workspace = Database['public']['Tables']['workspaces']['Row']
export type WorkspaceMember = Database['public']['Tables']['workspace_members']['Row']
export type AdminAuditLog = Database['public']['Tables']['admin_audit_logs']['Row']
export type GlobalFeatureFlag = Database['public']['Tables']['global_feature_flags']['Row']
export type WorkspaceApiKey = Database['public']['Tables']['workspace_api_keys']['Row']
