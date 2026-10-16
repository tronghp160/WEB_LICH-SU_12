// Viết tay theo đúng SQL đã chạy (Phụ lục A, KE_HOACH_DU_AN.md) và theo đúng
// định dạng mà `supabase gen types typescript` tạo ra.
//
// ⚠ TẠM THỜI: file này KHÔNG do CLI sinh ra (chưa có access token Supabase).
// Khi có điều kiện, chạy lại lệnh dưới đây để thay thế bằng bản chính thức:
//   npx supabase gen types typescript --project-id ueolfjujjybutyuyfxha --schema public > lib/database.types.ts
//
// Phần thanh toán (products … exam_questions, donation_wall, mark_order_paid …, order_status, product_kind) lấy từ
// `npx supabase gen types typescript --db-url … --schema public` chạy trên DB thật sau migration 20261015000000_payments
// rồi định dạng lại cho khớp file này (bản CLI chưa định dạng).

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
      // Migration 20260930000000: CHỦ ĐỀ PHỤ của sự kiện (chủ đề chính vẫn là historical_events.topic_id).
      event_topics: {
        Row: {
          id: string
          event_id: string
          topic_id: string
        }
        Insert: {
          id?: string
          event_id: string
          topic_id: string
        }
        Update: {
          id?: string
          event_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_topics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "historical_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "curriculum_topics"
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
        // Migration 20260929000001: chủ ảnh là ĐÚNG MỘT trong event_id / figure_id / location_id.
        Row: {
          id: string
          event_id: string | null
          figure_id: string | null
          location_id: string | null
          file_url: string
          // "image" | "document" | "video" | "panorama" — CHECK constraint.
          media_type: string
          caption: string | null
          alt_text: string | null
          source_id: string | null
          sort_order: number | null
          // "historical" | "today" | "illustration" — CHECK constraint.
          era: string
          year_taken: number | null
          photographer: string | null
          license: string | null
          license_url: string | null
          source_page_url: string | null
          is_reenactment: boolean
          is_colorized: boolean
          is_cover: boolean
          focal_point: string | null
          pair_id: string | null
          width: number | null
          height: number | null
        }
        Insert: {
          id?: string
          event_id?: string | null
          figure_id?: string | null
          location_id?: string | null
          file_url: string
          media_type: string
          caption?: string | null
          alt_text?: string | null
          source_id?: string | null
          sort_order?: number | null
          era?: string
          year_taken?: number | null
          photographer?: string | null
          license?: string | null
          license_url?: string | null
          source_page_url?: string | null
          is_reenactment?: boolean
          is_colorized?: boolean
          is_cover?: boolean
          focal_point?: string | null
          pair_id?: string | null
          width?: number | null
          height?: number | null
        }
        Update: {
          id?: string
          event_id?: string | null
          figure_id?: string | null
          location_id?: string | null
          file_url?: string
          media_type?: string
          caption?: string | null
          alt_text?: string | null
          source_id?: string | null
          sort_order?: number | null
          era?: string
          year_taken?: number | null
          photographer?: string | null
          license?: string | null
          license_url?: string | null
          source_page_url?: string | null
          is_reenactment?: boolean
          is_colorized?: boolean
          is_cover?: boolean
          focal_point?: string | null
          pair_id?: string | null
          width?: number | null
          height?: number | null
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
            foreignKeyName: "media_assets_figure_id_fkey"
            columns: ["figure_id"]
            isOneToOne: false
            referencedRelation: "historical_figures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "historical_locations"
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
      quiz_questions: {
        Row: {
          id: string
          event_id: string
          question: string
          choices: string[]
          correct_index: number
          explanation: string
          media_id: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          question: string
          choices: string[]
          correct_index: number
          explanation: string
          media_id?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          question?: string
          choices?: string[]
          correct_index?: number
          explanation?: string
          media_id?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "historical_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      sgk_lesson_events: {
        Row: {
          id: string
          lesson_slug: string
          section_id: string
          event_id: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lesson_slug: string
          section_id: string
          event_id: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lesson_slug?: string
          section_id?: string
          event_id?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sgk_lesson_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "historical_events"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number | null
          id: string
          grants_product_id: string | null
          is_active: boolean
          kind: Database["public"]["Enums"]["product_kind"]
          max_devices: number
          max_vnd: number | null
          min_vnd: number | null
          name: string
          price_vnd: number | null
          slug: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days?: number | null
          id?: string
          grants_product_id?: string | null
          is_active?: boolean
          kind: Database["public"]["Enums"]["product_kind"]
          max_devices?: number
          max_vnd?: number | null
          min_vnd?: number | null
          name: string
          price_vnd?: number | null
          slug: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number | null
          id?: string
          grants_product_id?: string | null
          is_active?: boolean
          kind?: Database["public"]["Enums"]["product_kind"]
          max_devices?: number
          max_vnd?: number | null
          min_vnd?: number | null
          name?: string
          price_vnd?: number | null
          slug?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          access_token_hash: string
          amount_vnd: number
          buyer_email: string | null
          checkout_url: string | null
          client_ip_hash: string | null
          created_at: string
          display_name: string | null
          expires_at: string
          id: string
          message: string | null
          order_code: number
          paid_at: string | null
          product_id: string
          provider: string
          provider_ref: string | null
          show_on_wall: boolean
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          user_id: string | null
          wall_approved: boolean
        }
        Insert: {
          access_token_hash: string
          amount_vnd: number
          buyer_email?: string | null
          checkout_url?: string | null
          client_ip_hash?: string | null
          created_at?: string
          display_name?: string | null
          expires_at?: string
          id?: string
          message?: string | null
          order_code?: number
          paid_at?: string | null
          product_id: string
          provider: string
          provider_ref?: string | null
          show_on_wall?: boolean
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id?: string | null
          wall_approved?: boolean
        }
        Update: {
          access_token_hash?: string
          amount_vnd?: number
          buyer_email?: string | null
          checkout_url?: string | null
          client_ip_hash?: string | null
          created_at?: string
          display_name?: string | null
          expires_at?: string
          id?: string
          message?: string | null
          order_code?: number
          paid_at?: string | null
          product_id?: string
          provider?: string
          provider_ref?: string | null
          show_on_wall?: boolean
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id?: string | null
          wall_approved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          amount_vnd: number | null
          id: number
          note: string | null
          order_code: number | null
          payload: NonNullable<Json>
          provider: string
          provider_ref: string | null
          received_at: string
          signature_ok: boolean
          source: string
          status: string | null
        }
        Insert: {
          amount_vnd?: number | null
          id?: never
          note?: string | null
          order_code?: number | null
          payload?: NonNullable<Json>
          provider: string
          provider_ref?: string | null
          received_at?: string
          signature_ok: boolean
          source: string
          status?: string | null
        }
        Update: {
          amount_vnd?: number | null
          id?: never
          note?: string | null
          order_code?: number | null
          payload?: NonNullable<Json>
          provider?: string
          provider_ref?: string | null
          received_at?: string
          signature_ok?: boolean
          source?: string
          status?: string | null
        }
        Relationships: []
      }
      licenses: {
        Row: {
          code: string
          created_at: string
          id: string
          max_devices: number
          order_id: string
          product_id: string
          status: string
          user_id: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          max_devices: number
          order_id: string
          product_id: string
          status?: string
          user_id?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          max_devices?: number
          order_id?: string
          product_id?: string
          status?: string
          user_id?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licenses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      license_activations: {
        Row: {
          activated_at: string
          device_hash: string
          last_seen_at: string
          license_id: string
        }
        Insert: {
          activated_at?: string
          device_hash: string
          last_seen_at?: string
          license_id: string
        }
        Update: {
          activated_at?: string
          device_hash?: string
          last_seen_at?: string
          license_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "license_activations_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_sets: {
        Row: {
          created_at: string
          description: string | null
          difficulty: number | null
          duration_min: number
          format: string
          id: string
          product_id: string | null
          published_at: string | null
          review_note: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
          workflow_status: Database["public"]["Enums"]["content_workflow_status"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty?: number | null
          duration_min?: number
          format?: string
          id?: string
          product_id?: string | null
          published_at?: string | null
          review_note?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty?: number | null
          duration_min?: number
          format?: string
          id?: string
          product_id?: string | null
          published_at?: string | null
          review_note?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
        }
        Relationships: [
          {
            foreignKeyName: "exam_sets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      // Ngân hàng câu hỏi — migration 20261025000000_exam_bank.sql (viết tay theo đúng định dạng file này).
      exam_passages: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          lesson_slug: string | null
          review_note: string | null
          source_citation: string
          title: string
          updated_at: string
          workflow_status: Database["public"]["Enums"]["content_workflow_status"]
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_slug?: string | null
          review_note?: string | null
          source_citation: string
          title: string
          updated_at?: string
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_slug?: string | null
          review_note?: string | null
          source_citation?: string
          title?: string
          updated_at?: string
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
        }
        Relationships: []
      }
      exam_items: {
        Row: {
          choices: (string)[] | null
          competency: Database["public"]["Enums"]["exam_competency"]
          correct_index: number | null
          created_at: string
          created_by: string | null
          event_id: string | null
          explanation: string
          fingerprint: string
          grade: number
          id: string
          kind: Database["public"]["Enums"]["exam_item_kind"]
          legacy_question_id: string | null
          lesson_slug: string | null
          level: Database["public"]["Enums"]["exam_item_level"]
          passage_id: string | null
          review_note: string | null
          source_note: string
          statements: Json | null
          stem: string
          topic_tag: string | null
          updated_at: string
          workflow_status: Database["public"]["Enums"]["content_workflow_status"]
        }
        Insert: {
          choices?: (string)[] | null
          competency: Database["public"]["Enums"]["exam_competency"]
          correct_index?: number | null
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          explanation: string
          /** Trigger exam_item_integrity tự tính (ghi đè giá trị truyền vào) trước khi kiểm NOT NULL. */
          fingerprint?: string
          grade?: number
          id?: string
          kind: Database["public"]["Enums"]["exam_item_kind"]
          legacy_question_id?: string | null
          lesson_slug?: string | null
          level: Database["public"]["Enums"]["exam_item_level"]
          passage_id?: string | null
          review_note?: string | null
          source_note: string
          statements?: Json | null
          stem: string
          topic_tag?: string | null
          updated_at?: string
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
        }
        Update: {
          choices?: (string)[] | null
          competency?: Database["public"]["Enums"]["exam_competency"]
          correct_index?: number | null
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          explanation?: string
          fingerprint?: string
          grade?: number
          id?: string
          kind?: Database["public"]["Enums"]["exam_item_kind"]
          legacy_question_id?: string | null
          lesson_slug?: string | null
          level?: Database["public"]["Enums"]["exam_item_level"]
          passage_id?: string | null
          review_note?: string | null
          source_note?: string
          statements?: Json | null
          stem?: string
          topic_tag?: string | null
          updated_at?: string
          workflow_status?: Database["public"]["Enums"]["content_workflow_status"]
        }
        Relationships: [
          {
            foreignKeyName: "exam_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "historical_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_items_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "exam_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_set_items: {
        Row: {
          choice_shift: number
          created_at: string
          item_id: string
          position: number
          section: number
          set_id: string
        }
        Insert: {
          choice_shift?: number
          created_at?: string
          item_id: string
          position: number
          section: number
          set_id: string
        }
        Update: {
          choice_shift?: number
          created_at?: string
          item_id?: string
          position?: number
          section?: number
          set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_set_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "exam_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_set_items_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "exam_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          choices: (string)[]
          correct_index: number
          created_at: string
          event_id: string | null
          explanation: string
          id: string
          lesson_slug: string | null
          position: number
          question: string
          set_id: string
          source_note: string
          updated_at: string
        }
        Insert: {
          choices: (string)[]
          correct_index: number
          created_at?: string
          event_id?: string | null
          explanation: string
          id?: string
          lesson_slug?: string | null
          position: number
          question: string
          set_id: string
          source_note: string
          updated_at?: string
        }
        Update: {
          choices?: (string)[]
          correct_index?: number
          created_at?: string
          event_id?: string | null
          explanation?: string
          id?: string
          lesson_slug?: string | null
          position?: number
          question?: string
          set_id?: string
          source_note?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "historical_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "exam_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          answers: Json
          // Ma trận của lượt đề tự sinh (GĐ5, migration 20261028000000) — null với đề có sẵn / luyện tập.
          blueprint: string | null
          breakdown: Json | null
          choice_shifts: number[]
          created_at: string
          deadline_at: string | null
          device_hash: string | null
          id: string
          item_ids: string[]
          license_id: string | null
          max_score: number | null
          mode: Database["public"]["Enums"]["exam_attempt_mode"]
          raw_score: number | null
          score10: number | null
          sections: number[]
          set_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["exam_attempt_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string | null
        }
        // Chỉ ghi qua hàm SQL (service_role) — Insert / Update để trống có chủ ý.
        Insert: { [_ in never]: never }
        Update: { [_ in never]: never }
        Relationships: []
      }
      // Báo lỗi câu hỏi (GĐ7, migration 20261029000000_exam_quality.sql). Thêm chỉ qua report_exam_item; nhân sự đọc,
      // kiểm duyệt viên / quản trị viên đổi trạng thái.
      exam_item_reports: {
        Row: {
          id: string
          item_id: string
          attempt_id: string | null
          user_id: string | null
          device_hash: string | null
          reason: Database["public"]["Enums"]["exam_report_reason"]
          note: string | null
          status: string
          admin_note: string | null
          handled_by: string | null
          handled_at: string | null
          created_at: string
        }
        Insert: { [_ in never]: never }
        Update: { status?: string; admin_note?: string | null; handled_by?: string | null; handled_at?: string | null }
        Relationships: [
          {
            foreignKeyName: "exam_item_reports_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "exam_items"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_regrade_log: {
        Row: {
          id: number
          item_id: string
          attempt_id: string
          old_earned: number
          new_earned: number
          old_score10: number | null
          new_score10: number | null
          actor: string | null
          created_at: string
        }
        Insert: { [_ in never]: never }
        Update: { [_ in never]: never }
        Relationships: []
      }
      rate_limit_hits: {
        Row: {
          id: number
          bucket: string
          key_hash: string
          created_at: string
        }
        Insert: {
          id?: never
          bucket: string
          key_hash: string
          created_at?: string
        }
        Update: {
          id?: never
          bucket?: string
          key_hash?: string
          created_at?: string
        }
        Relationships: []
      }
      learner_profiles: {
        Row: {
          agreed_at: string
          avatar_url: string | null
          created_at: string
          display_name: string
          // Mục tiêu điểm và lộ trình ôn (GĐ5, migration 20261028000000).
          exam_goal: number | null
          id: string
          school: string | null
          study_plan: Json | null
          terms_version: string
          updated_at: string
        }
        Insert: {
          agreed_at?: string
          avatar_url?: string | null
          created_at?: string
          display_name: string
          exam_goal?: number | null
          id: string
          school?: string | null
          study_plan?: Json | null
          terms_version: string
          updated_at?: string
        }
        Update: {
          agreed_at?: string
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          exam_goal?: number | null
          id?: string
          school?: string | null
          study_plan?: Json | null
          terms_version?: string
          updated_at?: string
        }
        Relationships: []
      }
      learner_progress: {
        Row: {
          data: NonNullable<Json>
          updated_at: string
          user_id: string
        }
        Insert: {
          data: NonNullable<Json>
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: NonNullable<Json>
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      donation_wall: {
        Row: {
          display_name: string | null
          message: string | null
          paid_at: string | null
          tier: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      mark_order_paid: {
        Args: {
          p_order_code: number
          p_amount: number
          p_provider: string
          p_provider_ref: string
          p_license_code: string
        }
        Returns: Json
      }
      admin_resolve_late_payment: {
        Args: {
          p_order_code: number
          p_staff_id: string
          p_note: string
          p_license_code: string
        }
        Returns: Json
      }
      activate_license: {
        Args: { p_code: string; p_device_hash: string }
        Returns: Json
      }
      get_exam_set: {
        Args: { p_slug: string; p_code: string; p_device_hash: string; p_user_id?: string | null }
        Returns: Json
      }
      // Lượt làm bài — migration 20261026000000_exam_attempts.sql (viết tay).
      get_exam_intro: {
        Args: { p_slug: string; p_code: string; p_device_hash: string; p_user_id?: string | null }
        Returns: Json
      }
      start_exam_attempt: {
        Args: { p_slug: string; p_code: string; p_device_hash: string; p_user_id?: string | null; p_mode?: string }
        Returns: Json
      }
      save_attempt_answers: {
        Args: { p_attempt_id: string; p_user_id?: string | null; p_device_hash: string; p_answers: Json }
        Returns: Json
      }
      submit_exam_attempt: {
        Args: { p_attempt_id: string; p_user_id?: string | null; p_device_hash: string; p_answers: Json }
        Returns: Json
      }
      get_attempt_result: {
        Args: { p_attempt_id: string; p_user_id?: string | null; p_device_hash: string }
        Returns: Json
      }
      // Luyện tập, sổ câu sai — migration 20261027000000_exam_practice.sql (viết tay).
      start_practice_attempt: {
        Args: { p_user_id?: string | null; p_code: string; p_device_hash: string; p_options: Json }
        Returns: Json
      }
      check_attempt_item: {
        Args: { p_attempt_id: string; p_user_id?: string | null; p_device_hash: string; p_item_id: string; p_answer: Json }
        Returns: Json
      }
      get_notebook: {
        Args: { p_user_id: string }
        Returns: Json
      }
      // Bản in đề — migration 20261030000000_exam_paper.sql (viết tay).
      start_paper_attempt: {
        Args: { p_slug: string; p_code: string; p_device_hash: string; p_user_id?: string | null }
        Returns: Json
      }
      // Chất lượng câu hỏi — migration 20261029000000_exam_quality.sql (viết tay).
      report_exam_item: {
        Args: { p_user_id?: string | null; p_device_hash: string; p_attempt_id: string; p_item_id: string; p_reason: string; p_note: string }
        Returns: Json
      }
      regrade_item: {
        Args: { p_item_id: string; p_actor: string }
        Returns: Json
      }
      exam_item_stats: {
        Args: { p_item_ids: string[] }
        Returns: Json
      }
      exam_admin_overview: {
        Args: { p_days: number }
        Returns: Json
      }
      // Đề tự sinh theo ma trận — migration 20261028000000_exam_generated.sql (viết tay).
      get_generated_intro: {
        Args: { p_user_id?: string | null; p_code: string; p_device_hash: string; p_blueprint: string }
        Returns: Json
      }
      start_generated_attempt: {
        Args: {
          p_user_id?: string | null
          p_code: string
          p_device_hash: string
          p_blueprint: string
          p_item_ids: string[]
          p_sections: number[]
          p_shifts: number[]
          p_duration_min: number
        }
        Returns: Json
      }
      claim_license: {
        Args: { p_code: string; p_user_id: string }
        Returns: Json
      }
      find_auth_user_by_email: {
        Args: { p_email: string }
        Returns: string | null
      }
      expire_stale_orders: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      consume_rate_limit: {
        Args: { p_bucket: string; p_key_hash: string; p_window_seconds: number; p_max: number }
        Returns: boolean
      }
      media_owner_status: {
        Args: { p_event: string | null; p_figure: string | null; p_location: string | null }
        Returns: string | null
      }
      source_locked_for_editor: {
        Args: { p_source: string }
        Returns: boolean
      }
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
      exam_attempt_mode: "exam" | "practice" | "review" | "paper"
      exam_attempt_status: "in_progress" | "submitted" | "abandoned"
      exam_competency: "tim_hieu_lich_su" | "nhan_thuc_tu_duy" | "van_dung_kien_thuc"
      exam_item_kind: "mcq" | "true_false"
      exam_item_level: "nhan_biet" | "thong_hieu" | "van_dung"
      exam_report_reason: "sai_dap_an" | "loi_chinh_ta" | "khong_ro_nghia" | "sai_kien_thuc" | "khac"
      content_workflow_status:
        | "draft"
        | "pending_review"
        | "needs_revision"
        | "published"
        | "hidden"
      order_status: "pending" | "paid" | "cancelled" | "expired" | "refunded"
      product_kind: "exam_pack" | "donation"
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
