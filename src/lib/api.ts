import type {
  Category,
  ContactMessage,
  CustomerSummary,
  DashboardMetrics,
  DeliverySettings,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
  PromotionalBanner,
  PluginIntegration,
  PluginActivityLog,
  SiteContentItem,
  UserPublic,
} from '../shared/types.ts';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();

    if (!res.ok) {
      const message =
        typeof data === 'object' && data && 'error' in data
          ? String((data as { error: string }).error)
          : `Request failed (${res.status})`;
      throw new Error(message);
    }

    return data as T;
  }

  // Storefront
  getBootstrap() {
    return this.request<{
      categories: Category[];
      products: Product[];
      banners: PromotionalBanner[];
      deliverySettings: DeliverySettings;
      siteContent: SiteContentItem[];
    }>('/api/storefront/bootstrap');
  }

  getPaymentGateways() {
    return this.request<{
      cod: { enabled: boolean };
      bkash: { enabled: boolean; configured: boolean; mode: string };
      nagad: { enabled: boolean; configured: boolean; mode: string };
    }>('/api/payments/gateways');
  }

  // Auth
  register(payload: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    district?: string;
    upazila?: string;
    address?: string;
  }) {
    return this.request<{ user: UserPublic; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  login(payload: { email: string; password: string }) {
    return this.request<{ user: UserPublic; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  logout() {
    return this.request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
  }

  me() {
    return this.request<{ user: UserPublic }>('/api/auth/me');
  }

  // Orders & Contact
  placeOrder(payload: {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    district: string;
    upazila: string;
    deliveryAddress: string;
    paymentMethod: PaymentMethod;
    customerNote?: string;
    items: Array<{ productId: string; quantity: number }>;
  }) {
    return this.request<Order>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  trackOrder(orderNumber: string, phone: string) {
    const params = new URLSearchParams({ orderNumber, phone });
    return this.request<Order>(`/api/orders/track?${params.toString()}`);
  }

  myOrders() {
    return this.request<Order[]>('/api/orders/my');
  }

  submitContact(payload: {
    name: string;
    phone: string;
    email?: string;
    subject: string;
    message: string;
  }) {
    return this.request<ContactMessage>('/api/contact', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Admin
  adminMetrics() {
    return this.request<DashboardMetrics>('/api/admin/metrics');
  }

  adminListProducts() {
    return this.request<Product[]>('/api/admin/products');
  }

  adminCreateProduct(payload: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.request<Product>('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  adminUpdateProduct(id: string, payload: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>) {
    return this.request<Product>(`/api/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  adminDeleteProduct(id: string) {
    return this.request<{ ok: boolean }>(`/api/admin/products/${id}`, { method: 'DELETE' });
  }

  adminListCategories() {
    return this.request<Category[]>('/api/admin/categories');
  }

  adminCreateCategory(payload: Omit<Category, 'id' | 'createdAt'>) {
    return this.request<Category>('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  adminUpdateCategory(id: string, payload: Partial<Omit<Category, 'id' | 'createdAt'>>) {
    return this.request<Category>(`/api/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  adminListOrders(status?: OrderStatus) {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<Order[]>(`/api/admin/orders${q}`);
  }

  adminUpdateOrderStatus(
    id: string,
    payload: {
      orderStatus: OrderStatus;
      paymentStatus?: PaymentStatus;
      adminNote?: string;
      notificationMessageEn?: string;
      notificationMessageBn?: string;
    }
  ) {
    return this.request<Order>(`/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  adminListCustomers() {
    return this.request<CustomerSummary[]>('/api/admin/customers');
  }

  adminUpdateDeliverySettings(payload: Omit<DeliverySettings, 'updatedAt'>) {
    return this.request<DeliverySettings>('/api/admin/delivery-settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  adminListBanners() {
    return this.request<PromotionalBanner[]>('/api/admin/banners');
  }

  adminCreateBanner(payload: Omit<PromotionalBanner, 'id' | 'createdAt'>) {
    return this.request<PromotionalBanner>('/api/admin/banners', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  adminUpdateBanner(
    id: string,
    payload: Partial<Omit<PromotionalBanner, 'id' | 'createdAt'>>
  ) {
    return this.request<PromotionalBanner>(`/api/admin/banners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  adminDeleteBanner(id: string) {
    return this.request<{ ok: boolean }>(`/api/admin/banners/${id}`, { method: 'DELETE' });
  }

  adminListPluginIntegrations() {
    return this.request<PluginIntegration[]>('/api/admin/plugins');
  }

  adminUpdatePlugin(
    pluginKey: string,
    payload: { enabled?: boolean; settings?: Record<string, unknown> }
  ) {
    return this.request<PluginIntegration>(
      `/api/admin/plugins/${encodeURIComponent(pluginKey)}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    );
  }

  adminListPluginActivity() {
    return this.request<PluginActivityLog[]>('/api/admin/plugins/activity');
  }

  adminUpdateSiteContent(items: Array<{
    key: string;
    valueEn: string;
    valueBn: string;
    textColorEn?: string;
    textColorBn?: string;
    backgroundColorEn?: string;
    backgroundColorBn?: string;
  }>) {
    return this.request<SiteContentItem[]>('/api/admin/site-content', {
      method: 'PUT',
      body: JSON.stringify({ items }),
    });
  }

  adminListMessages() {
    return this.request<ContactMessage[]>('/api/admin/messages');
  }

  async adminUploadImage(file: File): Promise<{ url: string; filename: string; size: number }> {
    const form = new FormData();
    form.append('image', file);
    return this.request<{ url: string; filename: string; size: number }>('/api/admin/upload', {
      method: 'POST',
      body: form,
    });
  }

  async adminDownloadCsv(): Promise<void> {
    const res = await fetch('/api/admin/orders/export/csv', { credentials: 'include' });
    if (!res.ok) throw new Error('CSV export failed.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nusaifa-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async adminDownloadBackup(): Promise<void> {
    const res = await fetch('/api/admin/backup/export', { credentials: 'include' });
    if (!res.ok) throw new Error('Backup export failed.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nusaifa-spices-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  adminRestoreBackup(snapshot: unknown) {
    return this.request<{ ok: boolean; message: string }>('/api/admin/backup/import', {
      method: 'POST',
      body: JSON.stringify(snapshot),
    });
  }
}

export const api = new ApiClient();
