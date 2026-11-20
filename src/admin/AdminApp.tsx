import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Database,
  Download,
  Edit3,
  FileText,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Package,
  Puzzle,
  Settings,
  Plus,
  ShoppingCart,
  Trash2,
  Truck,
  Upload,
  Users,
  X,
} from 'lucide-react';
import type {
  Category,
  ContactMessage,
  CustomerSummary,
  DashboardMetrics,
  DeliverySettings,
  AppSettings,
  Order,
  OrderStatus,
  Product,
  PromotionalBanner,
  SiteContentItem,
  UserPublic,
  PluginIntegration,
  PluginActivityLog,
} from '../shared/types.ts';
import { api } from '../lib/api.ts';
import { formatBdt, ORDER_STATUS_LABELS } from '../lib/i18n.ts';
import { PLUGIN_REGISTRY } from '../shared/pluginRegistry.ts';

type AdminTab =
  | 'overview'
  | 'products'
  | 'categories'
  | 'orders'
  | 'customers'
  | 'delivery'
  | 'cms'
  | 'plugins'
  | 'control'
  | 'seo'
  | 'reports';

interface AdminAppProps {
  user: UserPublic | null;
  onAuthChange: (user: UserPublic | null) => void;
  onExitAdmin: () => void;
  onStorefrontUpdated: () => Promise<void>;
}

