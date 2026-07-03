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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      candidate_badges: {
        Row: {
          badge_type: string
          block_index: number
          candidate_id: string
          detail: Json
          file_url: string
          hash: string
          id: string
          issued_at: string
          issued_by: string
          prev_hash: string
          score: number | null
          status: string
          summary: string
          title: string
        }
        Insert: {
          badge_type?: string
          block_index?: number
          candidate_id: string
          detail?: Json
          file_url?: string
          hash?: string
          id?: string
          issued_at?: string
          issued_by?: string
          prev_hash?: string
          score?: number | null
          status?: string
          summary?: string
          title: string
        }
        Update: {
          badge_type?: string
          block_index?: number
          candidate_id?: string
          detail?: Json
          file_url?: string
          hash?: string
          id?: string
          issued_at?: string
          issued_by?: string
          prev_hash?: string
          score?: number | null
          status?: string
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_badges_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_media: {
        Row: {
          candidate_id: string
          content_type: string | null
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          error: string | null
          fit_score: number | null
          id: string
          label: string | null
          media_type: string
          name: string
          recommendation: string | null
          sentiment: string | null
          size: number
          soundbites: Json
          status: string
          summary: string | null
          transcript: string | null
          updated_at: string
          url: string
          words: Json
        }
        Insert: {
          candidate_id: string
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          error?: string | null
          fit_score?: number | null
          id?: string
          label?: string | null
          media_type?: string
          name: string
          recommendation?: string | null
          sentiment?: string | null
          size?: number
          soundbites?: Json
          status?: string
          summary?: string | null
          transcript?: string | null
          updated_at?: string
          url: string
          words?: Json
        }
        Update: {
          candidate_id?: string
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          error?: string | null
          fit_score?: number | null
          id?: string
          label?: string | null
          media_type?: string
          name?: string
          recommendation?: string | null
          sentiment?: string | null
          size?: number
          soundbites?: Json
          status?: string
          summary?: string | null
          transcript?: string | null
          updated_at?: string
          url?: string
          words?: Json
        }
        Relationships: [
          {
            foreignKeyName: "candidate_media_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_notes: {
        Row: {
          author: string
          body: string
          candidate_id: string
          created_at: string
          id: string
          pinned: boolean
        }
        Insert: {
          author?: string
          body: string
          candidate_id: string
          created_at?: string
          id?: string
          pinned?: boolean
        }
        Update: {
          author?: string
          body?: string
          candidate_id?: string
          created_at?: string
          id?: string
          pinned?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "candidate_notes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_scorecards: {
        Row: {
          candidate_id: string
          concerns: Json
          created_at: string
          decision: string
          dimensions: Json
          evaluated_by: string
          id: string
          overall_score: number
          recommendation: string
          strengths: Json
          updated_at: string
        }
        Insert: {
          candidate_id: string
          concerns?: Json
          created_at?: string
          decision?: string
          dimensions?: Json
          evaluated_by?: string
          id?: string
          overall_score?: number
          recommendation?: string
          strengths?: Json
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          concerns?: Json
          created_at?: string
          decision?: string
          dimensions?: Json
          evaluated_by?: string
          id?: string
          overall_score?: number
          recommendation?: string
          strengths?: Json
          updated_at?: string
        }
        Relationships: []
      }
      candidates: {
        Row: {
          applied_role: string
          best_fit_roles: string
          contact_count: number
          created_at: string
          documents: Json
          email: string
          full_name: string
          headline: string
          id: string
          in_talent_pool: boolean
          last_contacted_at: string | null
          last_contacted_by: string
          location_id: string | null
          phone: string
          position_id: string | null
          rating: number
          region: string
          resume_url: string
          score: number
          source: string
          stage: string
          status: string
          tags: string[]
          talent_pool_reason: string
          updated_at: string
          years_experience: number
        }
        Insert: {
          applied_role?: string
          best_fit_roles?: string
          contact_count?: number
          created_at?: string
          documents?: Json
          email?: string
          full_name: string
          headline?: string
          id?: string
          in_talent_pool?: boolean
          last_contacted_at?: string | null
          last_contacted_by?: string
          location_id?: string | null
          phone?: string
          position_id?: string | null
          rating?: number
          region?: string
          resume_url?: string
          score?: number
          source?: string
          stage?: string
          status?: string
          tags?: string[]
          talent_pool_reason?: string
          updated_at?: string
          years_experience?: number
        }
        Update: {
          applied_role?: string
          best_fit_roles?: string
          contact_count?: number
          created_at?: string
          documents?: Json
          email?: string
          full_name?: string
          headline?: string
          id?: string
          in_talent_pool?: boolean
          last_contacted_at?: string | null
          last_contacted_by?: string
          location_id?: string | null
          phone?: string
          position_id?: string | null
          rating?: number
          region?: string
          resume_url?: string
          score?: number
          source?: string
          stage?: string
          status?: string
          tags?: string[]
          talent_pool_reason?: string
          updated_at?: string
          years_experience?: number
        }
        Relationships: [
          {
            foreignKeyName: "candidates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_log: {
        Row: {
          candidate_id: string
          contacted_by: string
          created_at: string
          direction: string
          id: string
          method: string
          notes: string
          outcome: string
        }
        Insert: {
          candidate_id: string
          contacted_by?: string
          created_at?: string
          direction?: string
          id?: string
          method?: string
          notes?: string
          outcome?: string
        }
        Update: {
          candidate_id?: string
          contacted_by?: string
          created_at?: string
          direction?: string
          id?: string
          method?: string
          notes?: string
          outcome?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_log_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_events: {
        Row: {
          candidate_id: string | null
          created_at: string
          created_by: string
          ends_at: string | null
          event_type: string
          id: string
          location_detail: string
          location_id: string | null
          mode: string
          notes: string
          position_id: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string
          created_by?: string
          ends_at?: string | null
          event_type?: string
          id?: string
          location_detail?: string
          location_id?: string | null
          mode?: string
          notes?: string
          position_id?: string | null
          starts_at: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string | null
          created_at?: string
          created_by?: string
          ends_at?: string | null
          event_type?: string
          id?: string
          location_detail?: string
          location_id?: string | null
          mode?: string
          notes?: string
          position_id?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_events_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_events_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_questions: {
        Row: {
          category: string
          created_at: string
          difficulty: string
          guidance: string
          id: string
          question: string
          role: string
        }
        Insert: {
          category?: string
          created_at?: string
          difficulty?: string
          guidance?: string
          id?: string
          question: string
          role?: string
        }
        Update: {
          category?: string
          created_at?: string
          difficulty?: string
          guidance?: string
          id?: string
          question?: string
          role?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          active: boolean
          city: string
          created_at: string
          id: string
          manager: string
          phone: string
          region: string
          site_name: string
          state: string
        }
        Insert: {
          active?: boolean
          city?: string
          created_at?: string
          id?: string
          manager?: string
          phone?: string
          region: string
          site_name: string
          state?: string
        }
        Update: {
          active?: boolean
          city?: string
          created_at?: string
          id?: string
          manager?: string
          phone?: string
          region?: string
          site_name?: string
          state?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          created_at: string
          department: string
          description: string
          employment_type: string
          id: string
          location_id: string | null
          openings: number
          pay_range: string
          posting_locations: Json
          posting_url: string
          priority: string
          region: string
          requirements: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string
          description?: string
          employment_type?: string
          id?: string
          location_id?: string | null
          openings?: number
          pay_range?: string
          posting_locations?: Json
          posting_url?: string
          priority?: string
          region?: string
          requirements?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string
          description?: string
          employment_type?: string
          id?: string
          location_id?: string | null
          openings?: number
          pay_range?: string
          posting_locations?: Json
          posting_url?: string
          priority?: string
          region?: string
          requirements?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          must_reset_password: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          must_reset_password?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          must_reset_password?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      screening_agents: {
        Row: {
          active: boolean
          closing_line: string
          color: string
          created_at: string
          extraction_goals: Json
          id: string
          name: string
          opening_line: string
          persona: string
          questions: Json
          role_focus: string
          runs: number
          similarity: number
          stability: number
          system_prompt: string
          temperature: number
          updated_at: string
          voice_id: string
          voice_name: string
        }
        Insert: {
          active?: boolean
          closing_line?: string
          color?: string
          created_at?: string
          extraction_goals?: Json
          id?: string
          name: string
          opening_line?: string
          persona?: string
          questions?: Json
          role_focus?: string
          runs?: number
          similarity?: number
          stability?: number
          system_prompt?: string
          temperature?: number
          updated_at?: string
          voice_id?: string
          voice_name?: string
        }
        Update: {
          active?: boolean
          closing_line?: string
          color?: string
          created_at?: string
          extraction_goals?: Json
          id?: string
          name?: string
          opening_line?: string
          persona?: string
          questions?: Json
          role_focus?: string
          runs?: number
          similarity?: number
          stability?: number
          system_prompt?: string
          temperature?: number
          updated_at?: string
          voice_id?: string
          voice_name?: string
        }
        Relationships: []
      }
      screening_templates: {
        Row: {
          category: string
          created_at: string
          criteria: Json
          description: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          criteria?: Json
          description?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          criteria?: Json
          description?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      screening_transcripts: {
        Row: {
          agent_id: string | null
          candidate_id: string
          created_at: string
          duration_seconds: number
          extracted: Json
          fit_score: number | null
          id: string
          recommendation: string
          sentiment: string
          source: string
          summary: string
          title: string
          transcript: string
        }
        Insert: {
          agent_id?: string | null
          candidate_id: string
          created_at?: string
          duration_seconds?: number
          extracted?: Json
          fit_score?: number | null
          id?: string
          recommendation?: string
          sentiment?: string
          source?: string
          summary?: string
          title?: string
          transcript?: string
        }
        Update: {
          agent_id?: string | null
          candidate_id?: string
          created_at?: string
          duration_seconds?: number
          extracted?: Json
          fit_score?: number | null
          id?: string
          recommendation?: string
          sentiment?: string
          source?: string
          summary?: string
          title?: string
          transcript?: string
        }
        Relationships: []
      }
      user_locations: {
        Row: {
          created_at: string
          id: string
          location_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      can_access_candidate: {
        Args: { _candidate_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_location: {
        Args: { _location_id: string; _user_id: string }
        Returns: boolean
      }
      has_all_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "regional" | "manager"
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
      app_role: ["admin", "regional", "manager"],
    },
  },
} as const
