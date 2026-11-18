-- NUSAIFA SPICES Plugin Center
-- No secrets or API credentials are stored in these tables.

CREATE TABLE IF NOT EXISTS plugin_integrations (
  plugin_key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('available', 'connected', 'disconnected', 'error', 'planned')),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plugin_activity_logs (
  id BIGSERIAL PRIMARY KEY,
  plugin_key TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plugin_activity_logs_plugin
  ON plugin_activity_logs (plugin_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_plugin_integrations_enabled
  ON plugin_integrations (enabled);
