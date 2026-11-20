-- NUSAIFA SPICES Website Content Colors
-- Adds separate English and Bengali text/background colors.
-- Existing website content remains unchanged.

ALTER TABLE site_content
  ADD COLUMN IF NOT EXISTS text_color_en VARCHAR(7) NOT NULL DEFAULT '#141A17',
  ADD COLUMN IF NOT EXISTS text_color_bn VARCHAR(7) NOT NULL DEFAULT '#141A17',
  ADD COLUMN IF NOT EXISTS background_color_en VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS background_color_bn VARCHAR(7) NOT NULL DEFAULT '#FFFFFF';
