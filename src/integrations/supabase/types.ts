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
      candidate_documents: {
        Row: {
          candidate_id: string
          document_type: string
          file_name: string
          file_path: string
          id: string
          uploaded_at: string
        }
        Insert: {
          candidate_id: string
          document_type?: string
          file_name: string
          file_path: string
          id?: string
          uploaded_at?: string
        }
        Update: {
          candidate_id?: string
          document_type?: string
          file_name?: string
          file_path?: string
          id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_documents_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          adp_registration_complete: boolean
          adp_registration_sent: boolean
          background_check_complete: boolean
          background_check_sent: boolean
          blocker_notes: string
          candidate_name: string
          clearance_type: string
          created_at: string
          current_phase: number
          dc_suitability_complete: boolean
          dc_suitability_needed: boolean
          first_day_confirmed: string | null
          hiring_manager: string
          id: string
          ids_received: boolean
          mandated_reporter_complete: boolean
          nvo_complete: boolean
          nvo_date: string | null
          offer_packet_returned: boolean
          offer_packet_sent: boolean
          position: string
          region: string
          requisition_id: string
          site: string
          updated_at: string
        }
        Insert: {
          adp_registration_complete?: boolean
          adp_registration_sent?: boolean
          background_check_complete?: boolean
          background_check_sent?: boolean
          blocker_notes?: string
          candidate_name: string
          clearance_type?: string
          created_at?: string
          current_phase?: number
          dc_suitability_complete?: boolean
          dc_suitability_needed?: boolean
          first_day_confirmed?: string | null
          hiring_manager?: string
          id?: string
          ids_received?: boolean
          mandated_reporter_complete?: boolean
          nvo_complete?: boolean
          nvo_date?: string | null
          offer_packet_returned?: boolean
          offer_packet_sent?: boolean
          position?: string
          region?: string
          requisition_id?: string
          site?: string
          updated_at?: string
        }
        Update: {
          adp_registration_complete?: boolean
          adp_registration_sent?: boolean
          background_check_complete?: boolean
          background_check_sent?: boolean
          blocker_notes?: string
          candidate_name?: string
          clearance_type?: string
          created_at?: string
          current_phase?: number
          dc_suitability_complete?: boolean
          dc_suitability_needed?: boolean
          first_day_confirmed?: string | null
          hiring_manager?: string
          id?: string
          ids_received?: boolean
          mandated_reporter_complete?: boolean
          nvo_complete?: boolean
          nvo_date?: string | null
          offer_packet_returned?: boolean
          offer_packet_sent?: boolean
          position?: string
          region?: string
          requisition_id?: string
          site?: string
          updated_at?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          active: boolean
          created_at: string
          id: string
          manager: string
          region: string
          site_name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          manager?: string
          region: string
          site_name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          manager?: string
          region?: string
          site_name?: string
        }
        Relationships: []
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
