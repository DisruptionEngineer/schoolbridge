-- SchoolBridge: Initial database schema
-- Multi-tenant with Row Level Security (RLS)

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE tenant_plan AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE event_status AS ENUM ('pending', 'approved', 'edited', 'skipped', 'synced', 'failed');
CREATE TYPE event_category AS ENUM ('dismissal', 'closure', 'special', 'admin', 'general');
CREATE TYPE connector_type AS ENUM ('caldav', 'home_assistant', 'immich', 'discord');
CREATE TYPE photo_status AS ENUM ('pending', 'downloaded', 'uploaded', 'failed');
CREATE TYPE sync_action AS ENUM ('created', 'updated', 'skipped', 'failed');

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Extract current tenant_id from the JWT app_metadata
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Auto-set updated_at on row changes
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE public.tenants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  plan        tenant_plan NOT NULL DEFAULT 'free',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tenant_memberships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        member_role NOT NULL DEFAULT 'member',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

CREATE TABLE public.classdojo_sources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_cookie  text NOT NULL,  -- encrypted via Supabase Vault in production
  student_ids     jsonb NOT NULL DEFAULT '[]',
  last_polled_at  timestamptz,
  enabled         boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sync_connections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connector_type  connector_type NOT NULL,
  display_name    text NOT NULL,
  config          jsonb NOT NULL DEFAULT '{}',  -- connector-specific config
  enabled         boolean NOT NULL DEFAULT true,
  last_synced_at  timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sync_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_post_id  text NOT NULL,
  title           text NOT NULL,
  description     text,
  iso_date        text,
  raw_date_text   text NOT NULL,
  is_all_day      boolean NOT NULL DEFAULT true,
  category        event_category NOT NULL DEFAULT 'general',
  status          event_status NOT NULL DEFAULT 'pending',
  event_hash      text NOT NULL,
  raw_body        text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, event_hash)
);

CREATE TABLE public.processed_posts (
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  post_id       text NOT NULL,
  processed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, post_id)
);

CREATE TABLE public.photo_downloads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_post_id  text NOT NULL,
  classdojo_url   text NOT NULL,
  immich_asset_id text,
  album_name      text NOT NULL,
  status          photo_status NOT NULL DEFAULT 'pending',
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sync_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connection_id   uuid REFERENCES sync_connections(id) ON DELETE SET NULL,
  event_id        uuid REFERENCES sync_events(id) ON DELETE SET NULL,
  action          sync_action NOT NULL,
  details         jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES (critical for RLS performance)
-- ============================================================

CREATE INDEX idx_memberships_tenant ON tenant_memberships(tenant_id);
CREATE INDEX idx_memberships_user ON tenant_memberships(user_id);
CREATE INDEX idx_sources_tenant ON classdojo_sources(tenant_id);
CREATE INDEX idx_connections_tenant ON sync_connections(tenant_id);
CREATE INDEX idx_events_tenant ON sync_events(tenant_id);
CREATE INDEX idx_events_status ON sync_events(tenant_id, status);
CREATE INDEX idx_events_hash ON sync_events(tenant_id, event_hash);
CREATE INDEX idx_posts_tenant ON processed_posts(tenant_id);
CREATE INDEX idx_photos_tenant ON photo_downloads(tenant_id);
CREATE INDEX idx_photos_status ON photo_downloads(tenant_id, status);
CREATE INDEX idx_logs_tenant ON sync_logs(tenant_id);
CREATE INDEX idx_logs_connection ON sync_logs(connection_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE classdojo_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Tenants: users can see tenants they belong to
CREATE POLICY "tenant_access" ON tenants FOR ALL
  USING (id = current_tenant_id());

-- Memberships: users see memberships in their tenant
CREATE POLICY "membership_access" ON tenant_memberships FOR ALL
  USING (tenant_id = current_tenant_id());

-- All tenant-scoped tables use the same RLS pattern
CREATE POLICY "source_access" ON classdojo_sources FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "connection_access" ON sync_connections FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "event_access" ON sync_events FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "post_access" ON processed_posts FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "photo_access" ON photo_downloads FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "log_access" ON sync_logs FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER set_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_sources_updated_at
  BEFORE UPDATE ON classdojo_sources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_connections_updated_at
  BEFORE UPDATE ON sync_connections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON sync_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_photos_updated_at
  BEFORE UPDATE ON photo_downloads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
