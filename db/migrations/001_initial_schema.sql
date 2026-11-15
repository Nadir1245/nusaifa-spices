-- ============================================================================
-- NUSAIFA SPICES - PostgreSQL Initial Schema Migration (001)
-- Optimized for high transaction volume e-commerce workloads
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users & Role-Based Access Control
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(24) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  district VARCHAR(100),
  upazila VARCHAR(100),
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);
CREATE INDEX IF NOT EXISTS idx_users_role_created ON users (role, created_at DESC);

-- 2. Product Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name_en VARCHAR(120) NOT NULL,
  name_bn VARCHAR(160) NOT NULL,
  description_en TEXT NOT NULL DEFAULT '',
  description_bn TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_active_sort ON categories (is_active, sort_order);

-- 3. Products Catalog
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  sku VARCHAR(64) NOT NULL UNIQUE,
  slug VARCHAR(160) NOT NULL UNIQUE,
  name_en VARCHAR(200) NOT NULL,
  name_bn VARCHAR(240) NOT NULL,
  short_desc_en VARCHAR(320) NOT NULL DEFAULT '',
  short_desc_bn VARCHAR(360) NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  description_bn TEXT NOT NULL DEFAULT '',
  origin_en VARCHAR(160) NOT NULL DEFAULT 'Bangladesh',
  origin_bn VARCHAR(160) NOT NULL DEFAULT 'বাংলাদেশ',
  weight_label VARCHAR(60) NOT NULL DEFAULT '250g',
  price_bdt NUMERIC(12, 2) NOT NULL CHECK (price_bdt >= 0),
  discount_price_bdt NUMERIC(12, 2) CHECK (discount_price_bdt IS NULL OR discount_price_bdt >= 0),
  stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  image_url TEXT NOT NULL,
  gallery_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category_active ON products (category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured_active ON products (is_featured, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC);

-- 4. Delivery Charge Zones (Bangladesh Districts & Upazilas)
CREATE TABLE IF NOT EXISTS delivery_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  inside_dhaka_bdt NUMERIC(10, 2) NOT NULL DEFAULT 60.00,
  sub_dhaka_bdt NUMERIC(10, 2) NOT NULL DEFAULT 90.00,
  outside_dhaka_bdt NUMERIC(10, 2) NOT NULL DEFAULT 130.00,
  free_delivery_threshold_bdt NUMERIC(12, 2) NOT NULL DEFAULT 2000.00,
  cod_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  bkash_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  nagad_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Orders (High-Volume Transactional Table)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(32) NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name VARCHAR(160) NOT NULL,
  customer_phone VARCHAR(24) NOT NULL,
  customer_email VARCHAR(190),
  district VARCHAR(100) NOT NULL,
  upazila VARCHAR(100) NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_zone VARCHAR(32) NOT NULL CHECK (delivery_zone IN ('inside_dhaka', 'sub_dhaka', 'outside_dhaka')),
  payment_method VARCHAR(24) NOT NULL CHECK (payment_method IN ('cod', 'bkash', 'nagad')),
  payment_status VARCHAR(24) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending_gateway', 'paid', 'refunded')),
  order_status VARCHAR(24) NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  subtotal_bdt NUMERIC(12, 2) NOT NULL CHECK (subtotal_bdt >= 0),
  delivery_charge_bdt NUMERIC(10, 2) NOT NULL CHECK (delivery_charge_bdt >= 0),
  discount_bdt NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_bdt >= 0),
  total_bdt NUMERIC(12, 2) NOT NULL CHECK (total_bdt >= 0),
  customer_note TEXT NOT NULL DEFAULT '',
  admin_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders (customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (order_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

-- 6. Order Line Items (Immutable price snapshot at purchase time)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name_en VARCHAR(200) NOT NULL,
  product_name_bn VARCHAR(240) NOT NULL,
  sku VARCHAR(64) NOT NULL,
  weight_label VARCHAR(60) NOT NULL,
  unit_price_bdt NUMERIC(12, 2) NOT NULL CHECK (unit_price_bdt >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total_bdt NUMERIC(12, 2) NOT NULL CHECK (line_total_bdt >= 0),
  image_url TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);

-- 7. Order Status Notification & Audit Log
CREATE TABLE IF NOT EXISTS order_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(24) NOT NULL,
  message_en TEXT NOT NULL,
  message_bn TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_notifications_order ON order_notifications (order_id, created_at DESC);

-- 8. Promotional Banners
CREATE TABLE IF NOT EXISTS promotional_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en VARCHAR(200) NOT NULL,
  title_bn VARCHAR(240) NOT NULL,
  subtitle_en VARCHAR(320) NOT NULL DEFAULT '',
  subtitle_bn VARCHAR(360) NOT NULL DEFAULT '',
  cta_label_en VARCHAR(80) NOT NULL DEFAULT 'Explore Collection',
  cta_label_bn VARCHAR(100) NOT NULL DEFAULT 'সংগ্রহ দেখুন',
  target_category_slug VARCHAR(100) NOT NULL DEFAULT 'all',
  image_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Website CMS Content (Bilingual Brand Copy & Policies)
CREATE TABLE IF NOT EXISTS site_content (
  key VARCHAR(80) PRIMARY KEY,
  value_en TEXT NOT NULL,
  value_bn TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Contact Messages
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(24) NOT NULL,
  email VARCHAR(190) NOT NULL DEFAULT '',
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
