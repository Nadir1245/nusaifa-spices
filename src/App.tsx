import { useCallback, useEffect, useState } from 'react';
import { AdminApp } from './admin/AdminApp.tsx';
import { CartProvider } from './customer/CartContext.tsx';
import { CustomerApp } from './customer/CustomerApp.tsx';
import { api } from './lib/api.ts';
import type {
  Category,
  DeliverySettings,
  Language,
  Product,
  PromotionalBanner,
  SiteContentItem,
  UserPublic,
} from './shared/types.ts';

export default function App() {
  const [appMode, setAppMode] = useState<'customer' | 'admin'>(() =>
    window.location.pathname.startsWith('/admin') ? 'admin' : 'customer'
  );
  const [lang, setLang] = useState<Language>(() => {
    try {
      return localStorage.getItem('nusaifa_lang') === 'bn' ? 'bn' : 'en';
    } catch {
      return 'en';
    }
  });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [user, setUser] = useState<UserPublic | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>({
    insideDhakaBdt: 60,
    subDhakaBdt: 90,
    outsideDhakaBdt: 130,
    freeDeliveryThresholdBdt: 2000,
    codEnabled: true,
    bkashEnabled: false,
    nagadEnabled: false,
    updatedAt: '',
  });
  const [siteContent, setSiteContent] = useState<SiteContentItem[]>([]);
  const [publicSettings, setPublicSettings] = useState({
    checkoutEnabled: true,
    orderAcceptanceEnabled: true,
    customerLoginEnabled: true,
    customerRegistrationEnabled: true,
    wishlistEnabled: false,
  });

  const loadStorefront = useCallback(async () => {
    const data = await api.getBootstrap();
    setCategories(data.categories);
    setProducts(data.products);
    setBanners(data.banners);
    setDeliverySettings(data.deliverySettings);
    setSiteContent(data.siteContent);
    setPublicSettings(data.publicSettings);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setAppMode(window.location.pathname.startsWith('/admin') ? 'admin' : 'customer');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await loadStorefront();
        try {
          const meRes = await api.me();
          if (active) setUser(meRes.user);
        } catch {
          // Guest session
        }
      } catch (err: any) {
        if (active) setLoadError(err.message || 'Unable to connect to NUSAIFA SPICES backend.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadStorefront]);

  const navigateMode = (mode: 'customer' | 'admin') => {
    setAppMode(mode);
    const targetPath = mode === 'admin' ? '/admin' : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    window.scrollTo({ top: 0 });
  };

  const toggleLang = () => {
    setLang((prev) => {
      const next: Language = prev === 'en' ? 'bn' : 'en';
      try {
        localStorage.setItem('nusaifa_lang', next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="font-display text-3xl font-bold text-[#075B42]">NUSAIFA SPICES</p>
          <p className="text-xs text-[#59645F]">Loading storefront...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex items-center justify-center p-6">
        <div className="max-w-md bg-white border border-[#E5E0D5] rounded-xl p-6 text-center space-y-3">
          <h1 className="font-display text-2xl font-bold text-[#075B42]">NUSAIFA SPICES</h1>
          <p className="text-sm text-rose-700">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-[#075B42] text-white text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (appMode === 'admin') {
    return (
      <AdminApp
        user={user}
        onAuthChange={setUser}
        onExitAdmin={() => navigateMode('customer')}
        onStorefrontUpdated={loadStorefront}
      />
    );
  }

  return (
    <CartProvider>
      <CustomerApp
        lang={lang}
        onToggleLang={toggleLang}
        categories={categories}
        products={products}
        banners={banners}
        deliverySettings={deliverySettings}
        siteContent={siteContent}
        publicSettings={publicSettings}
        user={user}
        onAuthChange={setUser}
        onRefreshStorefront={loadStorefront}
        onNavigateAdmin={() => navigateMode('admin')}
      />
    </CartProvider>
  );
}
