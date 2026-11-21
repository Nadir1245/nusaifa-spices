import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  House,
  LayoutGrid,
  MessageCircle,
  UserRound,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import type {
  Category,
  DeliverySettings,
  Language,
  Order,
  Product,
  PromotionalBanner,
  SiteContentItem,
  UserPublic,
} from '../shared/types.ts';
import { formatBdt, t } from '../lib/i18n.ts';
import { api } from '../lib/api.ts';
import { useCart } from './CartContext.tsx';
import { CheckoutPage } from './CheckoutPage.tsx';
import {
  CustomerAccountPage,
  EditorialContentPage,
  OrderConfirmationView,
  OrderTrackingPage,
  ProductDetailView,
  WishlistPage,
} from './CustomerPages.tsx';
import { ProductCard } from './ProductCard.tsx';

export type CustomerRoute =
  | 'home'
  | 'product'
  | 'checkout'
  | 'confirmed'
  | 'track'
  | 'wishlist'
  | 'account'
  | 'about'
  | 'contact'
  | 'privacy'
  | 'returns'
  | 'terms';

interface CustomerAppProps {
  lang: Language;
  onToggleLang: () => void;
  categories: Category[];
  products: Product[];
  banners: PromotionalBanner[];
  deliverySettings: DeliverySettings;
  siteContent: SiteContentItem[];
  publicSettings: {
    checkoutEnabled: boolean;
    orderAcceptanceEnabled: boolean;
    customerLoginEnabled: boolean;
    customerRegistrationEnabled: boolean;
    wishlistEnabled: boolean;
  };
  user: UserPublic | null;
  onAuthChange: (user: UserPublic | null) => void;
  onRefreshStorefront: () => Promise<void>;
  onNavigateAdmin: () => void;
}

