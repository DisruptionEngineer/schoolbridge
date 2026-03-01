/**
 * Placeholder for Supabase-generated types.
 * Run `pnpm db:generate` after applying migrations to regenerate.
 */
export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          plan: "free" | "pro" | "enterprise";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          plan?: "free" | "pro" | "enterprise";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          plan?: "free" | "pro" | "enterprise";
        };
      };
      tenant_memberships: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          role: "owner" | "admin" | "member";
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          role?: "owner" | "admin" | "member";
        };
        Update: {
          role?: "owner" | "admin" | "member";
        };
      };
      classdojo_sources: {
        Row: {
          id: string;
          tenant_id: string;
          session_cookie: string;
          student_ids: string[];
          last_polled_at: string | null;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          session_cookie: string;
          student_ids?: string[];
          enabled?: boolean;
        };
        Update: {
          session_cookie?: string;
          student_ids?: string[];
          last_polled_at?: string;
          enabled?: boolean;
        };
      };
      sync_connections: {
        Row: {
          id: string;
          tenant_id: string;
          connector_type: "caldav" | "home_assistant" | "immich" | "discord";
          display_name: string;
          config: Record<string, unknown>;
          enabled: boolean;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          connector_type: "caldav" | "home_assistant" | "immich" | "discord";
          display_name: string;
          config: Record<string, unknown>;
          enabled?: boolean;
        };
        Update: {
          display_name?: string;
          config?: Record<string, unknown>;
          enabled?: boolean;
          last_synced_at?: string;
        };
      };
      sync_events: {
        Row: {
          id: string;
          tenant_id: string;
          source_post_id: string;
          title: string;
          description: string | null;
          iso_date: string | null;
          raw_date_text: string;
          is_all_day: boolean;
          category: "dismissal" | "closure" | "special" | "admin" | "general";
          status: "pending" | "approved" | "edited" | "skipped" | "synced" | "failed";
          event_hash: string;
          raw_body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          source_post_id: string;
          title: string;
          description?: string;
          iso_date?: string;
          raw_date_text: string;
          is_all_day?: boolean;
          category?: "dismissal" | "closure" | "special" | "admin" | "general";
          status?: "pending" | "approved" | "edited" | "skipped" | "synced" | "failed";
          event_hash: string;
          raw_body: string;
        };
        Update: {
          title?: string;
          description?: string;
          iso_date?: string;
          is_all_day?: boolean;
          status?: "pending" | "approved" | "edited" | "skipped" | "synced" | "failed";
        };
      };
      processed_posts: {
        Row: {
          tenant_id: string;
          post_id: string;
          processed_at: string;
        };
        Insert: {
          tenant_id: string;
          post_id: string;
          processed_at?: string;
        };
        Update: Record<string, never>;
      };
      photo_downloads: {
        Row: {
          id: string;
          tenant_id: string;
          source_post_id: string;
          classdojo_url: string;
          immich_asset_id: string | null;
          album_name: string;
          status: "pending" | "downloaded" | "uploaded" | "failed";
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          source_post_id: string;
          classdojo_url: string;
          album_name: string;
          status?: "pending" | "downloaded" | "uploaded" | "failed";
        };
        Update: {
          immich_asset_id?: string;
          status?: "pending" | "downloaded" | "uploaded" | "failed";
          error?: string;
        };
      };
      sync_logs: {
        Row: {
          id: string;
          tenant_id: string;
          connection_id: string | null;
          event_id: string | null;
          action: "created" | "updated" | "skipped" | "failed";
          details: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          connection_id?: string;
          event_id?: string;
          action: "created" | "updated" | "skipped" | "failed";
          details?: Record<string, unknown>;
        };
        Update: Record<string, never>;
      };
    };
  };
}
