// Viết tay theo đúng SQL đã chạy (Phụ lục A, KE_HOACH_DU_AN.md) và theo đúng
// định dạng mà `supabase gen types typescript` tạo ra.
//
// ⚠ TẠM THỜI: file này KHÔNG do CLI sinh ra (chưa có access token Supabase).
// Khi có điều kiện, chạy lại lệnh dưới đây để thay thế bằng bản chính thức:
//   npx supabase gen types typescript --project-id ueolfjujjybutyuyfxha --schema public > lib/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      staff_profiles: {
        Row: {
          id: string
          full_name: string | null
          account_status: Database["public"]["Enums"]["account_status"]
          role: Database["public"]["Enums"]["staff_role"]
          created_at: string | null
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          account_status?: Database["public"]["Enums"]["account_status"]
          role?: Database["public"]["Enums"]["staff_role"]
          created_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          account_status?: Database["public"]["Enums"]["account_status"]
          role?: Database["public"]["Enums"]["staff_role"]
          created_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      curriculum_topics: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          sort_order: number
          workflow_status: Database["public"]["Enums"]["content_workflow_status"]
          // Lý do trả sửa (G1, migration 20260925000000) — chưa có nếu migration chưa chạy.
          review_note: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          sort_order?: number
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
          review_note?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          sort_order?: number
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
          review_note?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      historical_figures: {
        Row: {
          id: string
          name: string
          slug: string
          other_names: string | null
          birth_year: number | null
          death_year: number | null
          biography: string | null
          portrait_url: string | null
          workflow_status: Database["public"]["Enums"]["content_workflow_status"]
          // Lý do trả sửa (G1, migration 20260925000000) — chưa có nếu migration chưa chạy.
          review_note: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          other_names?: string | null
          birth_year?: number | null
          death_year?: number | null
          biography?: string | null
          portrait_url?: string | null
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
          review_note?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          other_names?: string | null
          birth_year?: number | null
          death_year?: number | null
          biography?: string | null
          portrait_url?: string | null
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
          review_note?: string | null
        }
        Relationships: []
      }
      historical_locations: {
        Row: {
          id: string
          name: string
          historical_name: string | null
          slug: string
          description: string | null
          latitude: number | null
          longitude: number | null
          // "exact" | "approximate" | "region" | "unknown" — CHECK constraint,
          // không phải Postgres enum nên CLI sinh ra kiểu string thuần.
          accuracy_level: string
          accuracy_note: string | null
          workflow_status: Database["public"]["Enums"]["content_workflow_status"]
          // Lý do trả sửa (G1, migration 20260925000000) — chưa có nếu migration chưa chạy.
          review_note: string | null
          // Cột generated (geography(Point,4326)) — chỉ đọc, không insert/update.
          geom: unknown | null
        }
        Insert: {
          id?: string
          name: string
          historical_name?: string | null
          slug: string
          description?: string | null
          latitude?: number | null
          longitude?: number | null
          accuracy_level?: string
          accuracy_note?: string | null
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
          review_note?: string | null
        }
        Update: {
          id?: string
          name?: string
          historical_name?: string | null
          slug?: string
          description?: string | null
          latitude?: number | null
          longitude?: number | null
          accuracy_level?: string
          accuracy_note?: string | null
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
          review_note?: string | null
        }
        Relationships: []
      }
      sources: {
        Row: {
          id: string
          title: string
          author_org: string | null
          publisher: string | null
          published_year: number | null
          url: string | null
          // "book" | "article" | "official" | "web" | "archive" | "other" — CHECK constraint.
          source_type: string
          citation: string
          accessed_at: string | null
        }
        Insert: {
          id?: string
          title: string
          author_org?: string | null
          publisher?: string | null
          published_year?: number | null
          url?: string | null
          source_type: string
          citation: string
          accessed_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          author_org?: string | null
          publisher?: string | null
          published_year?: number | null
          url?: string | null
          source_type?: string
          citation?: string
          accessed_at?: string | null
        }
        Relationships: []
      }
      historical_events: {
        Row: {
          id: string
          topic_id: string
          title: string
          slug: string
          start_year: number
          end_year: number | null
          start_date: string | null
          end_date: string | null
          date_text: string
          // "exact" | "year" | "period" | "approximate" | "disputed" — CHECK constraint.
          date_precision: string
          summary: string
          content: string | null
          is_featured: boolean | null
          workflow_status: Database["public"]["Enums"]["content_workflow_status"]
          // Lý do trả sửa (G1, migration 20260925000000) — chưa có nếu migration chưa chạy.
          review_note: string | null
          created_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          topic_id: string
          title: string
          slug: string
          start_year: number
          end_year?: number | null
          start_date?: string | null
          end_date?: string | null
          date_text: string
          date_precision: string
          summary: string
          content?: string | null
          is_featured?: boolean | null
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
          review_note?: string | null
          created_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          topic_id?: string
          title?: string
          slug?: string
          start_year?: number
          end_year?: number | null
          start_date?: string | null
          end_date?: string | null
          date_text?: string
          date_precision?: string
          summary?: string
          content?: string | null
          is_featured?: boolean | null
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
          review_note?: string | null
          created_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "historical_events_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "curriculum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      event_figures: {
        Row: {
          event_id: string
          figure_id: string
          relationship: string | null
          sort_order: number | null
        }
        Insert: {
          event_id: string
          figure_id: string
          relationship?: string | null
          sort_order?: number | null
        }
        Update: {
          event_id?: string
          figure_id?: string
          relationship?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_figures_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "historical_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_figures_figure_id_fkey"
            columns: ["figure_id"]
            isOneToOne: false
            referencedRelation: "historical_figures"
            referencedColumns: ["id"]
          },
        ]
      }
      event_locations: {
        Row: {
          event_id: string
          location_id: string
          location_role: string | null
          is_primary: boolean | null
        }
        Insert: {
          event_id: string
          location_id: string
          location_role?: string | null
          is_primary?: boolean | null
        }
        Update: {
          event_id?: string
          location_id?: string
          location_role?: string | null
          is_primary?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "event_locations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "historical_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "historical_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sources: {
        Row: {
          event_id: string
          source_id: string
          source_note: string | null
          confidence_note: string | null
        }
        Insert: {
          event_id: string
          source_id: string
          source_note?: string | null
          confidence_note?: string | null
        }
        Update: {
          event_id?: string
          source_id?: string
          source_note?: string | null
          confidence_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_sources_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "historical_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          id: string
          event_id: string
          file_url: string
          // "image" | "document" — CHECK constraint.
          media_type: string
          caption: string | null
          alt_text: string | null
          source_id: string | null
          sort_order: number | null
        }
        Insert: {
          id?: string
          event_id: string
          file_url: string
          media_type: string
          caption?: string | null
          alt_text?: string | null
          source_id?: string | null
          sort_order?: number | null
        }
        Update: {
          id?: string
          event_id?: string
          file_url?: string
          media_type?: string
          caption?: string | null
          alt_text?: string | null
          source_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "historical_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_staff_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["staff_role"]
      }
      find_published_locations_within_radius: {
        Args: {
          center_lat: number
          center_lng: number
          radius_m: number
        }
        Returns: {
          id: string
          name: string
          slug: string
          latitude: number
          longitude: number
          accuracy_level: string
          distance_m: number
        }[]
      }
    }
    Enums: {
      account_status: "active" | "locked"
      content_workflow_status:
        | "draft"
        | "pending_review"
        | "needs_revision"
        | "published"
        | "hidden"
      staff_role: "editor" | "reviewer" | "system_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
