/** Core domain types for SchoolBridge */

export type TenantPlan = "free" | "pro" | "enterprise";
export type MemberRole = "owner" | "admin" | "member";

export type EventStatus =
  | "pending"
  | "approved"
  | "edited"
  | "skipped"
  | "synced"
  | "failed";

export type EventCategory =
  | "dismissal"
  | "closure"
  | "special"
  | "admin"
  | "general";

export type ConnectorType = "caldav" | "home_assistant" | "immich" | "discord";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  created_at: string;
}

export interface TenantMembership {
  id: string;
  tenant_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
}

export interface ClassDojoSource {
  id: string;
  tenant_id: string;
  session_cookie: string;
  student_ids: string[];
  last_polled_at: string | null;
  enabled: boolean;
  created_at: string;
}

export interface SyncConnection {
  id: string;
  tenant_id: string;
  connector_type: ConnectorType;
  display_name: string;
  config: Record<string, unknown>;
  enabled: boolean;
  last_synced_at: string | null;
  created_at: string;
}

export interface SyncEvent {
  id: string;
  tenant_id: string;
  source_post_id: string;
  title: string;
  description: string | null;
  iso_date: string | null;
  raw_date_text: string;
  is_all_day: boolean;
  category: EventCategory;
  status: EventStatus;
  event_hash: string;
  raw_body: string;
  created_at: string;
  updated_at: string;
}

export interface PhotoDownload {
  id: string;
  tenant_id: string;
  source_post_id: string;
  classdojo_url: string;
  immich_asset_id: string | null;
  album_name: string;
  status: "pending" | "downloaded" | "uploaded" | "failed";
  error: string | null;
  created_at: string;
}

export interface SyncLog {
  id: string;
  tenant_id: string;
  connection_id: string;
  event_id: string | null;
  action: "created" | "updated" | "skipped" | "failed";
  details: Record<string, unknown>;
  created_at: string;
}

export interface ProcessedPost {
  tenant_id: string;
  post_id: string;
  processed_at: string;
}

/** NLP extraction result from the Python microservice */
export interface NLPExtractionResult {
  events: Array<{
    title: string;
    raw_date_text: string;
    iso_date: string | null;
    is_all_day: boolean;
    category: EventCategory;
  }>;
  photos: Array<{
    url: string;
    timestamp: string | null;
  }>;
}

/** ClassDojo feed item shape (from unofficial API) */
export interface ClassDojoPost {
  _id: string;
  time: number;
  body?: string;
  contents?: {
    attachments?: Array<{
      path: string;
      type?: string;
    }>;
  };
}

export interface ClassDojoFeedResponse {
  _items: ClassDojoPost[];
  _links?: {
    next?: { href: string };
  };
}
