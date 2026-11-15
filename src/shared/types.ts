export type UserRole = 'customer' | 'admin';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'cod' | 'bkash' | 'nagad';
export type PaymentStatus = 'unpaid' | 'pending_gateway' | 'paid' | 'refunded';
export type DeliveryZone = 'inside_dhaka' | 'sub_dhaka' | 'outside_dhaka';
export type Language = 'en' | 'bn';

export interface UserPublic {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  district?: string;
  upazila?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  slug: string;
  nameEn: string;
  nameBn: string;
  descriptionEn: string;
  descriptionBn: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  categoryId: string;
  sku: string;
  slug: string;
  nameEn: string;
  nameBn: string;
  shortDescEn: string;
  shortDescBn: string;
  descriptionEn: string;
  descriptionBn: string;
  originEn: string;
  originBn: string;
  weightLabel: string;
  priceBdt: number;
  discountPriceBdt: number | null;
  stockQty: number;
  imageUrl: string;
  galleryUrls: string[];
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeliverySettings {
  insideDhakaBdt: number;
  subDhakaBdt: number;
  outsideDhakaBdt: number;
  freeDeliveryThresholdBdt: number;
  codEnabled: boolean;
  bkashEnabled: boolean;
  nagadEnabled: boolean;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  productNameEn: string;
  productNameBn: string;
  sku: string;
  weightLabel: string;
  unitPriceBdt: number;
  quantity: number;
  lineTotalBdt: number;
  imageUrl: string;
}

export interface OrderNotification {
  id: string;
  orderId: string;
  status: OrderStatus;
  messageEn: string;
  messageBn: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  district: string;
  upazila: string;
  deliveryAddress: string;
  deliveryZone: DeliveryZone;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  subtotalBdt: number;
  deliveryChargeBdt: number;
  discountBdt: number;
  totalBdt: number;
  customerNote: string;
  adminNote: string;
  items: OrderItem[];
  notifications: OrderNotification[];
  createdAt: string;
  updatedAt: string;
}

export interface PromotionalBanner {
  id: string;
  titleEn: string;
  titleBn: string;
  subtitleEn: string;
  subtitleBn: string;
  ctaLabelEn: string;
  ctaLabelBn: string;
  targetCategorySlug: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface SiteContentItem {
  key: string;
  valueEn: string;
  valueBn: string;
  updatedAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  isResolved: boolean;
  createdAt: string;
}

export interface CustomerSummary extends UserPublic {
  orderCount: number;
  totalSpentBdt: number;
}

export interface DashboardMetrics {
  totalOrders: number;
  totalSalesBdt: number;
  totalCustomers: number;
  pendingOrders: number;
  lowStockProducts: number;
  codOrders: number;
  revenueByCategory: Array<{
    categoryNameEn: string;
    categoryNameBn: string;
    revenueBdt: number;
    unitsSold: number;
  }>;
  recentOrders: Order[];
}

export interface CartItem {
  productId: string;
  quantity: number;
}
