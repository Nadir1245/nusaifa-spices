import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';
import type {
  Category,
  ContactMessage,
  CustomerSummary,
  DashboardMetrics,
  DeliverySettings,
  Order,
  OrderItem,
  OrderNotification,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
  PromotionalBanner,
  SiteContentItem,
  UserPublic,
  UserRole,
} from '../shared/types.ts';
import { resolveDeliveryZone } from '../shared/bangladeshLocations.ts';
import { hashPassword } from './auth.ts';
import {
  INITIAL_BANNERS,
  INITIAL_CATEGORIES,
  INITIAL_DELIVERY_SETTINGS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_SITE_CONTENT,
} from './seedData.ts';

export interface UserRecord extends UserPublic {
  passwordHash: string;
}

export interface PluginIntegrationRecord {
  pluginKey: string;
  enabled: boolean;
  status: 'available' | 'connected' | 'disconnected' | 'error' | 'planned';
  settings: Record<string, unknown>;
  lastError: string;
  createdAt: string;
  updatedAt: string;
}

export interface PluginActivityLogRecord {
  id: number;
  pluginKey: string;
  action: string;
  details: Record<string, unknown>;
  actorUserId: string | null;
  createdAt: string;
}

export interface DatabaseSnapshot {
  version: number;
  exportedAt: string;
  users: UserRecord[];
  categories: Category[];
  products: Product[];
  deliverySettings: DeliverySettings;
  orders: Order[];
  banners: PromotionalBanner[];
  siteContent: SiteContentItem[];
  contactMessages: ContactMessage[];
  pluginIntegrations?: PluginIntegrationRecord[];
  pluginActivityLogs?: PluginActivityLogRecord[];
}

export interface CreateOrderInput {
  userId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  district: string;
  upazila: string;
  deliveryAddress: string;
  paymentMethod: PaymentMethod;
  customerNote: string;
  items: Array<{ productId: string; quantity: number }>;
}

const STATUS_MESSAGES: Record<OrderStatus, { en: string; bn: string }> = {
  pending: {
    en: 'Order received and awaiting confirmation.',
    bn: 'অর্ডার গ্রহণ করা হয়েছে এবং নিশ্চিতকরণের অপেক্ষায় রয়েছে।',
  },
  confirmed: {
    en: 'Order confirmed and scheduled for packing.',
    bn: 'অর্ডার নিশ্চিত করা হয়েছে এবং প্যাকিংয়ের জন্য প্রস্তুত হচ্ছে।',
  },
  processing: {
    en: 'Freshly packed and undergoing quality check.',
    bn: 'পণ্য প্যাক করা হয়েছে এবং মান যাচাই চলছে।',
  },
  shipped: {
    en: 'Handed over to delivery courier for dispatch.',
    bn: 'ডেলিভারির জন্য কুরিয়ারে হস্তান্তর করা হয়েছে।',
  },
  delivered: {
    en: 'Delivered successfully. Thank you for choosing NUSAIFA SPICES.',
    bn: 'সফলভাবে ডেলিভারি সম্পন্ন হয়েছে। নুসাইফা স্পাইসেস-এর সাথে থাকার জন্য ধন্যবাদ।',
  },
  cancelled: {
    en: 'Order has been cancelled.',
    bn: 'অর্ডারটি বাতিল করা হয়েছে।',
  },
};

function toPublicUser(u: UserRecord): UserPublic {
  const { passwordHash: _ignored, ...pub } = u;
  return pub;
}

function generateOrderNumber(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const rand = crypto.randomInt(1000, 9999);
  return `NS-${yy}${mm}${rand}`;
}

function computeDeliveryCharge(
  subtotal: number,
  district: string,
  upazila: string,
  settings: DeliverySettings
): { deliveryZone: Order['deliveryZone']; deliveryChargeBdt: number } {
  const deliveryZone = resolveDeliveryZone(district, upazila);
  if (settings.freeDeliveryThresholdBdt > 0 && subtotal >= settings.freeDeliveryThresholdBdt) {
    return { deliveryZone, deliveryChargeBdt: 0 };
  }
  const deliveryChargeBdt =
    deliveryZone === 'inside_dhaka'
      ? settings.insideDhakaBdt
      : deliveryZone === 'sub_dhaka'
        ? settings.subDhakaBdt
        : settings.outsideDhakaBdt;
  return { deliveryZone, deliveryChargeBdt };
}

class StorageEngine {
  private pgPool: Pool | null = null;
  private dataFilePath: string;
  private writeQueue: Promise<void> = Promise.resolve();
  private state: DatabaseSnapshot | null = null;
  private initialized = false;

