-- NUSAIFA SPICES App Settings
-- Stores global application control settings.
-- Existing products, orders and customers remain unchanged.

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
  customer_registration_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  contact_form_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (
  id,
  maintenance_mode,
  customer_registration_enabled,
  contact_form_enabled
)
VALUES (1, FALSE, TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;