export const CustomerApp: React.FC<CustomerAppProps> = ({
  lang,
  onToggleLang,
  categories,
  products,
  banners,
  deliverySettings,
  siteContent,
  publicSettings,
  user,
  onAuthChange,
  onRefreshStorefront,
  onNavigateAdmin,
}) => {
  const {
    items,
    drawerOpen,
    setDrawerOpen,
    addToCart,
    updateQuantity,
    removeFromCart,
    totalItems,
    getSubtotal,
  } = useCart();

  const [route, setRoute] = useState<CustomerRoute>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [activeCatSlug, setActiveCatSlug] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc'>('featured');
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  useEffect(() => {
    if (!publicSettings.wishlistEnabled || !user || user.role !== 'customer') {
      setWishlistProducts([]);
      return;
    }

    api.getWishlist()
      .then(setWishlistProducts)
      .catch(() => setWishlistProducts([]));
  }, [user?.id, user?.role, publicSettings.wishlistEnabled]);

  const announcementItem = siteContent.find((s) => s.key === 'announcement_bar');
  const announcementText = announcementItem
    ? lang === 'bn'
      ? announcementItem.valueBn
      : announcementItem.valueEn
    : '';
  const announcementTextColor = lang === 'bn'
    ? announcementItem?.textColorBn ?? '#FFFFFF'
    : announcementItem?.textColorEn ?? '#FFFFFF';
  const announcementBackgroundColor = lang === 'bn'
    ? announcementItem?.backgroundColorBn ?? '#075B42'
    : announcementItem?.backgroundColorEn ?? '#075B42';

  const activeBanners = banners
    .filter((banner) => banner.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const fallbackBanner = {
    id: 'fallback',
    titleEn: 'Quality Products from Trusted Brands',
    titleBn: 'বিশ্বস্ত ব্র্যান্ডের মানসম্মত পণ্য',
    subtitleEn:
      'Explore sealed spices and natural food products in their original manufacturer packaging.',
    subtitleBn:
      'মূল প্রস্তুতকারকের সিল ও লেবেল অক্ষুণ্ণ থাকা মসলা ও প্রাকৃতিক খাদ্যপণ্য ঘরে বসেই অর্ডার করুন।',
    ctaLabelEn: 'Shop Collection',
    ctaLabelBn: 'পণ্যসমূহ দেখুন',
    targetCategorySlug: 'all',
    imageUrl: '/src/assets/images/hero_nusaifa_spices_1794680614693.jpg',
    isActive: true,
    sortOrder: 1,
    createdAt: '',
  };

  const primaryBanner =
    activeBanners[activeBannerIndex % (activeBanners.length || 1)] || fallbackBanner;

  useEffect(() => {
    if (activeBanners.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveBannerIndex((current) => (current + 1) % activeBanners.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [activeBanners.length]);

  const filteredProducts = useMemo(() => {
    const activeCat = categories.find((c) => c.slug === activeCatSlug);
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      if (activeCat && p.categoryId !== activeCat.id) return false;
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

    const getEff = (p: Product) =>
      p.discountPriceBdt !== null && p.discountPriceBdt < p.priceBdt
        ? p.discountPriceBdt
        : p.priceBdt;

    if (sortBy === 'price_asc') return [...list].sort((a, b) => getEff(a) - getEff(b));
    if (sortBy === 'price_desc') return [...list].sort((a, b) => getEff(b) - getEff(a));
    return list;
  }, [products, categories, activeCatSlug, searchQuery, sortBy]);

  const subtotal = getSubtotal(products);

  const goRoute = (next: CustomerRoute) => {
    setRoute(next);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleWishlist = async (product: Product) => {
    if (!user || user.role !== 'customer') {
      alert(lang === 'bn'
        ? 'উইশলিস্ট ব্যবহার করতে আগে লগইন করুন।'
        : 'Please log in to use your wishlist.');
      goRoute('account');
      return;
    }

    if (!publicSettings.wishlistEnabled) return;

    const alreadySaved = wishlistProducts.some((item) => item.id === product.id);

    try {
      if (alreadySaved) {
        await api.removeWishlistItem(product.id);
        setWishlistProducts((current) => current.filter((item) => item.id !== product.id));
      } else {
        await api.addWishlistItem(product.id);
        setWishlistProducts((current) =>
          current.some((item) => item.id === product.id)
            ? current
            : [...current, product]
        );
      }
    } catch {
      alert(lang === 'bn'
        ? 'উইশলিস্ট আপডেট করা যায়নি। আবার চেষ্টা করুন।'
        : 'Could not update wishlist. Please try again.');
    }
  };

  const handleRemoveWishlist = async (product: Product) => {
    try {
      await api.removeWishlistItem(product.id);
      setWishlistProducts((current) =>
        current.filter((item) => item.id !== product.id)
      );
    } catch {
      alert(lang === 'bn'
        ? 'উইশলিস্ট থেকে সরানো যায়নি। আবার চেষ্টা করুন।'
        : 'Could not remove this item. Please try again.');
    }
  };

  const scrollToCatalog = (catSlug = 'all') => {
    setActiveCatSlug(catSlug);
    if (route !== 'home') {
      setRoute('home');
      window.setTimeout(() => {
        document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#141A17] pb-20 md:pb-0">
      {/* Slim Dismissible Announcement Bar (<= 36px) */}
      {showAnnouncement && (
        <div className="text-xs h-9 px-4 flex items-center justify-between gap-4" style={{ color: announcementTextColor, backgroundColor: announcementBackgroundColor }}>
          <p className="truncate font-medium tracking-wide">{announcementText}</p>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onToggleLang}
              className="px-2 py-0.5 rounded border border-white/25 hover:bg-white/10 text-[11px] font-semibold whitespace-nowrap shrink-0"
            >
              {lang === 'en' ? 'বাংলা' : 'English'}
            </button>
            <button
              type="button"
              aria-label="Dismiss announcement"
              onClick={() => setShowAnnouncement(false)}
              className="text-white/80 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Clean 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[#F8F6EC]/95 backdrop-blur-md border-b border-[#C9A646] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element wordmark */}
          <button
            type="button"
            onClick={() => goRoute('home')}
            className="flex items-center shrink-0"
          >
            <img
              src="/nusaifa-logo.png"
              alt="NUSAIFA SPICES"
              className="h-12 w-auto max-w-[180px] object-contain"
            />
          </button>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#3A433E]">
            <button
              type="button"
              onClick={() => scrollToCatalog('all')}
              className="hover:text-[#075B42] transition-colors whitespace-nowrap shrink-0"
            >
              {t(lang, 'navShop')}
            </button>
            <button
              type="button"
              onClick={() => goRoute('track')}
              className="hover:text-[#075B42] transition-colors whitespace-nowrap shrink-0"
            >
              {t(lang, 'navTrack')}
            </button>
            {publicSettings.wishlistEnabled && (
              <button
                type="button"
                onClick={() => goRoute(user?.role === 'customer' ? 'wishlist' : 'account')}
                className="hover:text-[#075B42] transition-colors whitespace-nowrap shrink-0"
              >
                {lang === 'bn' ? 'উইশলিস্ট' : 'Wishlist'}
              </button>
            )}
            <button
              type="button"
              onClick={() => goRoute('about')}
              className="hover:text-[#075B42] transition-colors whitespace-nowrap shrink-0"
            >
              {t(lang, 'navAbout')}
            </button>
            <button
              type="button"
              onClick={() => goRoute('contact')}
              className="hover:text-[#075B42] transition-colors whitespace-nowrap shrink-0"
            >
              {t(lang, 'navContact')}
            </button>
            <button
              type="button"
              onClick={() => goRoute('account')}
              className="hover:text-[#075B42] transition-colors whitespace-nowrap shrink-0"
            >
              {user ? user.fullName.split(' ')[0] : t(lang, 'navAccount')}
            </button>
          </nav>

          {/* Zone 3: 1 primary action (Bag) + mobile menu toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#075B42] text-white text-xs font-semibold hover:bg-[#054431] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="tabular-nums">
                {t(lang, 'bag')} ({totalItems})
              </span>
            </button>

            <button
              type="button"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg border border-[#E5E0D5] text-[#141A17]"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E5E0D5] bg-white px-4 py-4 space-y-2 text-sm font-medium">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                scrollToCatalog('all');
              }}
              className="block w-full text-left py-2 text-[#141A17]"
            >
              {t(lang, 'navShop')}
            </button>
            <button
              type="button"
              onClick={() => goRoute('track')}
              className="block w-full text-left py-2 text-[#141A17]"
            >
              {t(lang, 'navTrack')}
            </button>
            {publicSettings.wishlistEnabled && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  goRoute(user?.role === 'customer' ? 'wishlist' : 'account');
                }}
                className="block w-full text-left py-2 text-[#141A17]"
              >
                {lang === 'bn' ? 'উইশলিস্ট' : 'Wishlist'}
              </button>
            )}
            <button
              type="button"
              onClick={() => goRoute('about')}
              className="block w-full text-left py-2 text-[#141A17]"
            >
              {t(lang, 'navAbout')}
            </button>
            <button
              type="button"
              onClick={() => goRoute('contact')}
              className="block w-full text-left py-2 text-[#141A17]"
            >
              {t(lang, 'navContact')}
            </button>
            <button
              type="button"
              onClick={() => goRoute('account')}
              className="block w-full text-left py-2 text-[#141A17]"
            >
              {t(lang, 'navAccount')}
            </button>
            <button
              type="button"
              onClick={() => {
                onToggleLang();
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 text-[#075B42] font-semibold"
            >
              {lang === 'en' ? 'বাংলা ভাষায় দেখুন' : 'Switch to English'}
            </button>
          </div>
        )}
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1">
        {route === 'home' && (
          <>
            {/* Section 1: Premium Promotional Slider */}
            <section className="bg-[#F8F6F1] border-b border-[#E5E0D5]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-10">
                <div className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-[#063D2E] border border-[#B99A4A]/40 shadow-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#075B42] via-[#064431] to-[#10291F]" />

                  <div className="relative grid grid-cols-1 lg:grid-cols-2 min-h-[440px] lg:min-h-[480px]">
                    <div className="relative z-10 flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
                      <div className="inline-flex items-center gap-2 text-[#E6C875] text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase mb-6">
                        <span className="w-7 h-px bg-[#D7B65B]" />
                        NUSAIFA SPICES
                        <span className="w-7 h-px bg-[#D7B65B]" />
                      </div>

                      <h1
                        key={primaryBanner.id + '-' + lang}
                        className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-[1.2] text-balance"
                      >
                        {lang === 'bn' ? primaryBanner.titleBn : primaryBanner.titleEn}
                      </h1>

                      <p className="mt-5 text-sm sm:text-base text-white/80 leading-relaxed max-w-lg">
                        {lang === 'bn' ? primaryBanner.subtitleBn : primaryBanner.subtitleEn}
                      </p>

                      <div className="mt-8 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => scrollToCatalog(primaryBanner.targetCategorySlug || 'all')}
                          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#D7B65B] text-[#17251C] text-sm font-bold hover:bg-[#E8CB7D] transition-colors shadow-lg"
                        >
                          <span>
                            {lang === 'bn' ? primaryBanner.ctaLabelBn : primaryBanner.ctaLabelEn}
                          </span>
                          <ArrowRight className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => goRoute('track')}
                          className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-white/30 bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors"
                        >
                          {t(lang, 'navTrack')}
                        </button>
                      </div>

                      {activeBanners.length > 1 && (
                        <div className="flex items-center gap-2 mt-9" aria-label="Slider indicators">
                          {activeBanners.map((banner, index) => (
                            <button
                              key={banner.id}
                              type="button"
                              onClick={() => setActiveBannerIndex(index)}
                              aria-label={`Go to slide ${index + 1}`}
                              aria-current={index === activeBannerIndex ? 'true' : undefined}
                              className={`h-2.5 rounded-full transition-all ${
                                index === activeBannerIndex
                                  ? 'w-8 bg-[#D7B65B]'
                                  : 'w-2.5 bg-white/40 hover:bg-white/70'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative min-h-[260px] sm:min-h-[340px] lg:min-h-full p-4 sm:p-6 lg:p-8">
                      <div className="absolute inset-4 sm:inset-6 lg:inset-8 rounded-2xl overflow-hidden border border-[#D7B65B]/40 bg-[#173F31]">
                        {primaryBanner.imageUrl ? (
                          <img
                            key={primaryBanner.id}
                            src={primaryBanner.imageUrl}
                            alt={lang === 'bn' ? primaryBanner.titleBn : primaryBanner.titleEn}
                            className="w-full h-full min-h-[260px] sm:min-h-[340px] lg:min-h-[400px] object-cover"
                          />
                        ) : (
                          <div className="w-full h-full min-h-[260px] flex items-center justify-center text-[#D7B65B] text-2xl font-semibold">
                            NUSAIFA SPICES
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#071E16]/35 via-transparent to-transparent pointer-events-none" />
                      </div>

                      {activeBanners.length > 1 && (
                        <div className="absolute bottom-8 right-8 sm:bottom-10 sm:right-10 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveBannerIndex((current) =>
                                (current - 1 + activeBanners.length) % activeBanners.length
                              )
                            }
                            aria-label="Previous banner"
                            className="w-10 h-10 rounded-full bg-[#F8F6F1] text-[#075B42] flex items-center justify-center shadow-lg hover:bg-[#D7B65B] transition-colors"
                          >
                            <span aria-hidden="true">←</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveBannerIndex((current) =>
                                (current + 1) % activeBanners.length
                              )
                            }
                            aria-label="Next banner"
                            className="w-10 h-10 rounded-full bg-[#F8F6F1] text-[#075B42] flex items-center justify-center shadow-lg hover:bg-[#D7B65B] transition-colors"
                          >
                            <span aria-hidden="true">→</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Catalog & Interactive Category Filter */}
            <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6 py-14 space-y-8">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-semibold text-[#141A17]">
                    {lang === 'bn'
                      ? (siteContent.find((item) => item.key === 'catalog_title')?.valueBn || 'আমাদের নির্বাচিত পণ্যসমূহ')
                      : (siteContent.find((item) => item.key === 'catalog_title')?.valueEn || 'Our Selected Collection')}
                  </h2>
                  <p className="mt-1.5 text-sm text-[#59645F]">
                    {lang === 'bn'
                      ? (siteContent.find((item) => item.key === 'catalog_subtitle')?.valueBn || 'বিশ্বস্ত প্রস্তুতকারকের মূল সিল ও প্যাকেটে মসলা ও প্রাকৃতিক খাদ্যপণ্য অর্ডার করুন।')
                      : (siteContent.find((item) => item.key === 'catalog_subtitle')?.valueEn || 'Small-batch botanicals priced in BDT (৳) with nationwide Cash on Delivery')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 text-[#59645F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t(lang, 'searchPlaceholder')}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm focus:outline-none focus:border-[#075B42]"
                    />
                  </div>

                  <select
                    aria-label="Sort products"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] bg-white text-sm text-[#141A17] focus:outline-none focus:border-[#075B42]"
                  >
                    <option value="featured">{t(lang, 'sortFeatured')}</option>
                    <option value="price_asc">{t(lang, 'sortPriceLow')}</option>
                    <option value="price_desc">{t(lang, 'sortPriceHigh')}</option>
                  </select>
                </div>
              </div>

              {/* Interactive Category Filter Buttons */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setActiveCatSlug('all')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
                    activeCatSlug === 'all'
                      ? 'bg-[#075B42] text-white'
                      : 'bg-[#F8F6F1] text-[#3A433E] border border-[#E5E0D5] hover:border-[#075B42]'
                  }`}
                >
                  {t(lang, 'allCategories')}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCatSlug(cat.slug)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
                      activeCatSlug === cat.slug
                        ? 'bg-[#075B42] text-white'
                        : 'bg-[#F8F6F1] text-[#3A433E] border border-[#E5E0D5] hover:border-[#075B42]'
                    }`}
                  >
                    {lang === 'bn' ? cat.nameBn : cat.nameEn}
                  </button>
                ))}
              </div>

              {filteredProducts.length === 0 ? (
                <div className="p-12 rounded-2xl bg-[#F8F6F1] border border-[#E5E0D5] text-center">
                  <p className="text-base font-medium text-[#141A17]">
                    {lang === 'bn' ? 'কোনো পণ্য পাওয়া যায়নি।' : 'No products match your filter.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCatSlug('all');
                      setSearchQuery('');
                    }}
                    className="mt-4 px-4 py-2 rounded-lg bg-[#075B42] text-white text-xs font-semibold"
                  >
                    {lang === 'bn' ? 'সব পণ্য দেখুন' : 'Reset Filters'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      category={categories.find((c) => c.id === product.categoryId)}
                      lang={lang}
                      onSelect={(p) => {
                        setSelectedProduct(p);
                        goRoute('product');
                      }}
                      onAdd={(p) => addToCart(p.id, 1)}
                      wishlistEnabled={publicSettings.wishlistEnabled}
                      isWishlisted={wishlistProducts.some((item) => item.id === product.id)}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Section 3: Provenance & Delivery Promise */}
            <section className="bg-[#075B42] text-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <p className="text-xs font-semibold tracking-widest uppercase text-[#D4AF37]">
                    {lang === 'bn' ? 'বিশ্বস্ত ব্র্যান্ড' : 'Trusted Brands'}
                  </p>
                  <h3 className="text-xl font-semibold">
                    {lang === 'bn' ? 'প্রস্তুতকারকের মূল প্যাকেট' : 'Original Manufacturer Packaging'}
                  </h3>
                  <p className="text-sm text-white/80 leading-relaxed">
                    {lang === 'bn'
                      ? 'পণ্যের মূল লেবেল, উপাদান ও প্রস্তুতকারকের তথ্য অক্ষুণ্ণ রাখা হয়।'
                      : 'Original product labels and manufacturer information remain intact.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold tracking-widest uppercase text-[#D4AF37]">
                    {lang === 'bn' ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery'}
                  </p>
                  <h3 className="text-xl font-semibold">
                    {lang === 'bn' ? 'আগে অর্ডার, হাতে পেয়ে পেমেন্ট' : 'Order First, Pay at Doorstep'}
                  </h3>
                  <p className="text-sm text-white/80 leading-relaxed">
                    {lang === 'bn'
                      ? `ঢাকা সিটি ${formatBdt(deliverySettings.insideDhakaBdt)}, ঢাকার বাইরে ${formatBdt(deliverySettings.outsideDhakaBdt)} এবং ${formatBdt(deliverySettings.freeDeliveryThresholdBdt)}+ অর্ডারে ফ্রি ডেলিভারি।`
                      : `Inside Dhaka ${formatBdt(deliverySettings.insideDhakaBdt)} · Outside Dhaka ${formatBdt(deliverySettings.outsideDhakaBdt)} · Free over ${formatBdt(deliverySettings.freeDeliveryThresholdBdt)}.`}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold tracking-widest uppercase text-[#D4AF37]">
                    {lang === 'bn' ? 'পণ্যের তথ্য' : 'Product Information'}
                  </p>
                  <h3 className="text-xl font-semibold">
                    {lang === 'bn' ? 'লেবেল দেখে পণ্য যাচাই করুন' : 'Check Original Product Labels'}
                  </h3>
                  <p className="text-sm text-white/80 leading-relaxed">
                    {lang === 'bn'
                      ? 'উপাদান, প্রস্তুতকারক, ব্যাচ নম্বর ও মেয়াদ মূল প্যাকেটের লেবেলে দেখুন।'
                      : 'Check ingredients, manufacturer details, batch number and expiry on the original label.'}
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {route === 'product' && selectedProduct && (
          <ProductDetailView
            product={selectedProduct}
            category={categories.find((c) => c.id === selectedProduct.categoryId)}
            lang={lang}
            onAdd={(p, qty) => {
              addToCart(p.id, qty);
              setDrawerOpen(true);
            }}
            onBack={() => goRoute('home')}
          />
        )}

        {route === 'checkout' && (
          <CheckoutPage
            lang={lang}
            products={products}
            deliverySettings={deliverySettings}
            checkoutEnabled={publicSettings.checkoutEnabled}
            orderAcceptanceEnabled={publicSettings.orderAcceptanceEnabled}
            user={user}
            onOrderConfirmed={(order) => {
              setConfirmedOrder(order);
              onRefreshStorefront().catch(() => {});
              goRoute('confirmed');
            }}
            onBack={() => goRoute('home')}
          />
        )}

        {route === 'confirmed' && confirmedOrder && (
          <OrderConfirmationView
            order={confirmedOrder}
            lang={lang}
            onTrackOrder={(ord) => {
              setTrackedOrder(ord);
              goRoute('track');
            }}
            onContinue={() => goRoute('home')}
          />
        )}

        {route === 'wishlist' && user?.role === 'customer' && publicSettings.wishlistEnabled && (
          <WishlistPage
            lang={lang}
            products={wishlistProducts}
            onRemove={handleRemoveWishlist}
            onAdd={(product) => addToCart(product.id, 1)}
            onSelect={(product) => {
              setSelectedProduct(product);
              goRoute('product');
            }}
          />
        )}

        {route === 'track' && (
          <OrderTrackingPage lang={lang} initialOrder={trackedOrder} />
        )}

        {route === 'account' && (
          <CustomerAccountPage
            lang={lang}
            customerLoginEnabled={publicSettings.customerLoginEnabled}
            customerRegistrationEnabled={publicSettings.customerRegistrationEnabled}
            user={user}
            onAuthChange={onAuthChange}
            onTrackOrder={(ord) => {
              setTrackedOrder(ord);
              goRoute('track');
            }}
          />
        )}

        {(route === 'about' ||
          route === 'contact' ||
          route === 'privacy' ||
          route === 'returns' ||
          route === 'terms') && (
          <EditorialContentPage pageKey={route} lang={lang} siteContent={siteContent} />
        )}
      </main>

      {/* Slide-Over Shopping Bag Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
            <div className="px-6 py-5 border-b border-[#E5E0D5] flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#141A17]">
                {t(lang, 'bag')} ({totalItems})
              </h2>
              <button
                type="button"
                aria-label="Close bag"
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-lg hover:bg-[#F8F6F1]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-[#E5E0D5]">
              {items.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <p className="font-semibold text-[#141A17]">{t(lang, 'emptyBagTitle')}</p>
                  <p className="text-sm text-[#59645F]">{t(lang, 'emptyBagDesc')}</p>
                </div>
              ) : (
                items.map((item) => {
                  const prod = products.find((p) => p.id === item.productId);
                  if (!prod) return null;
                  const unit =
                    prod.discountPriceBdt !== null && prod.discountPriceBdt < prod.priceBdt
                      ? prod.discountPriceBdt
                      : prod.priceBdt;
                  return (
                    <div key={item.productId} className="py-4 flex gap-4">
                      <img
                        src={prod.imageUrl}
                        alt={lang === 'bn' ? prod.nameBn : prod.nameEn}
                        className="w-16 h-16 rounded-lg object-cover bg-[#F8F6F1] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-[#141A17] truncate">
                            {lang === 'bn' ? prod.nameBn : prod.nameEn}
                          </p>
                          <button
                            type="button"
                            aria-label="Remove item"
                            onClick={() => removeFromCart(item.productId)}
                            className="text-[#727D78] hover:text-rose-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-[#59645F]">{prod.weightLabel}</p>
                        <div className="mt-2.5 flex items-center justify-between">
                          <div className="inline-flex items-center border border-[#D6D0C4] rounded-md">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              className="p-1.5 hover:bg-[#F8F6F1]"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2.5 text-xs font-mono-tabular font-semibold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              className="p-1.5 hover:bg-[#F8F6F1]"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="text-sm font-semibold text-[#075B42] font-mono-tabular">
                            {formatBdt(unit * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 border-t border-[#E5E0D5] bg-[#F8F6F1] space-y-4">
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>{t(lang, 'subtotal')}</span>
                  <span className="text-xl text-[#075B42] font-mono-tabular">
                    {formatBdt(subtotal)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    goRoute('checkout');
                  }}
                  className="w-full py-3.5 rounded-xl bg-[#075B42] text-white text-sm font-semibold hover:bg-[#054431] transition-colors"
                >
                  {t(lang, 'checkout')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clean Footer */}
      <footer className="bg-[#F8F6F1] border-t border-[#E5E0D5] text-sm text-[#4B5651]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <p className="font-display text-2xl font-bold text-[#075B42]">NUSAIFA SPICES</p>
            <p className="text-xs leading-relaxed text-[#59645F]">
              {lang === 'bn'
                ? 'বাংলাদেশের খাঁটি প্রাকৃতিক মসলা, সুন্দরবনের মধু, ভেষজ ও অর্গানিক খাদ্যপণ্য।'
                : 'Pure Bangladeshi natural spices, raw forest honey, herbal remedies, and organic superfoods.'}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#141A17]">
              {lang === 'bn' ? 'ক্যাটাগরি' : 'Categories'}
            </p>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => scrollToCatalog(c.slug)}
                className="block text-left text-xs hover:text-[#075B42]"
              >
                {lang === 'bn' ? c.nameBn : c.nameEn}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#141A17]">
              {lang === 'bn' ? 'নীতিমালা ও সহায়তা' : 'Policies & Support'}
            </p>
            <button
              type="button"
              onClick={() => goRoute('track')}
              className="block text-left text-xs hover:text-[#075B42]"
            >
              {t(lang, 'navTrack')}
            </button>
            <button
              type="button"
              onClick={() => goRoute('privacy')}
              className="block text-left text-xs hover:text-[#075B42]"
            >
              {lang === 'bn' ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}
            </button>
            <button
              type="button"
              onClick={() => goRoute('returns')}
              className="block text-left text-xs hover:text-[#075B42]"
            >
              {lang === 'bn' ? 'রিটার্ন ও রিফান্ড নীতি' : 'Return & Refund Policy'}
            </button>
            <button
              type="button"
              onClick={() => goRoute('terms')}
              className="block text-left text-xs hover:text-[#075B42]"
            >
              {lang === 'bn' ? 'শর্তাবলী' : 'Terms & Conditions'}
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#141A17]">
              {lang === 'bn' ? 'প্ল্যাটফর্ম' : 'Platform'}
            </p>
            <button
              type="button"
              onClick={() => goRoute('about')}
              className="block text-left text-xs hover:text-[#075B42]"
            >
              {t(lang, 'navAbout')}
            </button>
            <button
              type="button"
              onClick={() => goRoute('contact')}
              className="block text-left text-xs hover:text-[#075B42]"
            >
              {t(lang, 'navContact')}
            </button>
            <button
              type="button"
              onClick={onToggleLang}
              className="block text-left text-xs font-medium text-[#075B42]"
            >
              {lang === 'en' ? 'বাংলা সংস্করণ (BN)' : 'English Version (EN)'}
            </button>
            <button
              type="button"
              onClick={onNavigateAdmin}
              className="block text-left text-xs font-semibold text-[#8E6F16] hover:underline pt-1"
            >
              {t(lang, 'adminPortal')} →
            </button>
          </div>
        </div>
        {[
          { key: 'social_facebook', label: 'Facebook', symbol: 'f' },
          { key: 'social_whatsapp', label: 'WhatsApp', symbol: '◉' },
          { key: 'social_instagram', label: 'Instagram', symbol: '◎' },
          { key: 'social_youtube', label: 'YouTube', symbol: '▶' },
          { key: 'social_tiktok', label: 'TikTok', symbol: '♪' },
        ].filter((social) => siteContent.find((item) => item.key === social.key)?.valueEn?.trim()).length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6 flex flex-wrap items-center justify-center gap-3">
            {[
              { key: 'social_facebook', label: 'Facebook', symbol: 'f' },
              { key: 'social_whatsapp', label: 'WhatsApp', symbol: '◉' },
              { key: 'social_instagram', label: 'Instagram', symbol: '◎' },
              { key: 'social_youtube', label: 'YouTube', symbol: '▶' },
              { key: 'social_tiktok', label: 'TikTok', symbol: '♪' },
            ].map((social) => {
              const url = siteContent.find((item) => item.key === social.key)?.valueEn?.trim();
              return url ? (
                <a
                  key={social.key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  title={social.label}
                  className="w-10 h-10 rounded-full border border-[#D6D0C4] bg-white text-[#075B42] hover:bg-[#075B42] hover:text-white flex items-center justify-center text-lg font-bold transition-colors"
                >
                  {social.symbol}
                </a>
              ) : null;
            })}
          </div>
        )}
        <div className="border-t border-[#E5E0D5] py-4 px-4 sm:px-6 max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-[#59645F]">
          <span>© {new Date().getFullYear()} NUSAIFA SPICES. All rights reserved.</span>
          <span>Mirwarispur, Begumganj, Chowmuhani, Noakhali 3823, Bangladesh</span>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label={lang === 'bn' ? 'মোবাইল নেভিগেশন' : 'Mobile navigation'}
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#E5E0D5] bg-white/95 backdrop-blur-md shadow-[0_-4px_18px_rgba(0,0,0,0.07)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="max-w-xl mx-auto grid grid-cols-5">
          <button
            type="button"
            onClick={() => goRoute('home')}
            aria-label={lang === 'bn' ? 'হোম' : 'Home'}
            className={`min-h-16 flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${
              route === 'home' ? 'text-[#075B42]' : 'text-[#68736D] hover:text-[#075B42]'
            }`}
          >
            <House className="w-5 h-5" />
            <span>{lang === 'bn' ? 'হোম' : 'Home'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              scrollToCatalog('all');
            }}
            aria-label={lang === 'bn' ? 'ক্যাটাগরি' : 'Categories'}
            className="min-h-16 flex flex-col items-center justify-center gap-1 text-[10px] font-semibold text-[#68736D] hover:text-[#075B42] transition-colors"
          >
            <LayoutGrid className="w-5 h-5" />
            <span>{lang === 'bn' ? 'ক্যাটাগরি' : 'Categories'}</span>
          </button>

          <button
            type="button"
            onClick={() => goRoute('contact')}
            aria-label={lang === 'bn' ? 'যোগাযোগ' : 'Message'}
            className={`min-h-16 flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${
              route === 'contact' ? 'text-[#075B42]' : 'text-[#68736D] hover:text-[#075B42]'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            <span>{lang === 'bn' ? 'মেসেজ' : 'Message'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              setDrawerOpen(true);
            }}
            aria-label={lang === 'bn' ? 'কার্ট' : 'Cart'}
            className="min-h-16 flex flex-col items-center justify-center gap-1 text-[10px] font-semibold text-[#68736D] hover:text-[#075B42] transition-colors"
          >
            <span className="relative">
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#C49A45] text-white text-[9px] flex items-center justify-center">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </span>
            <span>{lang === 'bn' ? 'কার্ট' : 'Cart'}</span>
          </button>

          <button
            type="button"
            onClick={() => goRoute('account')}
            aria-label={lang === 'bn' ? 'অ্যাকাউন্ট' : 'Account'}
            className={`min-h-16 flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${
              route === 'account' ? 'text-[#075B42]' : 'text-[#68736D] hover:text-[#075B42]'
            }`}
          >
            <UserRound className="w-5 h-5" />
            <span>{lang === 'bn' ? 'অ্যাকাউন্ট' : 'Account'}</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