export const AdminApp: React.FC<AdminAppProps> = ({
  user,
  onAuthChange,
  onExitAdmin,
  onStorefrontUpdated,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [tab, setTab] = useState<AdminTab>('overview');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContentItem[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [delivery, setDelivery] = useState<DeliverySettings | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [appSettingsSaving, setAppSettingsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [pluginIntegrations, setPluginIntegrations] = useState<PluginIntegration[]>([]);
  const [pluginActivity, setPluginActivity] = useState<PluginActivityLog[]>([]);
  const [pluginActivityError, setPluginActivityError] = useState('');
  const [pluginLoading, setPluginLoading] = useState(false);
  const [pluginError, setPluginError] = useState('');
  const [pluginSaving, setPluginSaving] = useState<string | null>(null);

  // Product modal state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState({
    categoryId: '',
    sku: '',
    slug: '',
    nameEn: '',
    nameBn: '',
    shortDescEn: '',
    shortDescBn: '',
    descriptionEn: '',
    descriptionBn: '',
    originEn: 'Bangladesh',
    originBn: 'বাংলাদেশ',
    weightLabel: '250g',
    priceBdt: 250,
    discountPriceBdt: '' as string | number,
    stockQty: 50,
    imageUrl: '/src/assets/images/product_turmeric_powder_1794680615609.jpg',
    isFeatured: true,
    isActive: true,
    seoTitleEn: '',
    seoTitleBn: '',
    seoDescriptionEn: '',
    seoDescriptionBn: '',
    focusKeywords: '',
    imageAltEn: '',
    imageAltBn: '',
  });

  // Order filter & modal
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderUpdateStatus, setOrderUpdateStatus] = useState<OrderStatus>('confirmed');
  const [orderAdminNote, setOrderAdminNote] = useState('');
  const [orderNotifEn, setOrderNotifEn] = useState('');
  const [orderNotifBn, setOrderNotifBn] = useState('');

  // Category quick form
  const [catForm, setCatForm] = useState({
    slug: '',
    nameEn: '',
    nameBn: '',
    descriptionEn: '',
    descriptionBn: '',
    sortOrder: 6,
  });

  // Banner quick form
  const [bannerForm, setBannerForm] = useState({
    titleEn: '',
    titleBn: '',
    subtitleEn: '',
    subtitleBn: '',
    ctaLabelEn: 'Explore Harvest',
    ctaLabelBn: 'সংগ্রহ দেখুন',
    targetCategorySlug: 'all',
    imageUrl: '/src/assets/images/hero_nusaifa_spices_1794680614693.jpg',
  });

  const isAdmin = user?.role === 'admin';

  const loadAllAdminData = async () => {
    try {
      const [m, prods, cats, ords, custs, bans, msgs, boot, appSettingsData] = await Promise.all([
        api.adminMetrics(),
        api.adminListProducts(),
        api.adminListCategories(),
        api.adminListOrders(),
        api.adminListCustomers(),
        api.adminListBanners(),
        api.adminListMessages(),
        api.getBootstrap(),
        api.adminGetAppSettings(),
      ]);
      setMetrics(m);
      setProducts(prods);
      setCategories(cats);
      setOrders(ords);
      setCustomers(custs);
      setBanners(bans);
      setMessages(msgs);
      setDelivery(boot.deliverySettings);
      setAppSettings(appSettingsData);
      const defaultHomeContent: SiteContentItem[] = [
        {
          key: 'homepage_tagline',
          valueEn: 'Natural Spices · Organic Food · Herbal Wellness',
          valueBn: 'প্রাকৃতিক মসলা · অর্গানিক খাদ্য · ভেষজ সংগ্রহ',
          updatedAt: new Date().toISOString(),
        },
        {
          key: 'catalog_title',
          valueEn: 'Our Selected Collection',
          valueBn: 'আমাদের নির্বাচিত পণ্যসমূহ',
          updatedAt: new Date().toISOString(),
        },
        {
          key: 'catalog_subtitle',
          valueEn: 'Small-batch botanicals priced in BDT (৳) with nationwide Cash on Delivery',
          valueBn: 'বিশ্বস্ত প্রস্তুতকারকের মূল সিল ও প্যাকেটে মসলা ও প্রাকৃতিক খাদ্যপণ্য অর্ডার করুন।',
          updatedAt: new Date().toISOString(),
        },
        {
          key: 'social_facebook',
          valueEn: 'https://www.facebook.com/share/1JLYt6cdZQ/',
          valueBn: 'https://www.facebook.com/share/1JLYt6cdZQ/',
          updatedAt: new Date().toISOString(),
        },
        ...['whatsapp', 'instagram', 'youtube', 'tiktok'].map((platform) => ({
          key: `social_${platform}`,
          valueEn: '',
          valueBn: '',
          updatedAt: new Date().toISOString(),
        })),
      ];
      const mergedSiteContent = [...boot.siteContent];
      defaultHomeContent.forEach((item) => {
        if (!mergedSiteContent.some((existing) => existing.key === item.key)) {
          mergedSiteContent.push(item);
        }
      });
      setSiteContent(mergedSiteContent);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load admin data.');
    }
  };

  const updateAppSetting = async (
    key:
      | 'maintenanceMode'
      | 'customerRegistrationEnabled'
      | 'contactFormEnabled'
      | 'storefrontVisible'
      | 'checkoutEnabled'
      | 'orderAcceptanceEnabled'
      | 'customerLoginEnabled'
      | 'wishlistEnabled'
      | 'couponSystemEnabled'
      | 'productReviewsEnabled'
      | 'orderTrackingEnabled'
      | 'inventoryManagementEnabled',
    value: boolean
  ) => {
    if (!appSettings || appSettingsSaving) return;

    setAppSettingsSaving(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const updated = await api.adminUpdateAppSettings({
        maintenanceMode: key === 'maintenanceMode' ? value : appSettings.maintenanceMode,
        customerRegistrationEnabled: key === 'customerRegistrationEnabled' ? value : appSettings.customerRegistrationEnabled,
        contactFormEnabled: key === 'contactFormEnabled' ? value : appSettings.contactFormEnabled,
        storefrontVisible: key === 'storefrontVisible' ? value : appSettings.storefrontVisible,
        checkoutEnabled: key === 'checkoutEnabled' ? value : appSettings.checkoutEnabled,
        orderAcceptanceEnabled: key === 'orderAcceptanceEnabled' ? value : appSettings.orderAcceptanceEnabled,
        customerLoginEnabled: key === 'customerLoginEnabled' ? value : appSettings.customerLoginEnabled,
        wishlistEnabled: key === 'wishlistEnabled' ? value : appSettings.wishlistEnabled,
        couponSystemEnabled: key === 'couponSystemEnabled' ? value : appSettings.couponSystemEnabled,
        productReviewsEnabled: key === 'productReviewsEnabled' ? value : appSettings.productReviewsEnabled,
        orderTrackingEnabled: key === 'orderTrackingEnabled' ? value : appSettings.orderTrackingEnabled,
        inventoryManagementEnabled: key === 'inventoryManagementEnabled' ? value : appSettings.inventoryManagementEnabled,
      });

      setAppSettings(updated);
      setStatusMessage('Application settings saved successfully.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save application settings.');
    } finally {
      setAppSettingsSaving(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAllAdminData();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    setPluginLoading(true);
    api.adminListPluginIntegrations()
      .then((items) => {
        setPluginIntegrations(items);
        setPluginError('');
      })
      .catch(() => {
        setPluginError('Plugin storage is not ready yet. Complete the approved database migration first.');
      })
      .finally(() => setPluginLoading(false));
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    api.adminListPluginActivity()
      .then((items) => {
        setPluginActivity(items);
        setPluginActivityError('');
      })
      .catch((err: any) => {
        setPluginActivityError(err.message || 'Activity log could not be loaded.');
      });
  }, [isAdmin]);

  const notify = (msg: string) => {
    setStatusMessage(msg);
    setErrorMessage('');
    window.setTimeout(() => setStatusMessage(''), 3500);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await api.login({ email, password });
      if (res.user.role !== 'admin') {
        await api.logout();
        setAuthError('Access denied: administrator role required.');
        return;
      }
      api.setToken(res.token);
      onAuthChange(res.user);
    } catch (err: any) {
      setAuthError(err.message || 'Invalid credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    api.setToken(null);
    onAuthChange(null);
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onUploaded: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.adminUploadImage(file);
      onUploaded(res.url);
      notify('Image uploaded successfully.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Image upload failed.');
    }
  };

  const openNewProductModal = () => {
    setEditingProduct(null);
    setProdForm({
      categoryId: categories[0]?.id || '',
      sku: `NS-${Date.now().toString().slice(-5)}`,
      slug: '',
      nameEn: '',
      nameBn: '',
      shortDescEn: '',
      shortDescBn: '',
      descriptionEn: '',
      descriptionBn: '',
      originEn: 'Bangladesh',
      originBn: 'বাংলাদেশ',
      weightLabel: '250g',
      priceBdt: 350,
      discountPriceBdt: '',
      stockQty: 50,
      imageUrl: '/src/assets/images/product_turmeric_powder_1794680615609.jpg',
      isFeatured: false,
      isActive: true,
      seoTitleEn: '',
      seoTitleBn: '',
      seoDescriptionEn: '',
      seoDescriptionBn: '',
      focusKeywords: '',
      imageAltEn: '',
      imageAltBn: '',
    });
    setProductModalOpen(true);
  };

  const openEditProductModal = (p: Product) => {
    setEditingProduct(p);
    setProdForm({
      categoryId: p.categoryId,
      sku: p.sku,
      slug: p.slug,
      nameEn: p.nameEn,
      nameBn: p.nameBn,
      shortDescEn: p.shortDescEn,
      shortDescBn: p.shortDescBn,
      descriptionEn: p.descriptionEn,
      descriptionBn: p.descriptionBn,
      originEn: p.originEn,
      originBn: p.originBn,
      weightLabel: p.weightLabel,
      priceBdt: p.priceBdt,
      discountPriceBdt: p.discountPriceBdt ?? '',
      stockQty: p.stockQty,
      imageUrl: p.imageUrl,
      isFeatured: p.isFeatured,
      isActive: p.isActive,
      seoTitleEn: p.seoTitleEn || '',
      seoTitleBn: p.seoTitleBn || '',
      seoDescriptionEn: p.seoDescriptionEn || '',
      seoDescriptionBn: p.seoDescriptionBn || '',
      focusKeywords: p.focusKeywords || '',
      imageAltEn: p.imageAltEn || '',
      imageAltBn: p.imageAltBn || '',
    });
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const computedSlug =
      prodForm.slug.trim() ||
      prodForm.nameEn
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const payload = {
      ...prodForm,
      slug: computedSlug,
      priceBdt: Number(prodForm.priceBdt),
      discountPriceBdt:
        prodForm.discountPriceBdt === '' ? null : Number(prodForm.discountPriceBdt),
      stockQty: Number(prodForm.stockQty),
      galleryUrls: [prodForm.imageUrl],
    };
    try {
      if (editingProduct) {
        await api.adminUpdateProduct(editingProduct.id, payload);
        notify('Product updated.');
      } else {
        await api.adminCreateProduct(payload);
        notify('Product created.');
      }
      setProductModalOpen(false);
      await loadAllAdminData();
      await onStorefrontUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not save product.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await api.adminDeleteProduct(id);
      notify('Product removed.');
      await loadAllAdminData();
      await onStorefrontUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Delete failed.');
    }
  };

  const handleUpdateOrderStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      const updated = await api.adminUpdateOrderStatus(selectedOrder.id, {
        orderStatus: orderUpdateStatus,
        adminNote: orderAdminNote,
        notificationMessageEn: orderNotifEn || undefined,
        notificationMessageBn: orderNotifBn || undefined,
      });
      setSelectedOrder(updated);
      notify(`Order #${updated.orderNumber} updated to ${updated.orderStatus}.`);
      await loadAllAdminData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update order.');
    }
  };

  const handleSaveDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delivery) return;
    try {
      await api.adminUpdateDeliverySettings({
        insideDhakaBdt: Number(delivery.insideDhakaBdt),
        subDhakaBdt: Number(delivery.subDhakaBdt),
        outsideDhakaBdt: Number(delivery.outsideDhakaBdt),
        freeDeliveryThresholdBdt: Number(delivery.freeDeliveryThresholdBdt),
        codEnabled: delivery.codEnabled,
        bkashEnabled: delivery.bkashEnabled,
        nagadEnabled: delivery.nagadEnabled,
      });
      notify('Delivery charges and payment settings updated.');
      await onStorefrontUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not update delivery settings.');
    }
  };

  const handleSaveSiteContent = async () => {
    try {
      await api.adminUpdateSiteContent(
        siteContent.map((s) => ({
          key: s.key,
          valueEn: s.valueEn,
          valueBn: s.valueBn,
          textColorEn: s.textColorEn ?? '#141A17',
          textColorBn: s.textColorBn ?? '#141A17',
          backgroundColorEn: s.backgroundColorEn ?? '#FFFFFF',
          backgroundColorBn: s.backgroundColorBn ?? '#FFFFFF',
        }))
      );
      notify('Website content saved.');
      await onStorefrontUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not save site content.');
    }
  };

  const handleRestoreBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const confirmed = window.confirm(
        'WARNING: This will replace the current store database with the selected backup. Existing users, products, categories, orders and settings may be replaced. Continue only if this is the correct backup.'
      );

      if (!confirmed) return;

      await api.adminRestoreBackup(parsed);
      notify('Database snapshot restored successfully.');
      await loadAllAdminData();
      await onStorefrontUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid backup JSON file.');
    } finally {
      input.value = '';
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-[#E5E0D5] rounded-2xl p-8 space-y-6 shadow-sm">
          <div>
            <button
              type="button"
              onClick={onExitAdmin}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#075B42] hover:underline mb-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Storefront</span>
            </button>
            <h1 className="font-display text-3xl font-bold text-[#075B42]">NUSAIFA SPICES</h1>
            <p className="text-sm text-[#59645F] mt-1">
              Administrator Control Plane · Role-Based Access
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
              {authError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#2C3531] mb-1">
                Administrator Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@nusaifaspices.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2C3531] mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 rounded-lg bg-[#075B42] text-white text-sm font-semibold hover:bg-[#054431]"
            >
              {authLoading ? 'Verifying...' : 'Sign In to Admin Dashboard'}
            </button>
          </form>

          <p className="text-[11px] text-[#59645F] leading-relaxed">
            Admin credentials are verified server-side using bcrypt hashes and environment
            variables (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).
          </p>
        </div>
      </div>
    );
  }

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'products', label: 'Products', icon: <Package className="w-4 h-4" /> },
    { id: 'categories', label: 'Categories', icon: <Layers className="w-4 h-4" /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
    { id: 'delivery', label: 'Delivery & Pay', icon: <Truck className="w-4 h-4" /> },
    { id: 'cms', label: 'Banners & CMS', icon: <FileText className="w-4 h-4" /> },
    { id: 'plugins', label: 'Plugin Center', icon: <Puzzle className="w-4 h-4" /> },
    { id: 'control', label: 'Advanced Control Center', icon: <Settings className="w-4 h-4" /> },
    { id: 'seo', label: 'SEO Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports & Backup', icon: <Database className="w-4 h-4" /> },
  ];

  const filteredOrders =
    orderStatusFilter === 'all'
      ? orders
      : orders.filter((o) => o.orderStatus === orderStatusFilter);

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col lg:flex-row">
      {/* Sidebar (260px) */}
      <aside className="w-full lg:w-[260px] bg-[#075B42] text-white flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-white/15 flex items-center justify-between">
          <div>
            <span className="font-display text-2xl font-bold tracking-tight block">
              NUSAIFA SPICES
            </span>
            <span className="text-[11px] text-[#D4AF37]">Admin Operations</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex lg:flex-col gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                tab === item.id
                  ? 'bg-white text-[#075B42]'
                  : 'text-white/85 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/15 space-y-2">
          <button
            type="button"
            onClick={onExitAdmin}
            className="w-full flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>View Customer Storefront</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-white/80 hover:text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-[#E5E0D5] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-[#59645F]">
            <span>Admin</span> <span className="mx-1.5">/</span>{' '}
            <span className="font-semibold text-[#141A17] capitalize">{tab}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#59645F]">{user.email}</span>
            <button
              type="button"
              onClick={() => api.adminDownloadCsv()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D6D0C4] text-xs font-semibold text-[#141A17] hover:bg-[#F8F6F1] whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Orders CSV</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {statusMessage && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900">
              {statusMessage}
            </div>
          )}
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-900">
              {errorMessage}
            </div>
          )}

          {/* TAB: OVERVIEW */}
          {tab === 'overview' && metrics && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E5E0D5] rounded-xl p-5">
                  <span className="text-xs text-[#59645F]">Total Sales</span>
                  <p className="text-2xl font-semibold text-[#075B42] font-mono-tabular mt-1">
                    {formatBdt(metrics.totalSalesBdt)}
                  </p>
                </div>
                <div className="bg-white border border-[#E5E0D5] rounded-xl p-5">
                  <span className="text-xs text-[#59645F]">Total Orders</span>
                  <p className="text-2xl font-semibold text-[#141A17] font-mono-tabular mt-1">
                    {metrics.totalOrders}
                  </p>
                </div>
                <div className="bg-white border border-[#E5E0D5] rounded-xl p-5">
                  <span className="text-xs text-[#59645F]">Registered Customers</span>
                  <p className="text-2xl font-semibold text-[#141A17] font-mono-tabular mt-1">
                    {metrics.totalCustomers}
                  </p>
                </div>
                <div className="bg-white border border-[#E5E0D5] rounded-xl p-5">
                  <span className="text-xs text-[#59645F]">Pending Dispatch · Low Stock</span>
                  <p className="text-2xl font-semibold text-[#8E6F16] font-mono-tabular mt-1">
                    {metrics.pendingOrders} · {metrics.lowStockProducts}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-white border border-[#E5E0D5] rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[#141A17]">Revenue by Category</h2>
                    <BarChart3 className="w-4 h-4 text-[#075B42]" />
                  </div>
                  <div className="space-y-3">
                    {metrics.revenueByCategory.map((cat) => {
                      const pct =
                        metrics.totalSalesBdt > 0
                          ? Math.min(100, Math.round((cat.revenueBdt / metrics.totalSalesBdt) * 100))
                          : 0;
                      return (
                        <div key={cat.categoryNameEn} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-[#141A17]">{cat.categoryNameEn}</span>
                            <span className="font-mono-tabular text-[#4B5651]">
                              {formatBdt(cat.revenueBdt)} ({cat.unitsSold} units)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-[#F8F6F1] overflow-hidden">
                            <div
                              className="h-full bg-[#075B42]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-7 bg-white border border-[#E5E0D5] rounded-xl p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-[#141A17]">Recent Orders</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="border-b border-[#E5E0D5] text-[#59645F]">
                        <tr>
                          <th className="py-2 pr-3">Order</th>
                          <th className="py-2 pr-3">Customer</th>
                          <th className="py-2 pr-3">District</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0ECE2]">
                        {metrics.recentOrders.map((ord) => (
                          <tr
                            key={ord.id}
                            onClick={() => {
                              setTab('orders');
                              setSelectedOrder(ord);
                              setOrderUpdateStatus(ord.orderStatus);
                              setOrderAdminNote(ord.adminNote);
                            }}
                            className="hover:bg-[#F8F6F1] cursor-pointer"
                          >
                            <td className="py-2.5 pr-3 font-mono-tabular font-semibold">
                              #{ord.orderNumber}
                            </td>
                            <td className="py-2.5 pr-3">{ord.customerName}</td>
                            <td className="py-2.5 pr-3">{ord.district}</td>
                            <td className="py-2.5 pr-3">
                              <span
                                className={`px-2 py-0.5 rounded border ${
                                  ORDER_STATUS_LABELS[ord.orderStatus].tone
                                }`}
                              >
                                {ORDER_STATUS_LABELS[ord.orderStatus].en}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-mono-tabular font-semibold">
                              {formatBdt(ord.totalBdt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SEO DASHBOARD */}
          {tab === 'seo' && (() => {
            const seoChecklist = products.map((product) => {
              const checks = [
                Boolean(product.seoTitleEn?.trim()),
                Boolean(product.seoTitleBn?.trim()),
                Boolean(product.seoDescriptionEn?.trim()),
                Boolean(product.seoDescriptionBn?.trim()),
                Boolean(product.focusKeywords?.trim()),
                Boolean(product.imageAltEn?.trim()),
                Boolean(product.imageAltBn?.trim()),
              ];
              return {
                product,
                completed: checks.filter(Boolean).length,
                total: checks.length,
              };
            });

            const completeCount = seoChecklist.filter((item) => item.completed === item.total).length;
            const incompleteCount = seoChecklist.length - completeCount;
            const completionRate = seoChecklist.length
              ? Math.round((completeCount / seoChecklist.length) * 100)
              : 0;

            return (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-[#141A17]">SEO Management Dashboard</h2>
                  <p className="text-sm text-[#59645F] mt-1">
                    Product search metadata completeness overview
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="bg-white border border-[#E5E0D5] rounded-xl p-5">
                    <p className="text-xs text-[#59645F]">Total Products</p>
                    <p className="text-2xl font-semibold text-[#141A17] mt-1">{products.length}</p>
                  </div>
                  <div className="bg-white border border-[#E5E0D5] rounded-xl p-5">
                    <p className="text-xs text-[#59645F]">SEO Complete</p>
                    <p className="text-2xl font-semibold text-[#075B42] mt-1">{completeCount}</p>
                  </div>
                  <div className="bg-white border border-[#E5E0D5] rounded-xl p-5">
                    <p className="text-xs text-[#59645F]">Needs Attention</p>
                    <p className="text-2xl font-semibold text-[#8E6F16] mt-1">{incompleteCount}</p>
                  </div>
                  <div className="bg-white border border-[#E5E0D5] rounded-xl p-5">
                    <p className="text-xs text-[#59645F]">SEO Completion</p>
                    <p className="text-2xl font-semibold text-[#075B42] mt-1">{completionRate}%</p>
                  </div>
                </div>

                <div className="bg-white border border-[#E5E0D5] rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[#141A17]">Overall SEO Readiness</h3>
                    <span className="text-sm font-semibold text-[#075B42]">{completionRate}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-[#F0ECE2] overflow-hidden">
                    <div className="h-full bg-[#075B42] rounded-full" style={{ width: `${completionRate}%` }} />
                  </div>
                  <p className="text-xs text-[#59645F]">
                    A product is counted complete when all seven SEO fields are filled. This is an internal checklist, not a Google ranking score.
                  </p>
                </div>

                <div className="bg-white border border-[#E5E0D5] rounded-xl p-5 space-y-4">
                  <div>
                    <h3 className="font-semibold text-[#141A17]">Product SEO Checklist</h3>
                    <p className="text-xs text-[#59645F] mt-1">Select a product to edit its SEO information.</p>
                  </div>
                  {seoChecklist.length === 0 ? (
                    <p className="text-sm text-[#59645F]">No products found.</p>
                  ) : (
                    <div className="space-y-2">
                      {seoChecklist.map((item) => (
                        <button
                          key={item.product.id}
                          type="button"
                          onClick={() => openEditProductModal(item.product)}
                          className="w-full text-left p-3 rounded-lg border border-[#E5E0D5] hover:border-[#075B42] hover:bg-[#F8F6F1] flex items-center justify-between gap-3"
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-[#141A17] truncate">
                              {item.product.nameEn}
                            </span>
                            <span className="block text-xs text-[#59645F] truncate">
                              {item.product.nameBn}
                            </span>
                          </span>
                          <span className={`shrink-0 text-xs font-semibold ${item.completed === item.total ? 'text-[#075B42]' : 'text-[#8E6F16]'}`}>
                            {item.completed}/{item.total} fields
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB: PRODUCTS */}
          {tab === 'products' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-[#141A17]">Product Catalog</h2>
                <button
                  type="button"
                  onClick={openNewProductModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#075B42] text-white text-xs font-semibold hover:bg-[#054431]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
              </div>

              <div className="bg-white border border-[#E5E0D5] rounded-xl overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F8F6F1] border-b border-[#E5E0D5] text-[#59645F]">
                    <tr>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-3">SKU</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3 text-right">Price</th>
                      <th className="py-3 px-3 text-right">Discount</th>
                      <th className="py-3 px-3 text-right">Stock</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0ECE2]">
                    {products.map((p) => {
                      const cat = categories.find((c) => c.id === p.categoryId);
                      return (
                        <tr key={p.id} className="hover:bg-[#F8F6F1]/60">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={p.imageUrl}
                                alt={p.nameEn}
                                className="w-10 h-10 rounded object-cover bg-[#F8F6F1]"
                              />
                              <div>
                                <p className="font-semibold text-[#141A17]">{p.nameEn}</p>
                                <p className="text-[#59645F]">
                                  {p.nameBn} · {p.weightLabel}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono-tabular">{p.sku}</td>
                          <td className="py-3 px-3">{cat?.nameEn || '-'}</td>
                          <td className="py-3 px-3 text-right font-mono-tabular">
                            {formatBdt(p.priceBdt)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-tabular text-[#075B42]">
                            {p.discountPriceBdt !== null ? formatBdt(p.discountPriceBdt) : '—'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-tabular">
                            <span className={p.stockQty <= 15 ? 'text-amber-700 font-semibold' : ''}>
                              {p.stockQty}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditProductModal(p)}
                                className="p-1.5 rounded border border-[#D6D0C4] hover:bg-white"
                                title="Edit product"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-1.5 rounded border border-rose-200 text-rose-700 hover:bg-rose-50"
                                title="Delete product"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: CATEGORIES */}
          {tab === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white border border-[#E5E0D5] rounded-xl p-6 space-y-4">
                <h2 className="text-xl font-semibold text-[#141A17]">Product Categories</h2>
                <div className="divide-y divide-[#E5E0D5]">
                  {categories.map((c) => (
                    <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[#141A17]">
                          {c.nameEn} · {c.nameBn}
                        </p>
                        <p className="text-xs text-[#59645F]">
                          /{c.slug} · {c.descriptionEn}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.adminUpdateCategory(c.id, { isActive: !c.isActive });
                          notify(`Category ${c.nameEn} updated.`);
                          await loadAllAdminData();
                          await onStorefrontUpdated();
                        }}
                        className="px-3 py-1.5 rounded border border-[#D6D0C4] text-xs font-medium"
                      >
                        {c.isActive ? 'Active' : 'Hidden'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api.adminCreateCategory({ ...catForm, isActive: true });
                    setCatForm({
                      slug: '',
                      nameEn: '',
                      nameBn: '',
                      descriptionEn: '',
                      descriptionBn: '',
                      sortOrder: categories.length + 1,
                    });
                    notify('Category created.');
                    await loadAllAdminData();
                    await onStorefrontUpdated();
                  } catch (err: any) {
                    setErrorMessage(err.message);
                  }
                }}
                className="lg:col-span-5 bg-white border border-[#E5E0D5] rounded-xl p-6 space-y-3"
              >
                <h3 className="text-lg font-semibold text-[#141A17]">Add Category</h3>
                <input
                  type="text"
                  required
                  value={catForm.nameEn}
                  onChange={(e) => setCatForm({ ...catForm, nameEn: e.target.value })}
                  placeholder="English Name (e.g. Dry Fruits)"
                  className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] text-sm"
                />
                <input
                  type="text"
                  required
                  value={catForm.nameBn}
                  onChange={(e) => setCatForm({ ...catForm, nameBn: e.target.value })}
                  placeholder="Bengali Name (e.g. শুকনো ফল)"
                  className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] text-sm"
                />
                <input
                  type="text"
                  required
                  value={catForm.slug}
                  onChange={(e) =>
                    setCatForm({
                      ...catForm,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                    })
                  }
                  placeholder="slug-name (e.g. dry-fruits)"
                  className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] text-sm font-mono-tabular"
                />
                <textarea
                  rows={2}
                  value={catForm.descriptionEn}
                  onChange={(e) => setCatForm({ ...catForm, descriptionEn: e.target.value })}
                  placeholder="Short description (EN)"
                  className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] text-sm"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-[#075B42] text-white text-xs font-semibold"
                >
                  Create Category
                </button>
              </form>
            </div>
          )}

          {/* TAB: ORDERS */}
          {tab === 'orders' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {(['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setOrderStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap ${
                          orderStatusFilter === st
                            ? 'bg-[#075B42] text-white'
                            : 'bg-white border border-[#E5E0D5] text-[#4B5651]'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => api.adminDownloadCsv()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#075B42] text-white text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 bg-white border border-[#E5E0D5] rounded-xl overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#F8F6F1] border-b border-[#E5E0D5] text-[#59645F]">
                      <tr>
                        <th className="py-3 px-4">Order #</th>
                        <th className="py-3 px-3">Customer</th>
                        <th className="py-3 px-3">Location</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0ECE2]">
                      {filteredOrders.map((ord) => (
                        <tr
                          key={ord.id}
                          onClick={() => {
                            setSelectedOrder(ord);
                            setOrderUpdateStatus(ord.orderStatus);
                            setOrderAdminNote(ord.adminNote);
                          }}
                          className={`cursor-pointer ${
                            selectedOrder?.id === ord.id ? 'bg-[#075B42]/5' : 'hover:bg-[#F8F6F1]'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono-tabular font-semibold">
                            #{ord.orderNumber}
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-medium text-[#141A17]">{ord.customerName}</p>
                            <p className="text-[#59645F] font-mono-tabular">{ord.customerPhone}</p>
                          </td>
                          <td className="py-3 px-3">
                            {ord.upazila}, {ord.district}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded border ${
                                ORDER_STATUS_LABELS[ord.orderStatus].tone
                              }`}
                            >
                              {ORDER_STATUS_LABELS[ord.orderStatus].en}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono-tabular font-semibold">
                            {formatBdt(ord.totalBdt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="lg:col-span-5 bg-white border border-[#E5E0D5] rounded-xl p-6">
                  {!selectedOrder ? (
                    <p className="text-sm text-[#59645F]">
                      Select an order row to inspect line items and update dispatch status.
                    </p>
                  ) : (
                    <form onSubmit={handleUpdateOrderStatus} className="space-y-4">
                      <div className="pb-3 border-b border-[#E5E0D5]">
                        <h3 className="text-lg font-semibold text-[#141A17]">
                          Order #{selectedOrder.orderNumber}
                        </h3>
                        <p className="text-xs text-[#59645F] mt-1">
                          {selectedOrder.customerName} · {selectedOrder.customerPhone}
                        </p>
                        <p className="text-xs text-[#4B5651] mt-1">
                          {selectedOrder.deliveryAddress}, {selectedOrder.upazila},{' '}
                          {selectedOrder.district}
                        </p>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        {selectedOrder.items.map((item) => (
                          <div key={item.id} className="flex justify-between">
                            <span>
                              {item.productNameEn} ({item.weightLabel}) × {item.quantity}
                            </span>
                            <span className="font-mono-tabular">{formatBdt(item.lineTotalBdt)}</span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-[#E5E0D5] flex justify-between font-semibold">
                          <span>Total (incl. {formatBdt(selectedOrder.deliveryChargeBdt)} delivery)</span>
                          <span className="font-mono-tabular text-[#075B42]">
                            {formatBdt(selectedOrder.totalBdt)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#2C3531] mb-1">
                          Order Status
                        </label>
                        <select
                          value={orderUpdateStatus}
                          onChange={(e) => setOrderUpdateStatus(e.target.value as OrderStatus)}
                          className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] text-sm bg-white"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Packing / Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#2C3531] mb-1">
                          Internal Admin Note
                        </label>
                        <input
                          type="text"
                          value={orderAdminNote}
                          onChange={(e) => setOrderAdminNote(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#2C3531] mb-1">
                          Custom Customer Notification (EN, optional)
                        </label>
                        <input
                          type="text"
                          value={orderNotifEn}
                          onChange={(e) => setOrderNotifEn(e.target.value)}
                          placeholder="Leave blank for default status update message"
                          className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#2C3531] mb-1">
                          Custom Customer Notification (BN, optional)
                        </label>
                        <input
                          type="text"
                          value={orderNotifBn}
                          onChange={(e) => setOrderNotifBn(e.target.value)}
                          placeholder="বাংলা স্ট্যাটাস বার্তা"
                          className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] text-sm"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-lg bg-[#075B42] text-white text-xs font-semibold hover:bg-[#054431]"
                      >
                        Update Order & Send Notification
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: CUSTOMERS */}
          {tab === 'customers' && (
            <div className="bg-white border border-[#E5E0D5] rounded-xl overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8F6F1] border-b border-[#E5E0D5] text-[#59645F]">
                  <tr>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-3">Phone</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3 text-right">Orders</th>
                    <th className="py-3 px-4 text-right">Total Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECE2]">
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#141A17]">{c.fullName}</p>
                        <p className="text-[#59645F]">{c.email}</p>
                      </td>
                      <td className="py-3 px-3 font-mono-tabular">{c.phone}</td>
                      <td className="py-3 px-3">
                        {c.upazila || '-'}, {c.district || '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-tabular">{c.orderCount}</td>
                      <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-[#075B42]">
                        {formatBdt(c.totalSpentBdt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: DELIVERY & PAYMENT */}
          {tab === 'delivery' && delivery && (
            <form
              onSubmit={handleSaveDelivery}
              className="max-w-2xl bg-white border border-[#E5E0D5] rounded-xl p-6 space-y-5"
            >
              <h2 className="text-xl font-semibold text-[#141A17]">
                Bangladesh Delivery Charges & Payment Gateways
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2C3531] mb-1">
                    Inside Dhaka Metro (BDT)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={delivery.insideDhakaBdt}
                    onChange={(e) =>
                      setDelivery({ ...delivery, insideDhakaBdt: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C3531] mb-1">
                    Dhaka Suburbs (Savar, Gazipur, Narayanganj)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={delivery.subDhakaBdt}
                    onChange={(e) =>
                      setDelivery({ ...delivery, subDhakaBdt: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C3531] mb-1">
                    Outside Dhaka (All Other Districts)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={delivery.outsideDhakaBdt}
                    onChange={(e) =>
                      setDelivery({ ...delivery, outsideDhakaBdt: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C3531] mb-1">
                    Free Delivery Minimum Order (0 to disable)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={delivery.freeDeliveryThresholdBdt}
                    onChange={(e) =>
                      setDelivery({
                        ...delivery,
                        freeDeliveryThresholdBdt: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm font-mono-tabular"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E0D5] space-y-2.5 text-sm">
                <label className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={delivery.codEnabled}
                    onChange={(e) => setDelivery({ ...delivery, codEnabled: e.target.checked })}
                    className="accent-[#075B42]"
                  />
                  <span>Enable Cash on Delivery (COD)</span>
                </label>
                <label className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={delivery.bkashEnabled}
                    onChange={(e) => setDelivery({ ...delivery, bkashEnabled: e.target.checked })}
                    className="accent-[#075B42]"
                  />
                  <span>Enable bKash Merchant Gateway (requires live .env keys)</span>
                </label>
                <label className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={delivery.nagadEnabled}
                    onChange={(e) => setDelivery({ ...delivery, nagadEnabled: e.target.checked })}
                    className="accent-[#075B42]"
                  />
                  <span>Enable Nagad Merchant Gateway (requires live .env keys)</span>
                </label>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-[#075B42] text-white text-xs font-semibold hover:bg-[#054431]"
              >
                Save Delivery & Payment Configuration
              </button>
            </form>
          )}

          {/* TAB: BANNERS & CMS */}
          {tab === 'cms' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white border border-[#E5E0D5] rounded-xl p-6 space-y-4">
                  <h2 className="text-xl font-semibold text-[#141A17]">Promotional Banners</h2>
                  <div className="space-y-3">
                    {banners.map((b) => (
                      <div
                        key={b.id}
                        className="p-4 rounded-xl border border-[#E5E0D5] flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={b.imageUrl}
                            alt={b.titleEn}
                            className="w-16 h-12 rounded object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#141A17] truncate">
                              {b.titleEn}
                            </p>
                            <p className="text-xs text-[#59645F] truncate">{b.titleBn}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              await api.adminUpdateBanner(b.id, { isActive: !b.isActive });
                              await loadAllAdminData();
                              await onStorefrontUpdated();
                            }}
                            className="px-2.5 py-1 rounded border border-[#D6D0C4] text-xs"
                          >
                            {b.isActive ? 'Active' : 'Hidden'}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await api.adminDeleteBanner(b.id);
                              await loadAllAdminData();
                              await onStorefrontUpdated();
                            }}
                            className="p-1.5 rounded border border-rose-200 text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await api.adminCreateBanner({
                      ...bannerForm,
                      isActive: true,
                      sortOrder: banners.length + 1,
                    });
                    notify('Promotional banner added.');
                    await loadAllAdminData();
                    await onStorefrontUpdated();
                  }}
                  className="lg:col-span-5 bg-white border border-[#E5E0D5] rounded-xl p-6 space-y-3"
                >
                  <h3 className="text-lg font-semibold text-[#141A17]">Add Promotional Banner</h3>
                  <input
                    type="text"
                    required
                    value={bannerForm.titleEn}
                    onChange={(e) => setBannerForm({ ...bannerForm, titleEn: e.target.value })}
                    placeholder="Headline (English)"
                    className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] text-sm"
                  />
                  <input
                    type="text"
                    required
                    value={bannerForm.titleBn}
                    onChange={(e) => setBannerForm({ ...bannerForm, titleBn: e.target.value })}
                    placeholder="Headline (Bengali)"
                    className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] text-sm"
                  />
                  <input
                    type="text"
                    value={bannerForm.subtitleEn}
                    onChange={(e) => setBannerForm({ ...bannerForm, subtitleEn: e.target.value })}
                    placeholder="Subtitle (English)"
                    className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] text-sm"
                  />
                  <input
                    type="text"
                    value={bannerForm.subtitleBn}
                    onChange={(e) => setBannerForm({ ...bannerForm, subtitleBn: e.target.value })}
                    placeholder="Subtitle (Bengali)"
                    className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] text-sm"
                  />
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#D6D0C4] text-xs font-medium cursor-pointer hover:bg-[#F8F6F1]">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Banner Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleImageUpload(e, (url) =>
                          setBannerForm((prev) => ({ ...prev, imageUrl: url }))
                        )
                      }
                    />
                  </label>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-[#075B42] text-white text-xs font-semibold"
                  >
                    Publish Banner
                  </button>
                </form>
              </div>

              <div className="bg-white border border-[#E5E0D5] rounded-xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-[#141A17]">
                    Website Content Management (EN / BN)
                  </h2>
                  <button
                    type="button"
                    onClick={handleSaveSiteContent}
                    className="px-4 py-2 rounded-lg bg-[#075B42] text-white text-xs font-semibold"
                  >
                    Save All Content
                  </button>
                </div>

                <section className="rounded-xl border border-[#D6D0C4] bg-[#F8F6F1] p-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#075B42]">Social Media Links</h3>
                    <p className="text-xs text-[#59645F] mt-1">Add your social profile URLs. Only platforms with a link will appear in the website footer.</p>
                  </div>
                  {[
                    { key: 'social_facebook', label: 'Facebook' },
                    { key: 'social_whatsapp', label: 'WhatsApp' },
                    { key: 'social_instagram', label: 'Instagram' },
                    { key: 'social_youtube', label: 'YouTube' },
                    { key: 'social_tiktok', label: 'TikTok' },
                  ].map((platform) => {
                    const idx = siteContent.findIndex((item) => item.key === platform.key);
                    const value = idx >= 0 ? siteContent[idx].valueEn : '';
                    return (
                      <label key={platform.key} className="block space-y-1">
                        <span className="text-xs font-semibold text-[#59645F]">{platform.label} URL</span>
                        <input
                          type="url"
                          value={value}
                          onChange={(e) => {
                            const next = [...siteContent];
                            if (idx >= 0) {
                              next[idx] = { ...next[idx], valueEn: e.target.value, valueBn: e.target.value };
                            } else {
                              next.push({ key: platform.key, valueEn: e.target.value, valueBn: e.target.value, updatedAt: new Date().toISOString() });
                            }
                            setSiteContent(next);
                          }}
                          placeholder={`https://${platform.label.toLowerCase()}.com/your-page`}
                          className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] bg-white text-xs"
                        />
                      </label>
                    );
                  })}
                </section>

                <div className="space-y-5">
                  {siteContent.filter((item) => !item.key.startsWith('social_')).map((item, idx) => (
                    <div key={item.key} className="p-4 rounded-xl bg-[#F8F6F1] border border-[#E5E0D5] space-y-2">
                      <span className="text-xs font-mono-tabular font-semibold text-[#075B42]">
                        {item.key}
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {([
                          {
                            lang: 'English',
                            value: item.valueEn,
                            textColor: item.textColorEn ?? '#141A17',
                            backgroundColor: item.backgroundColorEn ?? '#FFFFFF',
                            textKey: 'textColorEn',
                            bgKey: 'backgroundColorEn',
                            valueKey: 'valueEn',
                          },
                          {
                            lang: 'বাংলা',
                            value: item.valueBn,
                            textColor: item.textColorBn ?? '#141A17',
                            backgroundColor: item.backgroundColorBn ?? '#FFFFFF',
                            textKey: 'textColorBn',
                            bgKey: 'backgroundColorBn',
                            valueKey: 'valueBn',
                          },
                        ] as const).map((field) => (
                          <div key={field.lang} className="space-y-3">
                            <label className="block text-xs font-semibold text-[#59645F]">
                              {field.lang} Content
                            </label>
                            <textarea
                              rows={3}
                              value={field.value}
                              onChange={(e) => {
                                const next = [...siteContent];
                                next[idx] = { ...item, [field.valueKey]: e.target.value };
                                setSiteContent(next);
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] bg-white text-xs"
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <label className="flex flex-col gap-1 text-[11px] text-[#59645F]">
                                Text Color
                                <input
                                  type="color"
                                  value={field.textColor}
                                  onChange={(e) => {
                                    const next = [...siteContent];
                                    next[idx] = { ...item, [field.textKey]: e.target.value };
                                    setSiteContent(next);
                                  }}
                                  className="w-full h-9 rounded border border-[#D6D0C4] cursor-pointer"
                                />
                                <span className="font-mono">{field.textColor}</span>
                              </label>
                              <label className="flex flex-col gap-1 text-[11px] text-[#59645F]">
                                Background Color
                                <input
                                  type="color"
                                  value={field.backgroundColor}
                                  onChange={(e) => {
                                    const next = [...siteContent];
                                    next[idx] = { ...item, [field.bgKey]: e.target.value };
                                    setSiteContent(next);
                                  }}
                                  className="w-full h-9 rounded border border-[#D6D0C4] cursor-pointer"
                                />
                                <span className="font-mono">{field.backgroundColor}</span>
                              </label>
                            </div>
                            <div
                              className="rounded-lg border border-dashed border-[#D6D0C4] p-3"
                              style={{
                                color: field.textColor,
                                backgroundColor: field.backgroundColor,
                              }}
                            >
                              <span className="block text-[10px] opacity-70 mb-1">LIVE PREVIEW</span>
                              <p className="text-sm">{field.value || 'Your content preview'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}


          {/* TAB: PLUGIN CENTER */}
          {tab === 'plugins' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#E5E0D5] rounded-xl p-5">
                <h2 className="text-xl font-semibold text-[#141A17]">Plugin Center</h2>
                <p className="text-sm text-[#59645F] mt-2">
                  Manage available integrations for payments, courier, marketing and store tools.
                </p>
                <p className="text-xs text-[#8A6B22] mt-2">
                  Enable means selected in your store. It does not mean the external service is connected.
                </p>
              </div>

              {pluginLoading && <p className="text-sm">Loading plugin settings...</p>}
              {pluginError && (
                <div className="rounded-xl border border-[#E5D6A8] bg-[#FFF9E9] p-4 text-sm text-[#765A16]">
                  {pluginError}
                </div>
              )}

              {PLUGIN_REGISTRY.map((group) => (
                <section key={group.category} className="space-y-3">
                  <h3 className="text-sm font-bold text-[#075B42]">{group.category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {group.plugins.map((plugin) => {
                      const { key: pluginKey, name, description } = plugin;
                      const integration = pluginIntegrations.find(
                        (item) => item.pluginKey === pluginKey
                      );
                      const enabled = integration?.enabled ?? false;
                      const status = integration?.status ?? 'available';

                      return (
                        <div key={pluginKey} className="bg-white border border-[#E5E0D5] rounded-xl p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-semibold text-sm text-[#141A17]">{name}</h4>
                              <p className="text-xs text-[#59645F] mt-1">{description}</p>
                            </div>
                            <span className="text-[10px] rounded-full px-2 py-1 font-semibold bg-[#F1EFE9] text-[#59645F]">
                              {status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between border-t border-[#E5E0D5] pt-3">
                            <span className="text-xs text-[#59645F]">
                              {enabled ? 'Enabled' : 'Disabled'}
                            </span>
                            <button
                              type="button"
                              disabled={pluginSaving === pluginKey || Boolean(pluginError)}
                              onClick={async () => {
                                setPluginSaving(pluginKey);
                                try {
                                  const updated = await api.adminUpdatePlugin(pluginKey, {
                                    enabled: !enabled,
                                  });
                                  setPluginIntegrations((current) => [
                                    ...current.filter((item) => item.pluginKey !== pluginKey),
                                    updated,
                                  ]);
                                  notify(`${name} ${updated.enabled ? 'enabled' : 'disabled'}.`);
                                  api.adminListPluginActivity()
                                    .then((items) => {
                                      setPluginActivity(items);
                                      setPluginActivityError('');
                                    })
                                    .catch(() => {
                                      setPluginActivityError('Activity log refresh failed.');
                                    });
                                } catch (err: any) {
                                  setPluginError(err.message || 'Could not update plugin.');
                                } finally {
                                  setPluginSaving(null);
                                }
                              }}
                              className={`px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 ${
                                enabled ? 'bg-[#F1EFE9] text-[#59645F]' : 'bg-[#075B42] text-white'
                              }`}
                            >
                              {pluginSaving === pluginKey
                                ? 'Saving...'
                                : enabled ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* PLUGIN ACTIVITY LOG */}
          {tab === 'plugins' && (
            <section className="mt-6 bg-white border border-[#E5E0D5] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#141A17]">Plugin Activity Log</h2>
                  <p className="text-xs text-[#59645F] mt-1">
                    Recent plugin changes recorded by the server
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    api.adminListPluginActivity()
                      .then((items) => {
                        setPluginActivity(items);
                        setPluginActivityError('');
                      })
                      .catch((err: any) => {
                        setPluginActivityError(err.message || 'Could not refresh activity log.');
                      });
                  }}
                  className="px-3 py-2 rounded-lg border border-[#D6D0C4] text-xs font-semibold"
                >
                  Refresh
                </button>
              </div>

              {pluginActivityError && (
                <p className="text-xs text-[#9A5B16]">{pluginActivityError}</p>
              )}

              {pluginActivity.length === 0 ? (
                <p className="text-sm text-[#59645F]">
                  No plugin activity records found yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {pluginActivity.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-[#E5E0D5] bg-[#F8F6F1] p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#075B42]">
                          {log.pluginKey}
                        </span>
                        <span className="text-xs font-semibold text-[#59645F]">
                          {log.action}
                        </span>
                      </div>
                      <p className="text-xs text-[#59645F] mt-2">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                      {log.actorUserId && (
                        <p className="text-xs text-[#59645F] mt-1">
                          Admin ID: {log.actorUserId}
                        </p>
                      )}
                      {Object.keys(log.details || {}).length > 0 && (
                        <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-[#59645F]">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* TAB: ADVANCED CONTROL CENTER */}
          {tab === 'control' && (
            <section className="space-y-6">
              <div className="bg-white border border-[#E5E0D5] rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <Settings className="w-6 h-6 text-[#075B42]" />
                  <div>
                    <h2 className="text-xl font-semibold text-[#141A17]">
                      Advanced Control Center
                    </h2>
                    <p className="text-sm text-[#59645F] mt-1">
                      Manage important storefront access and availability settings.
                    </p>
                  </div>
                </div>
              </div>

              {!appSettings ? (
                <div className="bg-white border border-[#E5E0D5] rounded-xl p-6 text-sm text-[#59645F]">
                  Loading application settings...
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {([
                    {
                      key: 'maintenanceMode' as const,
                      title: 'Maintenance Mode',
                      description: 'Temporarily show a maintenance page to storefront visitors. Admin access remains available.',
                      enabled: appSettings.maintenanceMode,
                    },
                    {
                      key: 'storefrontVisible' as const,
                      title: 'Storefront Visibility',
                      description: 'Show or hide the public storefront while keeping admin access available.',
                      enabled: appSettings.storefrontVisible,
                    },
                    {
                      key: 'checkoutEnabled' as const,
                      title: 'Checkout Control',
                      description: 'Allow or prevent customers from accessing the checkout process.',
                      enabled: appSettings.checkoutEnabled,
                    },
                    {
                      key: 'orderAcceptanceEnabled' as const,
                      title: 'Order Acceptance',
                      description: 'Allow or stop new order submissions.',
                      enabled: appSettings.orderAcceptanceEnabled,
                    },
                    {
                      key: 'customerLoginEnabled' as const,
                      title: 'Customer Login',
                      description: 'Allow or prevent customer accounts from logging in. Admin login remains available.',
                      enabled: appSettings.customerLoginEnabled,
                    },
                    {
                      key: 'customerRegistrationEnabled' as const,
                      title: 'Customer Registration',
                      description: 'Allow or prevent new customers from creating accounts.',
                      enabled: appSettings.customerRegistrationEnabled,
                    },
                    {
                      key: 'contactFormEnabled' as const,
                      title: 'Contact Form',
                      description: 'Allow or prevent visitors from submitting the website contact form.',
                      enabled: appSettings.contactFormEnabled,
                    },
                  ]).map((item) => (
                    <div
                      key={item.key}
                      className="bg-white border border-[#E5E0D5] rounded-xl p-5 space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-[#141A17]">{item.title}</h3>
                          <p className="text-xs text-[#59645F] mt-2 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          item.enabled
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.enabled ? 'ON' : 'OFF'}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={appSettingsSaving}
                        onClick={() => updateAppSetting(item.key, !item.enabled)}
                        className={`w-full rounded-lg px-4 py-3 text-xs font-semibold transition-colors disabled:opacity-50 ${
                          item.enabled
                            ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                            : 'bg-[#075B42] text-white hover:bg-[#054431]'
                        }`}
                      >
                        {appSettingsSaving
                          ? 'Saving...'
                          : item.enabled
                            ? 'Turn OFF'
                            : 'Turn ON'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-white border border-[#E5E0D5] rounded-xl p-6 space-y-2">
                <div className="flex items-center gap-3">
                  <Settings className="w-6 h-6 text-[#075B42]" />
                  <div>
                    <h2 className="text-xl font-semibold text-[#141A17]">
                      Feature Management Center
                    </h2>
                    <p className="text-sm text-[#59645F] mt-1">
                      Enable or disable optional store features.
                    </p>
                  </div>
                </div>
              </div>

              {!appSettings ? null : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {([
                    {
                      key: 'wishlistEnabled' as const,
                      title: 'Wishlist',
                      description: 'Allow customers to save products to their favorites list.',
                      enabled: appSettings.wishlistEnabled,
                    },
                    {
                      key: 'couponSystemEnabled' as const,
                      title: 'Coupon System',
                      description: 'Enable discount coupons during checkout.',
                      enabled: appSettings.couponSystemEnabled,
                    },
                    {
                      key: 'productReviewsEnabled' as const,
                      title: 'Product Reviews',
                      description: 'Allow customers to submit product reviews and ratings.',
                      enabled: appSettings.productReviewsEnabled,
                    },
                    {
                      key: 'orderTrackingEnabled' as const,
                      title: 'Order Tracking',
                      description: 'Allow customers to view their order status.',
                      enabled: appSettings.orderTrackingEnabled,
                    },
                    {
                      key: 'inventoryManagementEnabled' as const,
                      title: 'Inventory Management',
                      description: 'Enable product stock control and inventory management.',
                      enabled: appSettings.inventoryManagementEnabled,
                    },
                  ]).map((item) => (
                    <div
                      key={item.key}
                      className="bg-white border border-[#E5E0D5] rounded-xl p-5 space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-[#141A17]">{item.title}</h3>
                          <p className="text-xs text-[#59645F] mt-2 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          item.enabled
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.enabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={appSettingsSaving}
                        onClick={() => updateAppSetting(item.key, !item.enabled)}
                        className={`w-full rounded-lg px-4 py-3 text-xs font-semibold transition-colors disabled:opacity-50 ${
                          item.enabled
                            ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                            : 'bg-[#075B42] text-white hover:bg-[#054431]'
                        }`}
                      >
                        {appSettingsSaving
                          ? 'Saving...'
                          : item.enabled
                            ? 'Turn OFF'
                            : 'Turn ON'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-900">
                  Important
                </p>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  These controls do not delete products, orders, customers or other store data.
                  Maintenance Mode keeps the admin dashboard accessible.
                </p>
              </div>
            </section>
          )}

          {/* TAB: REPORTS & BACKUP */}
          {tab === 'reports' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-white border border-[#E5E0D5] rounded-xl p-6 space-y-5">
                <h2 className="text-xl font-semibold text-[#141A17]">
                  Database Export, Restore & CSV Reports
                </h2>
                <p className="text-sm text-[#59645F]">
                  Download complete order ledgers as CSV for accounting, or export/restore a full
                  JSON database snapshot for portable migration across servers.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => api.adminDownloadCsv()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#075B42] text-white text-xs font-semibold"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Orders CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => api.adminDownloadBackup()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#075B42] text-[#075B42] text-xs font-semibold"
                  >
                    <Database className="w-4 h-4" />
                    <span>Export Full DB JSON</span>
                  </button>
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#D6D0C4] text-xs font-semibold cursor-pointer hover:bg-[#F8F6F1]">
                    <Upload className="w-4 h-4" />
                    <span>Restore JSON Backup</span>
                    <input
                      type="file"
                      accept="application/json"
                      className="hidden"
                      onChange={handleRestoreBackupFile}
                    />
                  </label>
                </div>
              </div>

              <div className="lg:col-span-6 bg-white border border-[#E5E0D5] rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#075B42]" />
                  <h2 className="text-xl font-semibold text-[#141A17]">Customer Inquiries</h2>
                </div>
                {messages.length === 0 ? (
                  <p className="text-sm text-[#59645F]">No customer contact inquiries yet.</p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {messages.map((m) => (
                      <div key={m.id} className="p-3.5 rounded-lg bg-[#F8F6F1] border border-[#E5E0D5] text-xs">
                        <div className="flex justify-between font-semibold text-[#141A17]">
                          <span>{m.name} ({m.phone})</span>
                          <span className="font-mono-tabular text-[#59645F]">
                            {new Date(m.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="font-medium text-[#075B42] mt-1">{m.subject}</p>
                        <p className="text-[#4B5651] mt-1">{m.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add / Edit Product Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#E5E0D5] w-full max-w-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D5]">
              <h3 className="text-xl font-semibold text-[#141A17]">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="p-1.5 rounded hover:bg-[#F8F6F1]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Category *</label>
                  <select
                    value={prodForm.categoryId}
                    onChange={(e) => setProdForm({ ...prodForm, categoryId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={prodForm.sku}
                    onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Net Weight *</label>
                  <input
                    type="text"
                    required
                    value={prodForm.weightLabel}
                    onChange={(e) => setProdForm({ ...prodForm, weightLabel: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Product Name (EN) *</label>
                  <input
                    type="text"
                    required
                    value={prodForm.nameEn}
                    onChange={(e) => setProdForm({ ...prodForm, nameEn: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Product Name (BN) *</label>
                  <input
                    type="text"
                    required
                    value={prodForm.nameBn}
                    onChange={(e) => setProdForm({ ...prodForm, nameBn: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Price (BDT) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={prodForm.priceBdt}
                    onChange={(e) => setProdForm({ ...prodForm, priceBdt: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Discount Price (BDT)</label>
                  <input
                    type="number"
                    min={0}
                    value={prodForm.discountPriceBdt}
                    onChange={(e) => setProdForm({ ...prodForm, discountPriceBdt: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={prodForm.stockQty}
                    onChange={(e) => setProdForm({ ...prodForm, stockQty: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Short Description (EN)</label>
                  <input
                    type="text"
                    value={prodForm.shortDescEn}
                    onChange={(e) => setProdForm({ ...prodForm, shortDescEn: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Short Description (BN)</label>
                  <input
                    type="text"
                    value={prodForm.shortDescBn}
                    onChange={(e) => setProdForm({ ...prodForm, shortDescBn: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Full Description (EN)</label>
                  <textarea
                    rows={2}
                    value={prodForm.descriptionEn}
                    onChange={(e) => setProdForm({ ...prodForm, descriptionEn: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Full Description (BN)</label>
                  <textarea
                    rows={2}
                    value={prodForm.descriptionBn}
                    onChange={(e) => setProdForm({ ...prodForm, descriptionBn: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4]"
                  />
                </div>
              </div>

              <div className="border border-[#D6D0C4] rounded-xl p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-[#075B42]">SEO Management</h3>
                  <p className="text-xs text-[#59645F]">Search engine titles, descriptions, keywords and image ALT text.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">SEO Title (English)</label>
                    <input type="text" maxLength={200} value={prodForm.seoTitleEn} onChange={(e) => setProdForm({ ...prodForm, seoTitleEn: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">SEO Title (বাংলা)</label>
                    <input type="text" maxLength={200} value={prodForm.seoTitleBn} onChange={(e) => setProdForm({ ...prodForm, seoTitleBn: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Meta Description (English)</label>
                    <textarea rows={2} maxLength={320} value={prodForm.seoDescriptionEn} onChange={(e) => setProdForm({ ...prodForm, seoDescriptionEn: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Meta Description (বাংলা)</label>
                    <textarea rows={2} maxLength={320} value={prodForm.seoDescriptionBn} onChange={(e) => setProdForm({ ...prodForm, seoDescriptionBn: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4]" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Focus Keywords (comma separated)</label>
                  <input type="text" maxLength={500} value={prodForm.focusKeywords} onChange={(e) => setProdForm({ ...prodForm, focusKeywords: e.target.value })} placeholder="pink salt, natural salt, NUSAIFA SPICES" className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Image ALT Text (English)</label>
                    <input type="text" maxLength={250} value={prodForm.imageAltEn} onChange={(e) => setProdForm({ ...prodForm, imageAltEn: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Image ALT Text (বাংলা)</label>
                    <input type="text" maxLength={250} value={prodForm.imageAltBn} onChange={(e) => setProdForm({ ...prodForm, imageAltBn: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4]" />
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8F6F1] border border-[#E5E0D5] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={prodForm.imageUrl}
                    alt="Preview"
                    className="w-14 h-14 rounded-lg object-cover bg-white border border-[#E5E0D5]"
                  />
                  <div>
                    <p className="text-xs font-semibold text-[#141A17]">Product Photography</p>
                    <p className="text-[11px] text-[#59645F] truncate max-w-[240px]">
                      {prodForm.imageUrl}
                    </p>
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-[#D6D0C4] text-xs font-semibold cursor-pointer hover:border-[#075B42]">
                  <ImageIcon className="w-4 h-4 text-[#075B42]" />
                  <span>Upload New Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleImageUpload(e, (url) => setProdForm((p) => ({ ...p, imageUrl: url })))
                    }
                  />
                </label>
              </div>

              <div className="flex items-center gap-6 text-xs font-medium">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={prodForm.isFeatured}
                    onChange={(e) => setProdForm({ ...prodForm, isFeatured: e.target.checked })}
                    className="accent-[#075B42]"
                  />
                  <span>Featured Product</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={prodForm.isActive}
                    onChange={(e) => setProdForm({ ...prodForm, isActive: e.target.checked })}
                    className="accent-[#075B42]"
                  />
                  <span>Active in Storefront</span>
                </label>
              </div>

              <div className="pt-3 border-t border-[#E5E0D5] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#D6D0C4] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#075B42] text-white text-xs font-semibold hover:bg-[#054431]"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
