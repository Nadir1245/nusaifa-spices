import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';
import {
  attachOptionalAuth,
  clearAuthCookie,
  requireAdmin,
  requireAuth,
  setAuthCookie,
  signAuthToken,
  verifyPassword,
  type AuthenticatedRequest,
} from './src/server/auth.ts';
import { storage, type DatabaseSnapshot } from './src/server/storage.ts';
import {
  appSettingsSchema,
  bannerSchema,
  categorySchema,
  contactMessageSchema,
  createOrderSchema,
  deliverySettingsSchema,
  loginSchema,
  productSchema,
  registerSchema,
  siteContentUpdateSchema,
  updateOrderStatusSchema,
} from './src/server/validation.ts';
import type { OrderStatus } from './src/shared/types.ts';
import { isRegisteredPlugin } from './src/shared/pluginRegistry.ts';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const ASSETS_IMAGES_DIR = path.resolve(process.cwd(), 'src/assets/images');

async function bootstrapServer() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '4mb' }));
  app.use(cookieParser());

  // Static serving for uploaded media and generated product photography
  app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));
  app.use('/src/assets/images', express.static(ASSETS_IMAGES_DIR, { maxAge: '7d' }));

  // ==================== MAINTENANCE MODE ====================
  // Keep the admin dashboard and essential static assets accessible.
  app.use(async (req, res, next) => {
    const requestPath = req.path;

    const allowedPaths = [
      '/admin',
      '/api/health',
      '/api/auth/login',
      '/api/auth/logout',
      '/api/auth/me',
    ];

    const isAllowed =
      allowedPaths.some((item) =>
        requestPath === item || requestPath.startsWith(item + '/')
      ) ||
      requestPath.startsWith('/api/admin/') ||
      requestPath.startsWith('/uploads/') ||
      requestPath.startsWith('/src/assets/images/') ||
      /\\.(js|css|map|png|jpe?g|webp|svg|ico|woff2?|ttf|json)$/i.test(requestPath) ||
      requestPath.startsWith('/@vite/') ||
      requestPath.startsWith('/@react-refresh') ||
      requestPath.startsWith('/node_modules/');

    if (isAllowed) {
      next();
      return;
    }

    try {
      const settings = await storage.getAppSettings();

      if (!settings.storefrontVisible) {
        res.status(503);
        res.setHeader('Cache-Control', 'no-store');

        if (requestPath.startsWith('/api/')) {
          res.json({
            error: 'The storefront is currently unavailable.',
            storefrontVisible: false,
          });
          return;
        }

        res.type('html').send(`<!doctype html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>NUSAIFA SPICES - Store Temporarily Unavailable</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;
      padding:24px;background:#f0f5ed;color:#183d2b;
      font-family:Arial,sans-serif;text-align:center}
    main{max-width:520px;padding:36px 26px;background:#fff;
      border-radius:20px;box-shadow:0 12px 40px #183d2b16}
    h1{color:#17613d;margin:18px 0 12px}
    p{line-height:1.7;color:#52675a}
    .brand{font-weight:bold;letter-spacing:2px;color:#a47a27}
  </style>
</head>
<body>
  <main>
    <div class="brand">NUSAIFA SPICES</div>
    <h1>আমাদের স্টোর সাময়িকভাবে বন্ধ</h1>
    <p>আমরা শিগগিরই আবার ফিরে আসব। অনুগ্রহ করে পরে আবার ভিজিট করুন।</p>
    <hr>
    <h1>Our Store Is Temporarily Unavailable</h1>
    <p>We’ll be back soon. Please visit us again later.</p>
  </main>
</body>
</html>`);
        return;
      }

      if (!settings.maintenanceMode) {
        next();
        return;
      }

      res.status(503);
      res.setHeader('Cache-Control', 'no-store');

      if (requestPath.startsWith('/api/')) {
        res.json({
          error: 'The store is temporarily under maintenance. Please try again later.',
          maintenanceMode: true,
        });
        return;
      }

      res.type('html').send(`<!doctype html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>NUSAIFA SPICES - Maintenance</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;
      padding:24px;background:#f0f5ed;color:#183d2b;
      font-family:Arial,sans-serif;text-align:center}
    main{max-width:520px;padding:36px 26px;background:#fff;
      border-radius:20px;box-shadow:0 12px 40px #183d2b16}
    h1{color:#17613d;margin:0 0 12px}
    p{line-height:1.7;color:#52675a}
    .brand{font-weight:bold;letter-spacing:2px;color:#a47a27}
  </style>
</head>
<body>
  <main>
    <div class="brand">NUSAIFA SPICES</div>
    <h1>সাময়িক রক্ষণাবেক্ষণ চলছে</h1>
    <p>আমাদের ওয়েবসাইটে কিছু উন্নয়নমূলক কাজ চলছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।</p>
    <hr>
    <h1>We’ll be back soon!</h1>
    <p>Our store is temporarily undergoing maintenance. Please visit us again shortly.</p>
  </main>
</body>
</html>`);
    } catch {
      // A settings-store error must not lock customers out of the website.
      next();
    }
  });

  const uploadStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
      cb(null, `nusaifa-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safeExt}`);
    },
  });

  const upload = multer({
    storage: uploadStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPEG, PNG, and WebP images are permitted.'));
      }
    },
  });

  // ==================== PUBLIC & HEALTH ROUTES ====================

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      brand: 'NUSAIFA SPICES',
      engine: storage.isPostgresActive() ? 'postgresql' : 'local-persistent',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/payments/gateways', async (_req, res) => {
    try {
      const settings = await storage.getDeliverySettings();
      const bkashConfigured = Boolean(
        process.env.BKASH_APP_KEY && process.env.BKASH_APP_SECRET && process.env.BKASH_USERNAME
      );
      const nagadConfigured = Boolean(
        process.env.NAGAD_MERCHANT_ID && process.env.NAGAD_MERCHANT_PRIVATE_KEY
      );
      res.json({
        cod: { enabled: settings.codEnabled },
        bkash: {
          enabled: settings.bkashEnabled,
          configured: bkashConfigured,
          mode: process.env.BKASH_MODE || 'sandbox',
        },
        nagad: {
          enabled: settings.nagadEnabled,
          configured: nagadConfigured,
          mode: process.env.NAGAD_MODE || 'sandbox',
        },
      });
    } catch {
      res.status(500).json({ error: 'Failed to inspect payment gateways.' });
    }
  });

  app.get('/api/storefront/bootstrap', async (_req, res) => {
    try {
      const [categories, products, banners, deliverySettings, siteContent, appSettings] = await Promise.all([
        storage.listCategories(false),
        storage.listProducts(false),
        storage.listBanners(false),
        storage.getDeliverySettings(),
        storage.getSiteContent(),
        storage.getAppSettings(),
      ]);
      res.json({
        categories,
        products,
        banners,
        deliverySettings,
        siteContent,
        publicSettings: {
          checkoutEnabled: appSettings.checkoutEnabled,
          orderAcceptanceEnabled: appSettings.orderAcceptanceEnabled,
          customerLoginEnabled: appSettings.customerLoginEnabled,
          customerRegistrationEnabled: appSettings.customerRegistrationEnabled,
          wishlistEnabled: appSettings.wishlistEnabled,
        },
      });
    } catch (err) {
      console.error('Bootstrap error:', err);
      res.status(500).json({ error: 'Failed to load storefront catalog.' });
    }
  });

  app.get('/api/products', async (req, res) => {
    try {
      const products = await storage.listProducts(false);
      const q = String(req.query.q || '').trim().toLowerCase();
      const categoryId = String(req.query.categoryId || '').trim();
      const filtered = products.filter((p) => {
        if (categoryId && p.categoryId !== categoryId) return false;
        if (
          q &&
          !p.nameEn.toLowerCase().includes(q) &&
          !p.nameBn.toLowerCase().includes(q) &&
          !p.shortDescEn.toLowerCase().includes(q) &&
          !p.sku.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      });
      res.json(filtered);
    } catch {
      res.status(500).json({ error: 'Failed to load products.' });
    }
  });

  // ==================== AUTH ROUTES ====================

  app.post('/api/auth/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid registration data.' });
      return;
    }
    try {
      const appSettings = await storage.getAppSettings();
      if (!appSettings.customerRegistrationEnabled) {
        res.status(403).json({ error: 'Customer registration is currently disabled.' });
        return;
      }

      const existing = await storage.findUserByEmail(parsed.data.email);
      if (existing) {
        res.status(409).json({ error: 'An account with this email already exists.' });
        return;
      }
      const user = await storage.createUser({
        ...parsed.data,
        role: 'customer',
      });
      const token = signAuthToken(user);
      setAuthCookie(res, token);
      res.status(201).json({ user, token });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Registration failed.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Valid email and password are required.' });
      return;
    }
    try {
      const userRecord = await storage.findUserByEmail(parsed.data.email);
      if (!userRecord || !userRecord.isActive) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }
      if (userRecord.role === 'customer') {
        const settings = await storage.getAppSettings();
        if (!settings.customerLoginEnabled) {
          res.status(403).json({ error: 'Customer login is currently disabled.' });
          return;
        }
      }
      const valid = await verifyPassword(parsed.data.password, userRecord.passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }
      const { passwordHash: _ph, ...userPublic } = userRecord;
      const token = signAuthToken(userPublic);
      setAuthCookie(res, token);
      res.json({ user: userPublic, token });
    } catch {
      res.status(500).json({ error: 'Login failed.' });
    }
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearAuthCookie(res);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.findUserById(req.authUser!.sub);
      if (!user) {
        res.status(401).json({ error: 'Session user not found.' });
        return;
      }
      res.json({ user });
    } catch {
      res.status(500).json({ error: 'Failed to retrieve account.' });
    }
  });

  // ==================== ORDERS & TRACKING ====================

  app.post('/api/orders', attachOptionalAuth, async (req: AuthenticatedRequest, res) => {
    const orderSettings = await storage.getAppSettings();
    if (!orderSettings.checkoutEnabled) {
      res.status(403).json({ error: 'Checkout is currently disabled.' });
      return;
    }
    if (!orderSettings.orderAcceptanceEnabled) {
      res.status(403).json({ error: 'New order acceptance is currently disabled.' });
      return;
    }

    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid order payload.' });
      return;
    }
    try {
      const order = await storage.createOrder({
        userId: req.authUser?.sub ?? null,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        customerEmail: parsed.data.customerEmail || '',
        district: parsed.data.district,
        upazila: parsed.data.upazila,
        deliveryAddress: parsed.data.deliveryAddress,
        paymentMethod: parsed.data.paymentMethod,
        customerNote: parsed.data.customerNote || '',
        items: parsed.data.items,
      });
      res.status(201).json(order);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Could not place order.' });
    }
  });

  app.get('/api/orders/track', async (req, res) => {
    const orderNumber = String(req.query.orderNumber || '').trim();
    const phone = String(req.query.phone || '').trim();
    if (!orderNumber || !phone) {
      res.status(400).json({ error: 'Both Order Number and Phone Number are required to track.' });
      return;
    }
    try {
      const order = await storage.trackOrder(orderNumber, phone);
      if (!order) {
        res.status(404).json({ error: 'No matching order found for that Order Number and Phone.' });
        return;
      }
      res.json(order);
    } catch {
      res.status(500).json({ error: 'Order tracking lookup failed.' });
    }
  });

  app.get('/api/orders/my', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const orders = await storage.listOrders({ userId: req.authUser!.sub });
      res.json(orders);
    } catch {
      res.status(500).json({ error: 'Failed to load order history.' });
    }
  });

  // Customer-only Wishlist API
  app.get('/api/wishlist', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.authUser?.role !== 'customer') {
        res.status(403).json({ error: 'Customer access only.' });
        return;
      }
      const settings = await storage.getAppSettings();
      if (!settings.wishlistEnabled) {
        res.status(403).json({ error: 'Wishlist is currently disabled.' });
        return;
      }
      const products = await storage.listWishlistProducts(req.authUser.sub);
      res.json(products);
    } catch {
      res.status(500).json({ error: 'Failed to load wishlist.' });
    }
  });

  app.post('/api/wishlist/:productId', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.authUser?.role !== 'customer') {
        res.status(403).json({ error: 'Customer access only.' });
        return;
      }
      const settings = await storage.getAppSettings();
      if (!settings.wishlistEnabled) {
        res.status(403).json({ error: 'Wishlist is currently disabled.' });
        return;
      }
      const productId = String(req.params.productId || '');
      const product = (await storage.listProducts()).find((item) => item.id === productId);
      if (!product) {
        res.status(404).json({ error: 'Active product not found.' });
        return;
      }
      await storage.addWishlistItem(req.authUser.sub, productId);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Failed to add wishlist item.' });
    }
  });

  app.delete('/api/wishlist/:productId', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.authUser?.role !== 'customer') {
        res.status(403).json({ error: 'Customer access only.' });
        return;
      }
      const settings = await storage.getAppSettings();
      if (!settings.wishlistEnabled) {
        res.status(403).json({ error: 'Wishlist is currently disabled.' });
        return;
      }
      await storage.removeWishlistItem(req.authUser.sub, String(req.params.productId || ''));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Failed to remove wishlist item.' });
    }
  });

  app.post('/api/contact', async (req, res) => {
    try {
      const appSettings = await storage.getAppSettings();
      if (!appSettings.contactFormEnabled) {
        res.status(403).json({ error: 'Contact form is currently disabled.' });
        return;
      }
    } catch {
      res.status(500).json({ error: 'Unable to check contact form settings.' });
      return;
    }

    const parsed = contactMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid contact form data.' });
      return;
    }
    try {
      const saved = await storage.createContactMessage({
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || '',
        subject: parsed.data.subject,
        message: parsed.data.message,
      });
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 465),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: `"NUSAIFA SPICES" <${process.env.SMTP_USER}>`,
          to: process.env.CONTACT_NOTIFICATION_EMAIL || process.env.SMTP_USER,
          replyTo: parsed.data.email || undefined,
          subject: `New Contact Message: ${parsed.data.subject}`,
          text: [
            'New message received from NUSAIFA SPICES website.',
            '',
            `Name: ${parsed.data.name}`,
            `Phone: ${parsed.data.phone}`,
            `Email: ${parsed.data.email || 'Not provided'}`,
            `Subject: ${parsed.data.subject}`,
            '',
            'Message:',
            parsed.data.message,
          ].join('\\n'),
        });

        console.log('Contact notification email sent successfully.');
      } catch (emailError) {
        console.error('Contact notification email failed:', emailError);
      }

      res.status(201).json(saved);
    } catch {
      res.status(500).json({ error: 'Failed to submit inquiry.' });
    }
  });

  // ==================== PROTECTED ADMIN ROUTES ====================

  app.get('/api/admin/metrics', requireAdmin, async (_req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch {
      res.status(500).json({ error: 'Failed to load dashboard metrics.' });
    }
  });

  app.get('/api/admin/products', requireAdmin, async (_req, res) => {
    try {
      const products = await storage.listProducts(true);
      res.json(products);
    } catch {
      res.status(500).json({ error: 'Failed to list products.' });
    }
  });

  app.post('/api/admin/products', requireAdmin, async (req, res) => {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid product data.' });
      return;
    }
    try {
      const created = await storage.createProduct({
        ...parsed.data,
        discountPriceBdt: parsed.data.discountPriceBdt ?? null,
      });
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create product.' });
    }
  });

  app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
    const parsed = productSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid product update.' });
      return;
    }
    try {
      const updated = await storage.updateProduct(String(req.params.id), parsed.data);
      if (!updated) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update product.' });
    }
  });

  app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      const ok = await storage.deleteProduct(String(req.params.id));
      if (!ok) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }
      res.json({ ok: true });
    } catch {
      res.status(400).json({ error: 'Cannot delete product referenced by existing records.' });
    }
  });

  app.get('/api/admin/categories', requireAdmin, async (_req, res) => {
    try {
      const categories = await storage.listCategories(true);
      res.json(categories);
    } catch {
      res.status(500).json({ error: 'Failed to list categories.' });
    }
  });

  app.post('/api/admin/categories', requireAdmin, async (req, res) => {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid category data.' });
      return;
    }
    try {
      const cat = await storage.createCategory(parsed.data);
      res.status(201).json(cat);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create category.' });
    }
  });

  app.put('/api/admin/categories/:id', requireAdmin, async (req, res) => {
    const parsed = categorySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid category update.' });
      return;
    }
    try {
      const updated = await storage.updateCategory(String(req.params.id), parsed.data);
      if (!updated) {
        res.status(404).json({ error: 'Category not found.' });
        return;
      }
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update category.' });
    }
  });

  app.get('/api/admin/orders', requireAdmin, async (req, res) => {
    try {
      const status = req.query.status ? (String(req.query.status) as OrderStatus) : undefined;
      const orders = await storage.listOrders(status ? { status } : undefined);
      res.json(orders);
    } catch {
      res.status(500).json({ error: 'Failed to load orders.' });
    }
  });

  app.patch('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
    const parsed = updateOrderStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid status update.' });
      return;
    }
    try {
      const updated = await storage.updateOrderStatus(String(req.params.id), parsed.data);
      if (!updated) {
        res.status(404).json({ error: 'Order not found.' });
        return;
      }
      res.json(updated);
    } catch {
      res.status(500).json({ error: 'Failed to update order status.' });
    }
  });

  app.get('/api/admin/orders/export/csv', requireAdmin, async (_req, res) => {
    try {
      const orders = await storage.listOrders();
      const escapeCsv = (val: unknown) => {
        const str = String(val ?? '');
        return `"${str.replace(/"/g, '""')}"`;
      };
      const headers = [
        'Order Number',
        'Date',
        'Customer Name',
        'Phone',
        'Email',
        'District',
        'Upazila',
        'Address',
        'Delivery Zone',
        'Payment Method',
        'Payment Status',
        'Order Status',
        'Subtotal (BDT)',
        'Delivery Charge (BDT)',
        'Total (BDT)',
        'Items',
      ];
      const rows = orders.map((o) => [
        o.orderNumber,
        o.createdAt,
        o.customerName,
        o.customerPhone,
        o.customerEmail,
        o.district,
        o.upazila,
        o.deliveryAddress,
        o.deliveryZone,
        o.paymentMethod,
        o.paymentStatus,
        o.orderStatus,
        o.subtotalBdt,
        o.deliveryChargeBdt,
        o.totalBdt,
        o.items.map((i) => `${i.productNameEn} (${i.weightLabel}) x${i.quantity}`).join('; '),
      ]);
      const csv = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="nusaifa-orders-${Date.now()}.csv"`);
      res.send(csv);
    } catch {
      res.status(500).json({ error: 'Failed to export orders CSV.' });
    }
  });

  app.get('/api/admin/customers', requireAdmin, async (_req, res) => {
    try {
      const customers = await storage.listCustomers();
      res.json(customers);
    } catch {
      res.status(500).json({ error: 'Failed to list customers.' });
    }
  });

  app.put('/api/admin/delivery-settings', requireAdmin, async (req, res) => {
    const parsed = deliverySettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid delivery settings.' });
      return;
    }
    try {
      const updated = await storage.updateDeliverySettings(parsed.data);
      res.json(updated);
    } catch {
      res.status(500).json({ error: 'Failed to update delivery charges.' });
    }
  });

  app.get('/api/admin/app-settings', requireAdmin, async (_req, res) => {
    try {
      res.json(await storage.getAppSettings());
    } catch {
      res.status(500).json({ error: 'Failed to load application settings.' });
    }
  });

  app.put('/api/admin/app-settings', requireAdmin, async (req, res) => {
    const parsed = appSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid application settings.',
      });
      return;
    }
    try {
      res.json(await storage.updateAppSettings(parsed.data));
    } catch {
      res.status(500).json({ error: 'Failed to update application settings.' });
    }
  });

  app.get('/api/admin/banners', requireAdmin, async (_req, res) => {
    try {
      res.json(await storage.listBanners(true));
    } catch {
      res.status(500).json({ error: 'Failed to load banners.' });
    }
  });

  app.post('/api/admin/banners', requireAdmin, async (req, res) => {
    const parsed = bannerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid banner data.' });
      return;
    }
    try {
      const banner = await storage.createBanner(parsed.data);
      res.status(201).json(banner);
    } catch {
      res.status(500).json({ error: 'Failed to create banner.' });
    }
  });

  app.put('/api/admin/banners/:id', requireAdmin, async (req, res) => {
    const parsed = bannerSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid banner update.' });
      return;
    }
    try {
      const updated = await storage.updateBanner(String(req.params.id), parsed.data);
      if (!updated) {
        res.status(404).json({ error: 'Banner not found.' });
        return;
      }
      res.json(updated);
    } catch {
      res.status(500).json({ error: 'Failed to update banner.' });
    }
  });

  app.delete('/api/admin/banners/:id', requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteBanner(String(req.params.id));
      if (!deleted) {
        res.status(404).json({ error: 'Banner not found.' });
        return;
      }
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete banner.' });
    }
  });

  // ==================== PLUGIN CENTER API ====================

app.get('/api/admin/plugins', requireAdmin, async (_req, res) => {
  try {
    res.json(await storage.listPluginIntegrations());
  } catch {
    res.status(503).json({
      error: 'Plugin Center database migration is not installed yet.',
    });
  }
});

app.put('/api/admin/plugins/:pluginKey', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const pluginKey = String(req.params.pluginKey || '');
  if (!/^[a-z0-9-]{2,80}$/.test(pluginKey)) {
    res.status(400).json({ error: 'Invalid plugin key.' });
    return;
  }

  if (!isRegisteredPlugin(pluginKey)) {
    res.status(404).json({ error: 'Plugin is not registered.' });
    return;
  }

  const body = req.body || {};
  if (
    (body.enabled !== undefined && typeof body.enabled !== 'boolean') ||
    (body.settings !== undefined &&
      (typeof body.settings !== 'object' || body.settings === null || Array.isArray(body.settings)))
  ) {
    res.status(400).json({ error: 'Invalid plugin settings.' });
    return;
  }

  const settings = body.settings as Record<string, unknown> | undefined;
  const forbidden = settings
    ? Object.keys(settings).some((key) =>
        /secret|password|token|api.?key|private.?key/i.test(key)
      )
    : false;

  if (forbidden) {
    res.status(400).json({
      error: 'Credentials cannot be stored in Plugin Center settings.',
    });
    return;
  }

  try {
    const updated = await storage.updatePluginIntegration(
      pluginKey,
      { enabled: body.enabled, settings },
      req.authUser?.sub || null
    );
    res.json(updated);
  } catch {
    res.status(503).json({
      error: 'Plugin Center database migration is not installed yet.',
    });
  }
});

app.get('/api/admin/plugins/activity', requireAdmin, async (_req, res) => {
  try {
    res.json(await storage.listPluginActivityLogs(100));
  } catch {
    res.status(503).json({
      error: 'Plugin Center database migration is not installed yet.',
    });
  }
});

app.put('/api/admin/site-content', requireAdmin, async (req, res) => {
    const parsed = siteContentUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid site content payload.' });
      return;
    }
    try {
      const updated = await storage.updateSiteContent(parsed.data.items);
      res.json(updated);
    } catch {
      res.status(500).json({ error: 'Failed to update website content.' });
    }
  });

  app.get('/api/admin/messages', requireAdmin, async (_req, res) => {
    try {
      res.json(await storage.listContactMessages());
    } catch {
      res.status(500).json({ error: 'Failed to load inquiries.' });
    }
  });

  app.post('/api/admin/upload', requireAdmin, upload.single('image'), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No image file uploaded.' });
      return;
    }
    res.status(201).json({
      url: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
      size: req.file.size,
    });
  });

  app.get('/api/admin/backup/export', requireAdmin, async (_req, res) => {
    try {
      const snapshot = await storage.exportFullDatabase();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="nusaifa-spices-backup-${new Date().toISOString().slice(0, 10)}.json"`
      );
      res.send(JSON.stringify(snapshot, null, 2));
    } catch {
      res.status(500).json({ error: 'Failed to export database backup.' });
    }
  });

  app.post('/api/admin/backup/import', requireAdmin, async (req, res) => {
    try {
      await storage.importDatabaseBackup(req.body as DatabaseSnapshot);
      res.json({ ok: true, message: 'Database snapshot restored successfully.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Invalid backup snapshot.' });
    }
  });

  // ==================== VITE / STATIC SPA SERVING ====================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `NUSAIFA SPICES server listening on http://0.0.0.0:${PORT} (${
        storage.isPostgresActive() ? 'PostgreSQL' : 'Local Persistent Store'
      })`
    );
  });
}

bootstrapServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
