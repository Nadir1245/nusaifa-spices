import { z } from 'zod';

export const bdPhoneRegex = /^(\+?88)?01[3-9]\d{8}$/;

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(190),
  phone: z.string().trim().regex(bdPhoneRegex, 'Valid Bangladeshi mobile number required (01XXXXXXXXX)'),
  password: z.string().min(6).max(128),
  district: z.string().trim().max(100).optional().default(''),
  upazila: z.string().trim().max(100).optional().default(''),
  address: z.string().trim().max(400).optional().default(''),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(190),
  password: z.string().min(1).max(128),
});

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(2).max(160),
  customerPhone: z.string().trim().regex(bdPhoneRegex, 'Valid Bangladeshi mobile number required (01XXXXXXXXX)'),
  customerEmail: z.string().trim().email().max(190).optional().or(z.literal('')),
  district: z.string().trim().min(2).max(100),
  upazila: z.string().trim().min(2).max(100),
  deliveryAddress: z.string().trim().min(5).max(500),
  paymentMethod: z.enum(['cod', 'bkash', 'nagad']),
  customerNote: z.string().trim().max(500).optional().default(''),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(100),
      })
    )
    .min(1),
});

export const updateOrderStatusSchema = z.object({
  orderStatus: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
  paymentStatus: z.enum(['unpaid', 'pending_gateway', 'paid', 'refunded']).optional(),
  adminNote: z.string().trim().max(500).optional(),
  notificationMessageEn: z.string().trim().max(300).optional(),
  notificationMessageBn: z.string().trim().max(300).optional(),
});

export const productSchema = z.object({
  categoryId: z.string().min(1),
  sku: z.string().trim().min(2).max(64),
  slug: z.string().trim().min(2).max(160),
  nameEn: z.string().trim().min(2).max(200),
  nameBn: z.string().trim().min(1).max(240),
  shortDescEn: z.string().trim().max(320).optional().default(''),
  shortDescBn: z.string().trim().max(360).optional().default(''),
  descriptionEn: z.string().trim().max(3000).optional().default(''),
  descriptionBn: z.string().trim().max(3000).optional().default(''),
  originEn: z.string().trim().max(160).optional().default('Bangladesh'),
  originBn: z.string().trim().max(160).optional().default('বাংলাদেশ'),
  weightLabel: z.string().trim().min(1).max(60),
  priceBdt: z.number().min(0).max(1000000),
  discountPriceBdt: z.number().min(0).max(1000000).nullable().optional(),
  stockQty: z.number().int().min(0).max(1000000),
  imageUrl: z.string().trim().min(1).max(1000),
  galleryUrls: z.array(z.string().trim().max(1000)).optional().default([]),
  isFeatured: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),

  // SEO metadata
  seoTitleEn: z.string().trim().max(200).optional().default(''),
  seoTitleBn: z.string().trim().max(200).optional().default(''),
  seoDescriptionEn: z.string().trim().max(320).optional().default(''),
  seoDescriptionBn: z.string().trim().max(320).optional().default(''),
  focusKeywords: z.string().trim().max(500).optional().default(''),
  imageAltEn: z.string().trim().max(250).optional().default(''),
  imageAltBn: z.string().trim().max(250).optional().default(''),
});

export const categorySchema = z.object({
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/),
  nameEn: z.string().trim().min(2).max(120),
  nameBn: z.string().trim().min(1).max(160),
  descriptionEn: z.string().trim().max(500).optional().default(''),
  descriptionBn: z.string().trim().max(500).optional().default(''),
  sortOrder: z.number().int().min(0).max(999).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const deliverySettingsSchema = z.object({
  insideDhakaBdt: z.number().min(0).max(5000),
  subDhakaBdt: z.number().min(0).max(5000),
  outsideDhakaBdt: z.number().min(0).max(5000),
  freeDeliveryThresholdBdt: z.number().min(0).max(100000),
  codEnabled: z.boolean(),
  bkashEnabled: z.boolean(),
  nagadEnabled: z.boolean(),
});

export const bannerSchema = z.object({
  titleEn: z.string().trim().min(2).max(200),
  titleBn: z.string().trim().min(1).max(240),
  subtitleEn: z.string().trim().max(320).optional().default(''),
  subtitleBn: z.string().trim().max(360).optional().default(''),
  ctaLabelEn: z.string().trim().min(1).max(80),
  ctaLabelBn: z.string().trim().min(1).max(100),
  targetCategorySlug: z.string().trim().max(100).optional().default('all'),
  imageUrl: z.string().trim().min(1).max(1000),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).max(999).optional().default(0),
});

export const siteContentUpdateSchema = z.object({
  items: z.array(
    z.object({
      key: z.string().trim().min(1).max(80),
      valueEn: z.string().max(10000),
      valueBn: z.string().max(10000),
      textColorEn: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#141A17'),
      textColorBn: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#141A17'),
      backgroundColorEn: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#FFFFFF'),
      backgroundColorBn: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#FFFFFF'),
    })
  ),
});

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().regex(bdPhoneRegex, 'Valid Bangladeshi mobile number required'),
  email: z.string().trim().email().max(190).optional().or(z.literal('')),
  subject: z.string().trim().min(2).max(200),
  message: z.string().trim().min(5).max(3000),
});