  constructor() {
    this.dataFilePath = path.resolve(process.cwd(), 'data', 'nusaifa-db.json');
    const hasPgUrl = Boolean(process.env.DATABASE_URL);
    const hasPgHost = Boolean(process.env.PGHOST && process.env.PGPASSWORD);
    if (hasPgUrl || hasPgHost) {
      this.pgPool = process.env.DATABASE_URL
        ? new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
            max: 20,
          })
        : new Pool({
            host: process.env.PGHOST,
            port: Number(process.env.PGPORT || 5432),
            database: process.env.PGDATABASE || 'nusaifa_spices',
            user: process.env.PGUSER || 'nusaifa_user',
            password: process.env.PGPASSWORD,
            ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
            max: 20,
          });
      this.pgPool.on('error', (err) => {
        console.error('PostgreSQL pool error:', err);
      });
    }
  }

  public isPostgresActive(): boolean {
    return this.pgPool !== null;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    if (this.pgPool) {
      await this.initPostgresSeed();
      this.initialized = true;
      return;
    }

    await fs.mkdir(path.dirname(this.dataFilePath), { recursive: true });
    try {
      const raw = await fs.readFile(this.dataFilePath, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseSnapshot;
      this.state = {
        ...parsed,
        pluginIntegrations: Array.isArray(parsed.pluginIntegrations)
          ? parsed.pluginIntegrations
          : [],
        pluginActivityLogs: Array.isArray(parsed.pluginActivityLogs)
          ? parsed.pluginActivityLogs
          : [],
      };
    } catch {
      const adminEmail = (process.env.ADMIN_EMAIL || 'admin@nusaifaspices.com').toLowerCase();
      const adminPass = process.env.ADMIN_PASSWORD;
      if (!adminPass) throw new Error('ADMIN_PASSWORD must be set before creating the administrator.');
      const adminHash = await hashPassword(adminPass);
      const demoCustomerHash = await hashPassword('Customer@2026');
      const now = new Date().toISOString();

      this.state = {
        version: 1,
        exportedAt: now,
        users: [
          {
            id: 'usr-admin-1',
            fullName: process.env.ADMIN_NAME || 'Nusaifa Administrator',
            email: adminEmail,
            phone: process.env.ADMIN_PHONE || '01700000000',
            passwordHash: adminHash,
            role: 'admin',
            district: 'Dhaka',
            upazila: 'Dhanmondi',
            address: 'House 24, Road 7, Dhanmondi, Dhaka',
            isActive: true,
            createdAt: now,
          },
          {
            id: 'usr-cust-demo',
            fullName: 'Amina Sultana',
            email: 'amina@example.com',
            phone: '01712345678',
            passwordHash: demoCustomerHash,
            role: 'customer',
            district: 'Dhaka',
            upazila: 'Uttara',
            address: 'Sector 7, Road 12, House 8, Uttara, Dhaka',
            isActive: true,
            createdAt: now,
          },
        ],
        categories: structuredClone(INITIAL_CATEGORIES),
        products: structuredClone(INITIAL_PRODUCTS),
        deliverySettings: structuredClone(INITIAL_DELIVERY_SETTINGS),
        orders: structuredClone(INITIAL_ORDERS),
        banners: structuredClone(INITIAL_BANNERS),
        siteContent: structuredClone(INITIAL_SITE_CONTENT),
        contactMessages: [],
        pluginIntegrations: [],
        pluginActivityLogs: [],
      };
      await this.persistFileState();
    }
    this.initialized = true;
  }

  private async initPostgresSeed(): Promise<void> {
    if (!this.pgPool) return;
    const migrationSqlPath = path.resolve(process.cwd(), 'db/migrations/001_initial_schema.sql');
    try {
      const sql = await fs.readFile(migrationSqlPath, 'utf-8');
      await this.pgPool.query(sql);
    } catch (err) {
      console.error('Could not run initial migration automatically:', err);
    }

    const { rows: adminRows } = await this.pgPool.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );
    if (adminRows.length === 0) {
      const adminEmail = (process.env.ADMIN_EMAIL || 'admin@nusaifaspices.com').toLowerCase();
      const adminPass = process.env.ADMIN_PASSWORD;
      if (!adminPass) throw new Error('ADMIN_PASSWORD must be set before creating the administrator.');
      const adminHash = await hashPassword(adminPass);
      await this.pgPool.query(
        `INSERT INTO users (full_name, email, phone, password_hash, role, district, upazila, address)
         VALUES ($1, $2, $3, $4, 'admin', 'Dhaka', 'Dhanmondi', 'Dhanmondi, Dhaka')
         ON CONFLICT (email) DO NOTHING`,
        [
          process.env.ADMIN_NAME || 'Nusaifa Administrator',
          adminEmail,
          process.env.ADMIN_PHONE || '01700000000',
          adminHash,
        ]
      );
    }

    const { rows: catCount } = await this.pgPool.query('SELECT COUNT(*)::int AS cnt FROM categories');
    if ((catCount[0]?.cnt ?? 0) === 0) {
      const catIdMap = new Map<string, string>();
      for (const c of INITIAL_CATEGORIES) {
        const res = await this.pgPool.query(
          `INSERT INTO categories (slug, name_en, name_bn, description_en, description_bn, sort_order, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [c.slug, c.nameEn, c.nameBn, c.descriptionEn, c.descriptionBn, c.sortOrder, c.isActive]
        );
        catIdMap.set(c.id, res.rows[0].id);
      }
      for (const p of INITIAL_PRODUCTS) {
        const dbCatId = catIdMap.get(p.categoryId);
        if (!dbCatId) continue;
        await this.pgPool.query(
          `INSERT INTO products (
            category_id, sku, slug, name_en, name_bn, short_desc_en, short_desc_bn,
            description_en, description_bn, origin_en, origin_bn, weight_label,
            price_bdt, discount_price_bdt, stock_qty, image_url, gallery_urls, is_featured, is_active
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19)`,
          [
            dbCatId,
            p.sku,
            p.slug,
            p.nameEn,
            p.nameBn,
            p.shortDescEn,
            p.shortDescBn,
            p.descriptionEn,
            p.descriptionBn,
            p.originEn,
            p.originBn,
            p.weightLabel,
            p.priceBdt,
            p.discountPriceBdt,
            p.stockQty,
            p.imageUrl,
            JSON.stringify(p.galleryUrls),
            p.isFeatured,
            p.isActive,
          ]
        );
      }
      await this.pgPool.query(
        `INSERT INTO delivery_settings (id, inside_dhaka_bdt, sub_dhaka_bdt, outside_dhaka_bdt, free_delivery_threshold_bdt, cod_enabled, bkash_enabled, nagad_enabled)
         VALUES (1, $1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          INITIAL_DELIVERY_SETTINGS.insideDhakaBdt,
          INITIAL_DELIVERY_SETTINGS.subDhakaBdt,
          INITIAL_DELIVERY_SETTINGS.outsideDhakaBdt,
          INITIAL_DELIVERY_SETTINGS.freeDeliveryThresholdBdt,
          INITIAL_DELIVERY_SETTINGS.codEnabled,
          INITIAL_DELIVERY_SETTINGS.bkashEnabled,
          INITIAL_DELIVERY_SETTINGS.nagadEnabled,
        ]
      );
      for (const b of INITIAL_BANNERS) {
        await this.pgPool.query(
          `INSERT INTO promotional_banners (title_en, title_bn, subtitle_en, subtitle_bn, cta_label_en, cta_label_bn, target_category_slug, image_url, is_active, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            b.titleEn,
            b.titleBn,
            b.subtitleEn,
            b.subtitleBn,
            b.ctaLabelEn,
            b.ctaLabelBn,
            b.targetCategorySlug,
            b.imageUrl,
            b.isActive,
            b.sortOrder,
          ]
        );
      }
      for (const s of INITIAL_SITE_CONTENT) {
        await this.pgPool.query(
          `INSERT INTO site_content (key, value_en, value_bn) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING`,
          [s.key, s.valueEn, s.valueBn]
        );
      }
    }
  }

  private async persistFileState(): Promise<void> {
    if (!this.state) return;
    const payload = JSON.stringify(this.state, null, 2);
    const tmpPath = `${this.dataFilePath}.tmp`;
    this.writeQueue = this.writeQueue.then(async () => {
      await fs.writeFile(tmpPath, payload, 'utf-8');
      await fs.rename(tmpPath, this.dataFilePath);
    });
    await this.writeQueue;
  }

  private async getFileState(): Promise<DatabaseSnapshot> {
    await this.ensureInitialized();
    return this.state!;
  }

  // ==================== USERS & AUTH ====================

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    await this.ensureInitialized();
    const normalized = email.trim().toLowerCase();
    if (this.pgPool) {
      const { rows } = await this.pgPool.query(
        'SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1',
        [normalized]
      );
      if (!rows[0]) return null;
      return this.mapPgUser(rows[0]);
    }
    const st = await this.getFileState();
    return st.users.find((u) => u.email.toLowerCase() === normalized) ?? null;
  }

  async findUserById(id: string): Promise<UserPublic | null> {
    await this.ensureInitialized();
    if (this.pgPool) {
      const { rows } = await this.pgPool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
      if (!rows[0]) return null;
      return toPublicUser(this.mapPgUser(rows[0]));
    }
    const st = await this.getFileState();
    const found = st.users.find((u) => u.id === id);
    return found ? toPublicUser(found) : null;
  }

  async createUser(input: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role?: UserRole;
    district?: string;
    upazila?: string;
    address?: string;
  }): Promise<UserPublic> {
    await this.ensureInitialized();
    const normalizedEmail = input.email.trim().toLowerCase();
    const passwordHash = await hashPassword(input.password);
    const role: UserRole = input.role ?? 'customer';

    if (this.pgPool) {
      const { rows } = await this.pgPool.query(
        `INSERT INTO users (full_name, email, phone, password_hash, role, district, upazila, address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          input.fullName,
          normalizedEmail,
          input.phone,
          passwordHash,
          role,
          input.district || '',
          input.upazila || '',
          input.address || '',
        ]
      );
      return toPublicUser(this.mapPgUser(rows[0]));
    }

    const st = await this.getFileState();
    if (st.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw new Error('An account with this email already exists.');
    }
    const user: UserRecord = {
      id: `usr-${crypto.randomUUID()}`,
      fullName: input.fullName,
      email: normalizedEmail,
      phone: input.phone,
      passwordHash,
      role,
      district: input.district || '',
      upazila: input.upazila || '',
      address: input.address || '',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    st.users.push(user);
    await this.persistFileState();
    return toPublicUser(user);
  }

  async listCustomers(): Promise<CustomerSummary[]> {
    await this.ensureInitialized();
    if (this.pgPool) {
      const { rows } = await this.pgPool.query(`
        SELECT u.*,
          COUNT(o.id)::int AS order_count,
          COALESCE(SUM(CASE WHEN o.order_status != 'cancelled' THEN o.total_bdt ELSE 0 END), 0)::float AS total_spent_bdt
        FROM users u
        LEFT JOIN orders o ON o.user_id = u.id
        WHERE u.role = 'customer'
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `);
      return rows.map((r) => ({
        ...toPublicUser(this.mapPgUser(r)),
        orderCount: Number(r.order_count || 0),
        totalSpentBdt: Number(r.total_spent_bdt || 0),
      }));
    }

    const st = await this.getFileState();
    return st.users
      .filter((u) => u.role === 'customer')
      .map((u) => {
        const custOrders = st.orders.filter(
          (o) =>
            (o.userId === u.id || o.customerPhone === u.phone) &&
            o.orderStatus !== 'cancelled'
        );
        return {
          ...toPublicUser(u),
          orderCount: custOrders.length,
          totalSpentBdt: custOrders.reduce((acc, o) => acc + o.totalBdt, 0),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // ==================== CATEGORIES ====================

  async listCategories(includeInactive = false): Promise<Category[]> {
    await this.ensureInitialized();
    if (this.pgPool) {
      const query = includeInactive
        ? 'SELECT * FROM categories ORDER BY sort_order ASC, name_en ASC'
        : 'SELECT * FROM categories WHERE is_active = TRUE ORDER BY sort_order ASC, name_en ASC';
      const { rows } = await this.pgPool.query(query);
      return rows.map(this.mapPgCategory);
    }

    const st = await this.getFileState();
    return st.categories
      .filter((c) => includeInactive || c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async createCategory(data: Omit<Category, 'id' | 'createdAt'>): Promise<Category> {
    await this.ensureInitialized();
    if (this.pgPool) {
      const { rows } = await this.pgPool.query(
        `INSERT INTO categories (slug, name_en, name_bn, description_en, description_bn, sort_order, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
          data.slug,
          data.nameEn,
          data.nameBn,
          data.descriptionEn,
          data.descriptionBn,
          data.sortOrder,
          data.isActive,
        ]
      );
      return this.mapPgCategory(rows[0]);
    }

    const st = await this.getFileState();
    if (st.categories.some((c) => c.slug === data.slug)) {
      throw new Error('Category slug already exists.');
    }
    const category: Category = {
      ...data,
      id: `cat-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
    };
    st.categories.push(category);
    await this.persistFileState();
    return category;
  }

  async updateCategory(id: string, data: Partial<Omit<Category, 'id' | 'createdAt'>>): Promise<Category | null> {
    await this.ensureInitialized();
    if (this.pgPool) {
      const { rows } = await this.pgPool.query(
        `UPDATE categories
         SET slug = COALESCE($2, slug),
             name_en = COALESCE($3, name_en),
             name_bn = COALESCE($4, name_bn),
             description_en = COALESCE($5, description_en),
             description_bn = COALESCE($6, description_bn),
             sort_order = COALESCE($7, sort_order),
             is_active = COALESCE($8, is_active),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          id,
          data.slug ?? null,
          data.nameEn ?? null,
          data.nameBn ?? null,
          data.descriptionEn ?? null,
          data.descriptionBn ?? null,
          data.sortOrder ?? null,
          data.isActive ?? null,
        ]
      );
      return rows[0] ? this.mapPgCategory(rows[0]) : null;
    }

    const st = await this.getFileState();
    const idx = st.categories.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    st.categories[idx] = { ...st.categories[idx], ...data };
    await this.persistFileState();
    return st.categories[idx];
  }

  // ==================== PRODUCTS ====================

  async listProducts(includeInactive = false): Promise<Product[]> {
    await this.ensureInitialized();
    if (this.pgPool) {
      const query = includeInactive
        ? 'SELECT * FROM products ORDER BY created_at DESC'
        : 'SELECT * FROM products WHERE is_active = TRUE ORDER BY is_featured DESC, created_at DESC';
      const { rows } = await this.pgPool.query(query);
      return rows.map(this.mapPgProduct);
    }

    const st = await this.getFileState();
    return st.products
      .filter((p) => includeInactive || p.isActive)
      .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.createdAt.localeCompare(a.createdAt));
  }

  async createProduct(
    data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Product> {
    await this.ensureInitialized();
    if (this.pgPool) {
      const { rows } = await this.pgPool.query(
        `INSERT INTO products (
          category_id, sku, slug, name_en, name_bn, short_desc_en, short_desc_bn,
          description_en, description_bn, origin_en, origin_bn, weight_label,
          price_bdt, discount_price_bdt, stock_qty, image_url, gallery_urls, is_featured, is_active,
          seo_title_en, seo_title_bn, seo_description_en, seo_description_bn,
          focus_keywords, image_alt_en, image_alt_bn
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19,$20,$21,$22,$23,$24,$25,$26)
        RETURNING *`,
        [
          data.categoryId,
          data.sku,
          data.slug,
          data.nameEn,
          data.nameBn,
          data.shortDescEn,
          data.shortDescBn,
          data.descriptionEn,
          data.descriptionBn,
          data.originEn,
          data.originBn,
          data.weightLabel,
          data.priceBdt,
          data.discountPriceBdt,
          data.stockQty,
          data.imageUrl,
          JSON.stringify(data.galleryUrls || []),
          data.isFeatured,
          data.isActive,
          data.seoTitleEn ?? '',
          data.seoTitleBn ?? '',
          data.seoDescriptionEn ?? '',
          data.seoDescriptionBn ?? '',
          data.focusKeywords ?? '',
          data.imageAltEn ?? '',
          data.imageAltBn ?? '',
        ]
      );
      return this.mapPgProduct(rows[0]);
    }

    const st = await this.getFileState();
    if (st.products.some((p) => p.sku === data.sku || p.slug === data.slug)) {
      throw new Error('A product with this SKU or slug already exists.');
    }
    const now = new Date().toISOString();
    const product: Product = {
      ...data,
      id: `prod-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    st.products.unshift(product);
    await this.persistFileState();
    return product;
  }

  async updateProduct(
    id: string,
    data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Product | null> {
    await this.ensureInitialized();
    if (this.pgPool) {
      const { rows } = await this.pgPool.query(
        `UPDATE products
         SET category_id = COALESCE($2, category_id),
             sku = COALESCE($3, sku),
             slug = COALESCE($4, slug),
             name_en = COALESCE($5, name_en),
             name_bn = COALESCE($6, name_bn),
             short_desc_en = COALESCE($7, short_desc_en),
             short_desc_bn = COALESCE($8, short_desc_bn),
             description_en = COALESCE($9, description_en),
             description_bn = COALESCE($10, description_bn),
             origin_en = COALESCE($11, origin_en),
             origin_bn = COALESCE($12, origin_bn),
             weight_label = COALESCE($13, weight_label),
             price_bdt = COALESCE($14, price_bdt),
             discount_price_bdt = $15,
             stock_qty = COALESCE($16, stock_qty),
             image_url = COALESCE($17, image_url),
             gallery_urls = COALESCE($18::jsonb, gallery_urls),
             is_featured = COALESCE($19, is_featured),
             is_active = COALESCE($20, is_active),
             seo_title_en = COALESCE($21, seo_title_en),
             seo_title_bn = COALESCE($22, seo_title_bn),
             seo_description_en = COALESCE($23, seo_description_en),
             seo_description_bn = COALESCE($24, seo_description_bn),
             focus_keywords = COALESCE($25, focus_keywords),
             image_alt_en = COALESCE($26, image_alt_en),
             image_alt_bn = COALESCE($27, image_alt_bn),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          id,
          data.categoryId ?? null,
          data.sku ?? null,
          data.slug ?? null,
          data.nameEn ?? null,
          data.nameBn ?? null,
          data.shortDescEn ?? null,
          data.shortDescBn ?? null,
          data.descriptionEn ?? null,
          data.descriptionBn ?? null,
          data.originEn ?? null,
          data.originBn ?? null,
          data.weightLabel ?? null,
          data.priceBdt ?? null,
          data.discountPriceBdt !== undefined ? data.discountPriceBdt : null,
          data.stockQty ?? null,
          data.imageUrl ?? null,
          data.galleryUrls ? JSON.stringify(data.galleryUrls) : null,
          data.isFeatured ?? null,
          data.isActive ?? null,
          data.seoTitleEn ?? null,
          data.seoTitleBn ?? null,
          data.seoDescriptionEn ?? null,
          data.seoDescriptionBn ?? null,
          data.focusKeywords ?? null,
          data.imageAltEn ?? null,
          data.imageAltBn ?? null,
        ]
      );
      return rows[0] ? this.mapPgProduct(rows[0]) : null;
    }

    const st = await this.getFileState();
    const idx = st.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    st.products[idx] = {
      ...st.products[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await this.persistFileState();
    return st.products[idx];
  }

  async deleteProduct(id: string): Promise<boolean> {
    await this.ensureInitialized();
    if (this.pgPool) {
      const res = await this.pgPool.query('DELETE FROM products WHERE id = $1', [id]);
      return (res.rowCount ?? 0) > 0;
    }

    const st = await this.getFileState();
    const initialLen = st.products.length;
    st.products = st.products.filter((p) => p.id !== id);
    if (st.products.length === initialLen) return false;
    await this.persistFileState();
    return true;
  }

  // ==================== DELIVERY SETTINGS ====================

  async getDeliverySettings(): Promise<DeliverySettings> {
    await this.ensureInitialized();
    if (this.pgPool) {
      const { rows } = await this.pgPool.query('SELECT * FROM delivery_settings WHERE id = 1');
      if (rows[0]) {
        return {
          insideDhakaBdt: Number(rows[0].inside_dhaka_bdt),
          subDhakaBdt: Number(rows[0].sub_dhaka_bdt),
          outsideDhakaBdt: Number(rows[0].outside_dhaka_bdt),
          freeDeliveryThresholdBdt: Number(rows[0].free_delivery_threshold_bdt),
          codEnabled: Boolean(rows[0].cod_enabled),
          bkashEnabled: Boolean(rows[0].bkash_enabled),
          nagadEnabled: Boolean(rows[0].nagad_enabled),
          updatedAt: new Date(rows[0].updated_at).toISOString(),
        };
      }
      return INITIAL_DELIVERY_SETTINGS;
    }
    const st = await this.getFileState();
    return st.deliverySettings;
  }

  async updateDeliverySettings(
    data: Omit<DeliverySettings, 'updatedAt'>
  ): Promise<DeliverySettings> {
    await this.ensureInitialized();
    const updatedAt = new Date().toISOString();
    if (this.pgPool) {
      const { rows } = await this.pgPool.query(
        `INSERT INTO delivery_settings (id, inside_dhaka_bdt, sub_dhaka_bdt, outside_dhaka_bdt, free_delivery_threshold_bdt, cod_enabled, bkash_enabled, nagad_enabled, updated_at)
         VALUES (1, $1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (id) DO UPDATE SET
           inside_dhaka_bdt = EXCLUDED.inside_dhaka_bdt,
           sub_dhaka_bdt = EXCLUDED.sub_dhaka_bdt,
           outside_dhaka_bdt = EXCLUDED.outside_dhaka_bdt,
           free_delivery_threshold_bdt = EXCLUDED.free_delivery_threshold_bdt,
           cod_enabled = EXCLUDED.cod_enabled,
           bkash_enabled = EXCLUDED.bkash_enabled,
           nagad_enabled = EXCLUDED.nagad_enabled,
           updated_at = NOW()
         RETURNING *`,
        [
          data.insideDhakaBdt,
          data.subDhakaBdt,
          data.outsideDhakaBdt,
          data.freeDeliveryThresholdBdt,
          data.codEnabled,
          data.bkashEnabled,
          data.nagadEnabled,
        ]
      );
      return {
        insideDhakaBdt: Number(rows[0].inside_dhaka_bdt),
        subDhakaBdt: Number(rows[0].sub_dhaka_bdt),
        outsideDhakaBdt: Number(rows[0].outside_dhaka_bdt),
        freeDeliveryThresholdBdt: Number(rows[0].free_delivery_threshold_bdt),
        codEnabled: Boolean(rows[0].cod_enabled),
        bkashEnabled: Boolean(rows[0].bkash_enabled),
        nagadEnabled: Boolean(rows[0].nagad_enabled),
        updatedAt: new Date(rows[0].updated_at).toISOString(),
      };
    }

    const st = await this.getFileState();
    st.deliverySettings = { ...data, updatedAt };
    await this.persistFileState();
    return st.deliverySettings;
  }

  // ==================== ORDERS (TRANSACTIONAL) ====================

  async createOrder(input: CreateOrderInput): Promise<Order> {
    await this.ensureInitialized();
    const settings = await this.getDeliverySettings();

    if (input.paymentMethod === 'cod' && !settings.codEnabled) {
      throw new Error('Cash on Delivery is currently disabled.');
    }
    if (input.paymentMethod === 'bkash' && !settings.bkashEnabled) {
      throw new Error(
        'bKash online gateway requires live merchant credentials. Please select Cash on Delivery (COD) to complete your order.'
      );
    }
    if (input.paymentMethod === 'nagad' && !settings.nagadEnabled) {
      throw new Error(
        'Nagad online gateway requires live merchant credentials. Please select Cash on Delivery (COD) to complete your order.'
      );
    }

    if (this.pgPool) {
      const client = await this.pgPool.connect();
      try {
        await client.query('BEGIN');
        let subtotal = 0;
        const resolvedItems: Array<Omit<OrderItem, 'id' | 'orderId'>> = [];

        for (const reqItem of input.items) {
          const { rows: pRows } = await client.query(
            'SELECT * FROM products WHERE id = $1 AND is_active = TRUE FOR UPDATE',
            [reqItem.productId]
          );
          const prod = pRows[0];
          if (!prod) {
            throw new Error(`Product ${reqItem.productId} is unavailable.`);
          }
          if (Number(prod.stock_qty) < reqItem.quantity) {
            throw new Error(`Insufficient stock for ${prod.name_en}. Available: ${prod.stock_qty}`);
          }
          const effectivePrice =
            prod.discount_price_bdt !== null && Number(prod.discount_price_bdt) < Number(prod.price_bdt)
              ? Number(prod.discount_price_bdt)
              : Number(prod.price_bdt);
          const lineTotal = effectivePrice * reqItem.quantity;
          subtotal += lineTotal;

          await client.query('UPDATE products SET stock_qty = stock_qty - $2 WHERE id = $1', [
            prod.id,
            reqItem.quantity,
          ]);

          resolvedItems.push({
            productId: prod.id,
            productNameEn: prod.name_en,
            productNameBn: prod.name_bn,
            sku: prod.sku,
            weightLabel: prod.weight_label,
            unitPriceBdt: effectivePrice,
            quantity: reqItem.quantity,
            lineTotalBdt: lineTotal,
            imageUrl: prod.image_url,
          });
        }

        const { deliveryZone, deliveryChargeBdt } = computeDeliveryCharge(
          subtotal,
          input.district,
          input.upazila,
          settings
        );
        const totalBdt = subtotal + deliveryChargeBdt;
        const orderNumber = generateOrderNumber();

        const { rows: ordRows } = await client.query(
          `INSERT INTO orders (
            order_number, user_id, customer_name, customer_phone, customer_email,
            district, upazila, delivery_address, delivery_zone, payment_method,
            payment_status, order_status, subtotal_bdt, delivery_charge_bdt, discount_bdt,
            total_bdt, customer_note
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'unpaid','pending',$11,$12,0,$13,$14)
          RETURNING *`,
          [
            orderNumber,
            input.userId,
            input.customerName,
            input.customerPhone,
            input.customerEmail || null,
            input.district,
            input.upazila,
            input.deliveryAddress,
            deliveryZone,
            input.paymentMethod,
            subtotal,
            deliveryChargeBdt,
            totalBdt,
            input.customerNote || '',
          ]
        );
        const ordRow = ordRows[0];

        for (const item of resolvedItems) {
          await client.query(
            `INSERT INTO order_items (
              order_id, product_id, product_name_en, product_name_bn, sku,
              weight_label, unit_price_bdt, quantity, line_total_bdt, image_url
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
              ordRow.id,
              item.productId,
              item.productNameEn,
              item.productNameBn,
              item.sku,
              item.weightLabel,
              item.unitPriceBdt,
              item.quantity,
              item.lineTotalBdt,
              item.imageUrl,
            ]
          );
        }

        await client.query(
          `INSERT INTO order_notifications (order_id, status, message_en, message_bn)
           VALUES ($1, 'pending', $2, $3)`,
          [
            ordRow.id,
            `Order ${orderNumber} placed via Cash on Delivery.`,
            `ক্যাশ অন ডেলিভারি সুবিধায় অর্ডার ${orderNumber} গ্রহণ করা হয়েছে।`,
          ]
        );

        await client.query('COMMIT');
        return (await this.getOrderById(ordRow.id))!;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // Atomic JSON store transaction
    const st = await this.getFileState();
    let subtotal = 0;
    const orderId = `ord-${crypto.randomUUID().slice(0, 8)}`;
    const orderNumber = generateOrderNumber();
    const resolvedItems: OrderItem[] = [];
    const stockUpdates: Array<{ product: Product; qty: number }> = [];

    for (const reqItem of input.items) {
      const prod = st.products.find((p) => p.id === reqItem.productId && p.isActive);
      if (!prod) {
        throw new Error(`Product ${reqItem.productId} is unavailable.`);
      }
      if (prod.stockQty < reqItem.quantity) {
        throw new Error(`Insufficient stock for ${prod.nameEn}. Available: ${prod.stockQty}`);
      }
      const effectivePrice =
        prod.discountPriceBdt !== null && prod.discountPriceBdt < prod.priceBdt
          ? prod.discountPriceBdt
          : prod.priceBdt;
      const lineTotal = effectivePrice * reqItem.quantity;
      subtotal += lineTotal;
      stockUpdates.push({ product: prod, qty: reqItem.quantity });
      resolvedItems.push({
        id: `oi-${crypto.randomUUID().slice(0, 8)}`,
        orderId,
        productId: prod.id,
        productNameEn: prod.nameEn,
        productNameBn: prod.nameBn,
        sku: prod.sku,
        weightLabel: prod.weightLabel,
        unitPriceBdt: effectivePrice,
        quantity: reqItem.quantity,
        lineTotalBdt: lineTotal,
        imageUrl: prod.imageUrl,
      });
    }

    for (const upd of stockUpdates) {
      upd.product.stockQty -= upd.qty;
      upd.product.updatedAt = new Date().toISOString();
    }

    const { deliveryZone, deliveryChargeBdt } = computeDeliveryCharge(
      subtotal,
      input.district,
      input.upazila,
      settings
    );
    const now = new Date().toISOString();
    const order: Order = {
      id: orderId,
      orderNumber,
      userId: input.userId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail || '',
      district: input.district,
      upazila: input.upazila,
      deliveryAddress: input.deliveryAddress,
      deliveryZone,
      paymentMethod: input.paymentMethod,
      paymentStatus: 'unpaid',
      orderStatus: 'pending',
      subtotalBdt: subtotal,
      deliveryChargeBdt,
      discountBdt: 0,
      totalBdt: subtotal + deliveryChargeBdt,
      customerNote: input.customerNote || '',
      adminNote: '',
      items: resolvedItems,
      notifications: [
        {
          id: `notif-${crypto.randomUUID().slice(0, 8)}`,
          orderId,
          status: 'pending',
          messageEn: `Order ${orderNumber} placed with Cash on Delivery.`,
          messageBn: `ক্যাশ অন ডেলিভারি সুবিধায় অর্ডার ${orderNumber} গ্রহণ করা হয়েছে।`,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    st.orders.unshift(order);
    await this.persistFileState();
    return order;
  }

  async listOrders(filters?: { userId?: string; status?: OrderStatus }): Promise<Order[]> {
    await this.ensureInitialized();
    if (this.pgPool) {
      const clauses: string[] = [];
      const params: unknown[] = [];
      if (filters?.userId) {
        params.push(filters.userId);
        clauses.push(`user_id = $${params.length}`);
      }
      if (filters?.status) {
        params.push(filters.status);
        clauses.push(`order_status = $${params.length}`);
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const { rows } = await this.pgPool.query(
        `SELECT * FROM orders ${where} ORDER BY created_at DESC`,
        params
      );
      return Promise.all(rows.map((r) => this.hydratePgOrder(r)));
    }

    const st = await this.getFileState();
    return st.orders
      .filter((o) => {
        if (filters?.userId && o.userId !== filters.userId) return false;
        if (filters?.status && o.orderStatus !== filters.status) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getOrderById(id: string): Promise<Order | null> {
    await this.ensureInitialized();
    if (this.pgPool) {
      const { rows } = await this.pgPool.query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [id]);
      if (!rows[0]) return null;
      return this.hydratePgOrder(rows[0]);
    }
    const st = await this.getFileState();
    return st.orders.find((o) => o.id === id) ?? null;
  }

  async trackOrder(orderNumber: string, phone?: string): Promise<Order | null> {
    await this.ensureInitialized();
    const normCode = orderNumber.trim().toUpperCase();
    const normPhone = phone ? phone.replace(/^\+?88/, '').trim() : '';

    if (this.pgPool) {
      const { rows } = await this.pgPool.query(
        'SELECT * FROM orders WHERE UPPER(order_number) = $1 LIMIT 1',
        [normCode]
      );
      if (!rows[0]) return null;
      const ord = await this.hydratePgOrder(rows[0]);
      if (normPhone && ord.customerPhone.replace(/^\+?88/, '') !== normPhone) {
        return null;
      }
      return ord;
    }

    const st = await this.getFileState();
    const ord = st.orders.find((o) => o.orderNumber.toUpperCase() === normCode);
    if (!ord) return null;
    if (normPhone && ord.customerPhone.replace(/^\+?88/, '') !== normPhone) {
      return null;
    }
    return ord;
  }

  async updateOrderStatus(
    id: string,
    payload: {
      orderStatus: OrderStatus;
      paymentStatus?: PaymentStatus;
      adminNote?: string;
      notificationMessageEn?: string;
      notificationMessageBn?: string;
    }
  ): Promise<Order | null> {
    await this.ensureInitialized();
    const msgEn = payload.notificationMessageEn?.trim() || STATUS_MESSAGES[payload.orderStatus].en;
    const msgBn = payload.notificationMessageBn?.trim() || STATUS_MESSAGES[payload.orderStatus].bn;

    if (this.pgPool) {
      const { rows } = await this.pgPool.query(
        `UPDATE orders
         SET order_status = $2,
             payment_status = COALESCE($3, payment_status),
             admin_note = COALESCE($4, admin_note),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, payload.orderStatus, payload.paymentStatus ?? null, payload.adminNote ?? null]
      );
      if (!rows[0]) return null;
      await this.pgPool.query(
        `INSERT INTO order_notifications (order_id, status, message_en, message_bn)
         VALUES ($1, $2, $3, $4)`,
        [id, payload.orderStatus, msgEn, msgBn]
      );
      return this.hydratePgOrder(rows[0]);
    }

    const st = await this.getFileState();
    const idx = st.orders.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    const current = st.orders[idx];
    const nextPaymentStatus: PaymentStatus =
      payload.paymentStatus ??
      (payload.orderStatus === 'delivered' && current.paymentMethod === 'cod'
        ? 'paid'
        : current.paymentStatus);

    current.orderStatus = payload.orderStatus;
    current.paymentStatus = nextPaymentStatus;
    if (payload.adminNote !== undefined) current.adminNote = payload.adminNote;
    current.updatedAt = now;
    current.notifications.push({
      id: `notif-${crypto.randomUUID().slice(0, 8)}`,
      orderId: current.id,
      status: payload.orderStatus,
      messageEn: msgEn,
      messageBn: msgBn,
      createdAt: now,
    });
    await this.persistFileState();
    return current;
  }

  // ==================== BANNERS & SITE CONTENT ====================

  async listBanners(includeInactive = false): Promise<PromotionalBanner[]> {
    await this.ensureInitialized();
    if (this.pgPool) {
      const q = includeInactive
        ? 'SELECT * FROM promotional_banners ORDER BY sort_order ASC, created_at DESC'
        : 'SELECT * FROM promotional_banners WHERE is_active = TRUE ORDER BY sort_order ASC, created_at DESC';
      const { rows } = await this.pgPool.query(q);
      return rows.map(this.mapPgBanner);
    }
    const st = await this.getFileState();
    return st.banners
      .filter((b) => includeInactive || b.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async createBanner(
    data: Omit<PromotionalBanner, 'id' | 'createdAt'>
  ): Promise<PromotionalBanner> {
    await this.ensureInitialized();
    if (this.pgPool) {
      const { rows } = await this.pgPool.query(
        `INSERT INTO promotional_banners (
          title_en, title_bn, subtitle_en, subtitle_bn, cta_label_en, cta_label_bn,
          target_category_slug, image_url, is_active, sort_order
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [
          data.titleEn,
          data.titleBn,
          data.subtitleEn,
          data.subtitleBn,
          data.ctaLabelEn,
          data.ctaLabelBn,
          data.targetCategorySlug,
          data.imageUrl,
          data.isActive,
          data.sortOrder,
        ]
      );
      return this.mapPgBanner(rows[0]);
    }
    const st = await this.getFileState();
    const banner: PromotionalBanner = {
      ...data,
      id: `banner-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
    };
    st.banners.push(banner);
    await this.persistFileState();
    return banner;
  }

  async updateBanner(
    id: string,
    data: Partial<Omit<PromotionalBanner, 'id' | 'createdAt'>>
  ): Promise<PromotionalBanner | null> {
    await this.ensureInitialized();
    if (this.pgPool) {
      const { rows } = await this.pgPool.query(
        `UPDATE promotional_banners
         SET title_en = COALESCE($2, title_en),
             title_bn = COALESCE($3, title_bn),
             subtitle_en = COALESCE($4, subtitle_en),
             subtitle_bn = COALESCE($5, subtitle_bn),
             cta_label_en = COALESCE($6, cta_label_en),
             cta_label_bn = COALESCE($7, cta_label_bn),
             target_category_slug = COALESCE($8, target_category_slug),
             image_url = COALESCE($9, image_url),
             is_active = COALESCE($10, is_active),
             sort_order = COALESCE($11, sort_order)
         WHERE id = $1 RETURNING *`,
        [
          id,
          data.titleEn ?? null,
          data.titleBn ?? null,
          data.subtitleEn ?? null,
          data.subtitleBn ?? null,
          data.ctaLabelEn ?? null,
          data.ctaLabelBn ?? null,
          data.targetCategorySlug ?? null,
          data.imageUrl ?? null,
          data.isActive ?? null,
          data.sortOrder ?? null,
        ]
      );
      return rows[0] ? this.mapPgBanner(rows[0]) : null;
    }
    const st = await this.getFileState();
    const idx = st.banners.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    st.banners[idx] = { ...st.banners[idx], ...data };
    await this.persistFileState();
    return st.banners[idx];
  }

  async deleteBanner(id: string): Promise<boolean> {
    await this.ensureInitialized();
    if (this.pgPool) {
      const res = await this.pgPool.query('DELETE FROM promotional_banners WHERE id = $1', [id]);
      return (res.rowCount ?? 0) > 0;
    }
    const st = await this.getFileState();
    const len = st.banners.length;
    st.banners = st.banners.filter((b) => b.id !== id);
    if (st.banners.length === len) return false;
    await this.persistFileState();
    return true;
  }

  async getSiteContent(): Promise<SiteContentItem[]> {
    await this.ensureInitialized();
    if (this.pgPool) {
      const { rows } = await this.pgPool.query('SELECT * FROM site_content ORDER BY key ASC');
      return rows.map((r) => ({
        key: r.key,
        valueEn: r.value_en,
        valueBn: r.value_bn,
        updatedAt: new Date(r.updated_at).toISOString(),
      }));
    }
    const st = await this.getFileState();
    return st.siteContent;
  }

  async updateSiteContent(
    items: Array<{ key: string; valueEn: string; valueBn: string }>
  ): Promise<SiteContentItem[]> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    if (this.pgPool) {
      for (const item of items) {
        await this.pgPool.query(
          `INSERT INTO site_content (key, value_en, value_bn, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (key) DO UPDATE SET
             value_en = EXCLUDED.value_en,
             value_bn = EXCLUDED.value_bn,
             updated_at = NOW()`,
          [item.key, item.valueEn, item.valueBn]
        );
      }
      return this.getSiteContent();
    }

    const st = await this.getFileState();
    for (const item of items) {
      const idx = st.siteContent.findIndex((s) => s.key === item.key);
      if (idx >= 0) {
        st.siteContent[idx] = { ...item, updatedAt: now };
      } else {
        st.siteContent.push({ ...item, updatedAt: now });
      }
    }
    await this.persistFileState();
    return st.siteContent;
  }

  // ==================== CONTACT MESSAGES ====================

  async createContactMessage(
    data: Omit<ContactMessage, 'id' | 'isResolved' | 'createdAt'>
  ): Promise<ContactMessage> {
    await this.ensureInitialized();
    if (this.pgPool) {
      const { rows } = await this.pgPool.query(
        `INSERT INTO contact_messages (name, phone, email, subject, message)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [data.name, data.phone, data.email, data.subject, data.message]
      );
      return {
        id: rows[0].id,
        name: rows[0].name,
        phone: rows[0].phone,
        email: rows[0].email,
        subject: rows[0].subject,
        message: rows[0].message,
        isResolved: rows[0].is_resolved,
        createdAt: new Date(rows[0].created_at).toISOString(),
      };
    }

    const st = await this.getFileState();
    const msg: ContactMessage = {
      ...data,
      id: `msg-${crypto.randomUUID().slice(0, 8)}`,
      isResolved: false,
      createdAt: new Date().toISOString(),
    };
    st.contactMessages.unshift(msg);
    await this.persistFileState();
    return msg;
  }

  async listContactMessages(): Promise<ContactMessage[]> {
    await this.ensureInitialized();
    if (this.pgPool) {
      const { rows } = await this.pgPool.query(
        'SELECT * FROM contact_messages ORDER BY created_at DESC'
      );
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        email: r.email,
        subject: r.subject,
        message: r.message,
        isResolved: r.is_resolved,
        createdAt: new Date(r.created_at).toISOString(),
      }));
    }
    const st = await this.getFileState();
    return st.contactMessages;
  }

  // ==================== ANALYTICS & BACKUP ====================

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [orders, customers, products, categories] = await Promise.all([
      this.listOrders(),
      this.listCustomers(),
      this.listProducts(true),
      this.listCategories(true),
    ]);

    const nonCancelled = orders.filter((o) => o.orderStatus !== 'cancelled');
    const totalSalesBdt = nonCancelled.reduce((sum, o) => sum + o.totalBdt, 0);
    const pendingOrders = orders.filter(
      (o) => o.orderStatus === 'pending' || o.orderStatus === 'confirmed'
    ).length;
    const lowStockProducts = products.filter((p) => p.isActive && p.stockQty <= 15).length;
    const codOrders = orders.filter((o) => o.paymentMethod === 'cod').length;

    const prodCatMap = new Map<string, string>();
    for (const p of products) {
      prodCatMap.set(p.id, p.categoryId);
    }

    const catStats = new Map<
      string,
      { categoryNameEn: string; categoryNameBn: string; revenueBdt: number; unitsSold: number }
    >();
    for (const c of categories) {
      catStats.set(c.id, {
        categoryNameEn: c.nameEn,
        categoryNameBn: c.nameBn,
        revenueBdt: 0,
        unitsSold: 0,
      });
    }

    for (const ord of nonCancelled) {
      for (const item of ord.items) {
        const catId = item.productId ? prodCatMap.get(item.productId) : undefined;
        if (catId && catStats.has(catId)) {
          const entry = catStats.get(catId)!;
          entry.revenueBdt += item.lineTotalBdt;
          entry.unitsSold += item.quantity;
        }
      }
    }

    return {
      totalOrders: orders.length,
      totalSalesBdt,
      totalCustomers: customers.length,
      pendingOrders,
      lowStockProducts,
      codOrders,
      revenueByCategory: Array.from(catStats.values()),
      recentOrders: orders.slice(0, 10),
    };
  }

  async exportFullDatabase(): Promise<DatabaseSnapshot> {
    await this.ensureInitialized();
    if (!this.pgPool) {
      const st = await this.getFileState();
      return {
        ...structuredClone(st),
        exportedAt: new Date().toISOString(),
      };
    }

    const [categories, products, deliverySettings, orders, banners, siteContent, contactMessages] =
      await Promise.all([
        this.listCategories(true),
        this.listProducts(true),
        this.getDeliverySettings(),
        this.listOrders(),
        this.listBanners(true),
        this.getSiteContent(),
        this.listContactMessages(),
      ]);
    const { rows: userRows } = await this.pgPool.query('SELECT * FROM users');
    let pluginIntegrations: PluginIntegrationRecord[] = [];
    let pluginActivityLogs: PluginActivityLogRecord[] = [];

    const pluginTables = await this.pgPool.query(
      `SELECT
        to_regclass('public.plugin_integrations') IS NOT NULL AS integrations_exists,
        to_regclass('public.plugin_activity_logs') IS NOT NULL AS logs_exists`
    );

    if (pluginTables.rows[0]?.integrations_exists && pluginTables.rows[0]?.logs_exists) {
      [pluginIntegrations, pluginActivityLogs] = await Promise.all([
        this.listPluginIntegrations(),
        this.listPluginActivityLogs(500),
      ]);
    }


    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      users: userRows.map((r) => this.mapPgUser(r)),
      categories,
      products,
      deliverySettings,
      orders,
      banners,
      siteContent,
      contactMessages,
      pluginIntegrations,
      pluginActivityLogs,
    };
  }

  async importDatabaseBackup(snapshot: DatabaseSnapshot): Promise<void> {
    await this.ensureInitialized();
    if (!snapshot || !Array.isArray(snapshot.categories) || !Array.isArray(snapshot.products)) {
      throw new Error('Invalid backup payload structure.');
    }
    if (!this.pgPool) {
      this.state = {
        version: snapshot.version || 1,
        exportedAt: new Date().toISOString(),
        users: Array.isArray(snapshot.users) ? snapshot.users : this.state!.users,
        categories: snapshot.categories,
        products: snapshot.products,
        deliverySettings: snapshot.deliverySettings || this.state!.deliverySettings,
        orders: Array.isArray(snapshot.orders) ? snapshot.orders : [],
        banners: Array.isArray(snapshot.banners) ? snapshot.banners : [],
        siteContent: Array.isArray(snapshot.siteContent) ? snapshot.siteContent : [],
        contactMessages: Array.isArray(snapshot.contactMessages) ? snapshot.contactMessages : [],
        pluginIntegrations: Array.isArray(snapshot.pluginIntegrations)
          ? snapshot.pluginIntegrations
          : (this.state!.pluginIntegrations || []),
        pluginActivityLogs: Array.isArray(snapshot.pluginActivityLogs)
          ? snapshot.pluginActivityLogs
          : (this.state!.pluginActivityLogs || []),
      };
      await this.persistFileState();
      return;
    }

    // PostgreSQL transactional restore of catalog & configuration
    const client = await this.pgPool.connect();
    try {
      await client.query('BEGIN');
      for (const c of snapshot.categories) {
        await client.query(
          `INSERT INTO categories (id, slug, name_en, name_bn, description_en, description_bn, sort_order, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (slug) DO UPDATE SET
             name_en = EXCLUDED.name_en,
             name_bn = EXCLUDED.name_bn,
             description_en = EXCLUDED.description_en,
             description_bn = EXCLUDED.description_bn,
             sort_order = EXCLUDED.sort_order,
             is_active = EXCLUDED.is_active`,
          [c.id, c.slug, c.nameEn, c.nameBn, c.descriptionEn, c.descriptionBn, c.sortOrder, c.isActive]
        );
      }
      if (snapshot.deliverySettings) {
        await client.query(
          `UPDATE delivery_settings SET
             inside_dhaka_bdt = $1, sub_dhaka_bdt = $2, outside_dhaka_bdt = $3,
             free_delivery_threshold_bdt = $4, cod_enabled = $5, bkash_enabled = $6, nagad_enabled = $7
           WHERE id = 1`,
          [
            snapshot.deliverySettings.insideDhakaBdt,
            snapshot.deliverySettings.subDhakaBdt,
            snapshot.deliverySettings.outsideDhakaBdt,
            snapshot.deliverySettings.freeDeliveryThresholdBdt,
            snapshot.deliverySettings.codEnabled,
            snapshot.deliverySettings.bkashEnabled,
            snapshot.deliverySettings.nagadEnabled,
          ]
        );
      }
      for (const s of snapshot.siteContent || []) {
        await client.query(
          `INSERT INTO site_content (key, value_en, value_bn, updated_at)
           VALUES ($1,$2,$3,NOW())
           ON CONFLICT (key) DO UPDATE SET value_en = EXCLUDED.value_en, value_bn = EXCLUDED.value_bn, updated_at = NOW()`,
          [s.key, s.valueEn, s.valueBn]
        );
      }

      // Older backups omit plugin arrays; keep current Plugin Center data.
      if (
        Array.isArray(snapshot.pluginIntegrations) &&
        Array.isArray(snapshot.pluginActivityLogs)
      ) {
        const pluginTables = await client.query(
          `SELECT
            to_regclass('public.plugin_integrations') IS NOT NULL AS integrations_exists,
            to_regclass('public.plugin_activity_logs') IS NOT NULL AS logs_exists`
        );

        if (
          !pluginTables.rows[0]?.integrations_exists ||
          !pluginTables.rows[0]?.logs_exists
        ) {
          throw new Error(
            'Plugin Center tables are not installed. Apply the approved migration before restoring this backup.'
          );
        }

        await client.query('DELETE FROM plugin_activity_logs');
        await client.query('DELETE FROM plugin_integrations');

        for (const item of snapshot.pluginIntegrations) {
          await client.query(
            `INSERT INTO plugin_integrations
              (plugin_key, enabled, status, settings, last_error, created_at, updated_at)
             VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7)`,
            [
              item.pluginKey,
              item.enabled,
              item.status,
              JSON.stringify(item.settings || {}),
              item.lastError || '',
              item.createdAt,
              item.updatedAt,
            ]
          );
        }

        for (const item of snapshot.pluginActivityLogs) {
          await client.query(
            `INSERT INTO plugin_activity_logs
              (id, plugin_key, action, details, actor_user_id, created_at)
             VALUES ($1,$2,$3,$4::jsonb,$5,$6)`,
            [
              item.id,
              item.pluginKey,
              item.action,
              JSON.stringify(item.details || {}),
              item.actorUserId,
              item.createdAt,
            ]
          );
        }

        await client.query(
          `SELECT setval(
            pg_get_serial_sequence('plugin_activity_logs', 'id'),
            COALESCE((SELECT MAX(id) FROM plugin_activity_logs), 1),
            EXISTS (SELECT 1 FROM plugin_activity_logs)
          )`
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==================== PG ROW MAPPERS ====================

  private mapPgUser(r: Record<string, any>): UserRecord {
    return {
      id: r.id,
      fullName: r.full_name,
      email: r.email,
      phone: r.phone,
      passwordHash: r.password_hash,
      role: r.role,
      district: r.district || '',
      upazila: r.upazila || '',
      address: r.address || '',
      isActive: Boolean(r.is_active),
      createdAt: new Date(r.created_at).toISOString(),
    };
  }

  private mapPgCategory(r: Record<string, any>): Category {
    return {
      id: r.id,
      slug: r.slug,
      nameEn: r.name_en,
      nameBn: r.name_bn,
      descriptionEn: r.description_en || '',
      descriptionBn: r.description_bn || '',
      sortOrder: Number(r.sort_order || 0),
      isActive: Boolean(r.is_active),
      createdAt: new Date(r.created_at).toISOString(),
    };
  }


  // ==================== PLUGIN CENTER ====================

  async listPluginIntegrations(): Promise<PluginIntegrationRecord[]> {
    await this.ensureInitialized();

    if (this.pgPool) {
      const { rows } = await this.pgPool.query(
        'SELECT * FROM plugin_integrations ORDER BY plugin_key ASC'
      );
      return rows.map((r) => ({
        pluginKey: r.plugin_key,
        enabled: Boolean(r.enabled),
        status: r.status,
        settings: r.settings || {},
        lastError: r.last_error || '',
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      }));
    }

    const st = await this.getFileState();
    return st.pluginIntegrations || [];
  }

  async updatePluginIntegration(
    pluginKey: string,
    input: { enabled?: boolean; settings?: Record<string, unknown> },
    actorUserId: string | null
  ): Promise<PluginIntegrationRecord> {
    await this.ensureInitialized();
    const now = new Date().toISOString();

    if (this.pgPool) {
      const existing = await this.pgPool.query(
        'SELECT * FROM plugin_integrations WHERE plugin_key = $1',
        [pluginKey]
      );
      const previous = existing.rows[0];
      const enabled = input.enabled ?? Boolean(previous?.enabled);
      const settings = {
        ...(previous?.settings || {}),
        ...(input.settings || {}),
      };
      const status = previous?.status === 'planned'
        ? 'planned'
        : enabled ? 'available' : 'disconnected';

      const { rows } = await this.pgPool.query(
        `INSERT INTO plugin_integrations
          (plugin_key, enabled, status, settings, last_error)
         VALUES ($1, $2, $3, $4::jsonb, '')
         ON CONFLICT (plugin_key) DO UPDATE SET
          enabled = EXCLUDED.enabled,
          status = EXCLUDED.status,
          settings = EXCLUDED.settings,
          updated_at = NOW()
         RETURNING *`,
        [pluginKey, enabled, status, JSON.stringify(settings)]
      );

      await this.pgPool.query(
        `INSERT INTO plugin_activity_logs
          (plugin_key, action, details, actor_user_id)
         VALUES ($1, $2, $3::jsonb, $4)`,
        [
          pluginKey,
          input.enabled === undefined ? 'settings_updated' : (enabled ? 'enabled' : 'disabled'),
          JSON.stringify({ enabled, settingsUpdated: Boolean(input.settings) }),
          actorUserId,
        ]
      );

      const r = rows[0];
      return {
        pluginKey: r.plugin_key,
        enabled: Boolean(r.enabled),
        status: r.status,
        settings: r.settings || {},
        lastError: r.last_error || '',
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      };
    }

    const st = await this.getFileState();
    if (!Array.isArray(st.pluginIntegrations)) st.pluginIntegrations = [];
    if (!Array.isArray(st.pluginActivityLogs)) st.pluginActivityLogs = [];

    let record = st.pluginIntegrations.find((item) => item.pluginKey === pluginKey);
    const isNew = !record;

    if (!record) {
      record = {
        pluginKey,
        enabled: false,
        status: 'disconnected',
        settings: {},
        lastError: '',
        createdAt: now,
        updatedAt: now,
      };
      st.pluginIntegrations.push(record);
    }

    if (input.enabled !== undefined) record.enabled = input.enabled;
    if (input.settings) record.settings = { ...record.settings, ...input.settings };
    if (record.status !== 'planned') {
      record.status = record.enabled ? 'available' : 'disconnected';
    }
    record.updatedAt = now;

    const nextId = st.pluginActivityLogs.reduce(
      (max, item) => Math.max(max, item.id), 0
    ) + 1;

    st.pluginActivityLogs.unshift({
      id: nextId,
      pluginKey,
      action: input.enabled === undefined
        ? 'settings_updated'
        : (record.enabled ? 'enabled' : 'disabled'),
      details: {
        enabled: record.enabled,
        settingsUpdated: Boolean(input.settings),
        created: isNew,
      },
      actorUserId,
      createdAt: now,
    });

    await this.persistFileState();
    return record;
  }

  async listPluginActivityLogs(limit = 100): Promise<PluginActivityLogRecord[]> {
    await this.ensureInitialized();
    const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));

    if (this.pgPool) {
      const { rows } = await this.pgPool.query(
        `SELECT * FROM plugin_activity_logs
         ORDER BY created_at DESC LIMIT $1`,
        [safeLimit]
      );
      return rows.map((r) => ({
        id: Number(r.id),
        pluginKey: r.plugin_key,
        action: r.action,
        details: r.details || {},
        actorUserId: r.actor_user_id,
        createdAt: new Date(r.created_at).toISOString(),
      }));
    }

    const st = await this.getFileState();
    return (st.pluginActivityLogs || []).slice(0, safeLimit);
  }

  private mapPgProduct(r: Record<string, any>): Product {
    return {
      id: r.id,
      categoryId: r.category_id,
      sku: r.sku,
      slug: r.slug,
      nameEn: r.name_en,
      nameBn: r.name_bn,
      shortDescEn: r.short_desc_en || '',
      shortDescBn: r.short_desc_bn || '',
      descriptionEn: r.description_en || '',
      descriptionBn: r.description_bn || '',
      originEn: r.origin_en || '',
      originBn: r.origin_bn || '',
      weightLabel: r.weight_label,
      priceBdt: Number(r.price_bdt),
      discountPriceBdt: r.discount_price_bdt !== null ? Number(r.discount_price_bdt) : null,
      stockQty: Number(r.stock_qty),
      imageUrl: r.image_url,
      galleryUrls: Array.isArray(r.gallery_urls) ? r.gallery_urls : [],
      isFeatured: Boolean(r.is_featured),
      isActive: Boolean(r.is_active),
      seoTitleEn: r.seo_title_en || '',
      seoTitleBn: r.seo_title_bn || '',
      seoDescriptionEn: r.seo_description_en || '',
      seoDescriptionBn: r.seo_description_bn || '',
      focusKeywords: r.focus_keywords || '',
      imageAltEn: r.image_alt_en || '',
      imageAltBn: r.image_alt_bn || '',
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  private mapPgBanner(r: Record<string, any>): PromotionalBanner {
    return {
      id: r.id,
      titleEn: r.title_en,
      titleBn: r.title_bn,
      subtitleEn: r.subtitle_en || '',
      subtitleBn: r.subtitle_bn || '',
      ctaLabelEn: r.cta_label_en,
      ctaLabelBn: r.cta_label_bn,
      targetCategorySlug: r.target_category_slug || 'all',
      imageUrl: r.image_url,
      isActive: Boolean(r.is_active),
      sortOrder: Number(r.sort_order || 0),
      createdAt: new Date(r.created_at).toISOString(),
    };
  }

  private async hydratePgOrder(r: Record<string, any>): Promise<Order> {
    const [{ rows: itemRows }, { rows: notifRows }] = await Promise.all([
      this.pgPool!.query('SELECT * FROM order_items WHERE order_id = $1', [r.id]),
      this.pgPool!.query(
        'SELECT * FROM order_notifications WHERE order_id = $1 ORDER BY created_at ASC',
        [r.id]
      ),
    ]);
    return {
      id: r.id,
      orderNumber: r.order_number,
      userId: r.user_id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      customerEmail: r.customer_email || '',
      district: r.district,
      upazila: r.upazila,
      deliveryAddress: r.delivery_address,
      deliveryZone: r.delivery_zone,
      paymentMethod: r.payment_method,
      paymentStatus: r.payment_status,
      orderStatus: r.order_status,
      subtotalBdt: Number(r.subtotal_bdt),
      deliveryChargeBdt: Number(r.delivery_charge_bdt),
      discountBdt: Number(r.discount_bdt || 0),
      totalBdt: Number(r.total_bdt),
      customerNote: r.customer_note || '',
      adminNote: r.admin_note || '',
      items: itemRows.map((i) => ({
        id: i.id,
        orderId: i.order_id,
        productId: i.product_id,
        productNameEn: i.product_name_en,
        productNameBn: i.product_name_bn,
        sku: i.sku,
        weightLabel: i.weight_label,
        unitPriceBdt: Number(i.unit_price_bdt),
        quantity: Number(i.quantity),
        lineTotalBdt: Number(i.line_total_bdt),
        imageUrl: i.image_url,
      })),
      notifications: notifRows.map((n) => ({
        id: n.id,
        orderId: n.order_id,
        status: n.status,
        messageEn: n.message_en,
        messageBn: n.message_bn,
        createdAt: new Date(n.created_at).toISOString(),
      })),
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }
}

export const storage = new StorageEngine();
