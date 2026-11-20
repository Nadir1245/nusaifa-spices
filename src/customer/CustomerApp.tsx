import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
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
import { useCart } from './CartContext.tsx';
import { CheckoutPage } from './CheckoutPage.tsx';
import {
  CustomerAccountPage,
  EditorialContentPage,
  OrderConfirmationView,
  OrderTrackingPage,
  ProductDetailView,
} from './CustomerPages.tsx';
import { ProductCard } from './ProductCard.tsx';

export type CustomerRoute =
  | 'home'
  | 'product'
  | 'checkout'
  | 'confirmed'
  | 'track'
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

  const primaryBanner = banners[0] || {
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
    <div className="min-h-screen flex flex-col bg-white text-[#141A17]">
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
            {/* Section 1: Editorial Hero */}
            <section className="bg-[#F8F6F1] border-b border-[#E5E0D5]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
                <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
                  <div className="text-xs font-semibold tracking-widest uppercase text-[#8E6F16]">
                    {lang === 'bn'
                      ? (siteContent.find((item) => item.key === 'homepage_tagline')?.valueBn || 'প্রাকৃতিক মসলা · অর্গানিক খাদ্য · ভেষজ সংগ্রহ')
                      : (siteContent.find((item) => item.key === 'homepage_tagline')?.valueEn || 'Natural Spices · Organic Food · Herbal Wellness')}
                  </div>

                  <h1 className="text-4xl sm:text-5xl font-semibold text-[#141A17] leading-[1.1] text-balance">
                    {lang === 'bn' ? primaryBanner.titleBn : primaryBanner.titleEn}
                  </h1>

                  <p className="text-base text-[#4B5651] leading-relaxed max-w-lg">
                    {lang === 'bn' ? primaryBanner.subtitleBn : primaryBanner.subtitleEn}
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => scrollToCatalog(primaryBanner.targetCategorySlug || 'all')}
                      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#075B42] text-white text-sm font-semibold hover:bg-[#054431] transition-colors"
                    >
                      <span>
                        {lang === 'bn' ? primaryBanner.ctaLabelBn : primaryBanner.ctaLabelEn}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => goRoute('track')}
                      className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-[#D6D0C4] bg-white text-sm font-semibold text-[#141A17] hover:border-[#075B42] transition-colors"
                    >
                      {t(lang, 'navTrack')}
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <div className="nusaifa-product-stage relative min-h-[390px] lg:min-h-[420px] rounded-2xl overflow-hidden border border-[#E5E0D5]">
                    <div className="nusaifa-stage-glow" aria-hidden="true" />

                    <div className="nusaifa-product-card nusaifa-float-1">
                      <img src="/products/product_sundarban_honey_1794680615767.jpg" alt="Sundarban Honey" />
                      <span>{lang === 'bn' ? 'সুন্দরবনের মধু' : 'Sundarban Honey'}</span>
                    </div>

                    <div className="nusaifa-product-card nusaifa-float-2">
                      <img src="/products/product_moringa_superfood_1794680617098.jpg" alt="Moringa Powder" />
                      <span>{lang === 'bn' ? 'মরিঙ্গা পাউডার' : 'Moringa Powder'}</span>
                    </div>

                    <div className="nusaifa-product-card nusaifa-float-3">
                      <img src="/products/product_turmeric_powder_1794680615609.jpg" alt="Turmeric Powder" />
                      <span>{lang === 'bn' ? 'হলুদ গুঁড়া' : 'Turmeric Powder'}</span>
                    </div>

                    <div className="nusaifa-product-card nusaifa-float-4">
                      <img src="/products/product_black_seed_oil_1794680616988.jpg" alt="Black Seed Oil" />
                      <span>{lang === 'bn' ? 'কালোজিরার তেল' : 'Black Seed Oil'}</span>
                    </div>

                    <div className="nusaifa-product-card nusaifa-float-5">
                      <img src="/products/product_garam_masala_1794680617882.jpg" alt="Garam Masala" />
                      <span>{lang === 'bn' ? 'গরম মসলা' : 'Garam Masala'}</span>
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

        {route === 'track' && (
          <OrderTrackingPage lang={lang} initialOrder={trackedOrder} />
        )}

        {route === 'account' && (
          <CustomerAccountPage
            lang={lang}
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
        <div className="border-t border-[#E5E0D5] py-4 px-4 sm:px-6 max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-[#59645F]">
          <span>© {new Date().getFullYear()} NUSAIFA SPICES. All rights reserved.</span>
          <span>Mirwarispur, Begumganj, Chowmuhani, Noakhali 3823, Bangladesh</span>
        </div>
      </footer>
    </div>
  );
};
