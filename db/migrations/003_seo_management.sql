-- NUSAIFA SPICES SEO Management
-- Adds bilingual SEO metadata to products.
-- Existing product data remains unchanged.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS seo_title_en TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_title_bn TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_description_en TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_description_bn TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS focus_keywords TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_alt_en TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_alt_bn TEXT NOT NULL DEFAULT '';
