import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  LogOut,
  MapPin,
  Minus,
  Package,
  Phone,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import type {
  Category,
  Language,
  Order,
  Product,
  SiteContentItem,
  UserPublic,
} from '../shared/types.ts';
import { api } from '../lib/api.ts';
import { formatBdt, ORDER_STATUS_LABELS, t } from '../lib/i18n.ts';

export const ProductDetailView: React.FC<{
  product: Product;
  category?: Category;
  lang: Language;
  onAdd: (product: Product, qty: number) => void;
  onBack: () => void;
}> = ({ product, category, lang, onAdd, onBack }) => {
  const [qty, setQty] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const hasDiscount =
    product.discountPriceBdt !== null && product.discountPriceBdt < product.priceBdt;
  const activePrice = hasDiscount ? product.discountPriceBdt! : product.priceBdt;
  const inStock = product.stockQty > 0;

  const handleBuy = () => {
    if (!inStock) return;
    onAdd(product, qty);
    setAddedFeedback(true);
    window.setTimeout(() => setAddedFeedback(false), 1200);
  };

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#075B42] hover:underline mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t(lang, 'backToShop')}</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-6 bg-[#F8F6F1] border border-[#E5E0D5] rounded-2xl overflow-hidden aspect-[4/3]">
          <img
            src={product.imageUrl}
            alt={lang === 'bn' ? product.nameBn : product.nameEn}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="lg:col-span-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#59645F] tracking-wide mb-2">
              {category && <span>{lang === 'bn' ? category.nameBn : category.nameEn}</span>}
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">{product.sku}</span>
              <span aria-hidden="true">·</span>
              <span className={inStock ? 'text-[#075B42] font-medium' : 'text-rose-700 font-medium'}>
                {inStock
                  ? `${t(lang, 'inStock')} (${product.stockQty})`
                  : t(lang, 'outOfStock')}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-semibold text-[#141A17] leading-tight">
              {lang === 'bn' ? product.nameBn : product.nameEn}
            </h1>
            <p className="mt-2 text-base text-[#4B5651]">
              {lang === 'bn' ? product.shortDescBn : product.shortDescEn}
            </p>
          </div>

          <div className="flex items-baseline gap-3 pb-5 border-b border-[#E5E0D5]">
            <span className="text-3xl font-semibold text-[#075B42] font-mono-tabular">
              {formatBdt(activePrice)}
            </span>
            {hasDiscount && (
              <span className="text-base text-[#727D78] line-through font-mono-tabular">
                {formatBdt(product.priceBdt)}
              </span>
            )}
            <span className="text-sm text-[#59645F]">/ {product.weightLabel}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#F8F6F1] border border-[#E5E0D5] text-sm">
            <div>
              <span className="block text-xs text-[#59645F]">{t(lang, 'origin')}</span>
              <span className="font-medium text-[#141A17]">
                {lang === 'bn' ? product.originBn : product.originEn}
              </span>
            </div>
            <div>
              <span className="block text-xs text-[#59645F]">{t(lang, 'weight')}</span>
              <span className="font-medium text-[#141A17] tabular-nums">{product.weightLabel}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex items-center border border-[#D6D0C4] rounded-lg bg-white">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="p-3 text-[#141A17] hover:bg-[#F8F6F1]"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 text-sm font-semibold font-mono-tabular">{qty}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQty((q) => Math.min(Math.max(1, product.stockQty), q + 1))}
                className="p-3 text-[#141A17] hover:bg-[#F8F6F1]"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              disabled={!inStock}
              onClick={handleBuy}
              className="flex-1 min-w-[200px] py-3.5 px-6 rounded-xl bg-[#075B42] text-white font-semibold text-sm hover:bg-[#054431] transition-colors disabled:opacity-50"
            >
              {addedFeedback
                ? t(lang, 'added')
                : `${t(lang, 'addToBag')} · ${formatBdt(activePrice * qty)}`}
            </button>
          </div>

          <div className="pt-4 border-t border-[#E5E0D5]">
            <h2 className="text-lg font-semibold text-[#141A17] mb-2">
              {lang === 'bn' ? 'পণ্য পরিচিতি ও গুণগত মান' : 'Harvest & Craftsmanship Notes'}
            </h2>
            <p className="text-sm text-[#4B5651] leading-relaxed">
              {lang === 'bn' ? product.descriptionBn : product.descriptionEn}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export const OrderConfirmationView: React.FC<{
  order: Order;
  lang: Language;
  onTrackOrder: (order: Order) => void;
  onContinue: () => void;
}> = ({ order, lang, onTrackOrder, onContinue }) => (
  <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
    <div className="bg-[#F8F6F1] border border-[#E5E0D5] rounded-2xl p-6 sm:p-10 space-y-6">
      <div className="flex items-start gap-4">
        <CheckCircle2 className="w-10 h-10 text-[#075B42] shrink-0" />
        <div>
          <p className="text-xs font-semibold tracking-wider text-[#8E6F16]">
            {lang === 'bn' ? 'অর্ডার সফলভাবে গৃহীত হয়েছে' : 'Order Confirmed'}
          </p>
          <h1 className="text-3xl font-semibold text-[#141A17] mt-1">
            {lang === 'bn' ? `অর্ডার #${order.orderNumber}` : `Order #${order.orderNumber}`}
          </h1>
          <p className="text-sm text-[#4B5651] mt-1">
            {lang === 'bn'
              ? 'আমাদের ডেলিভারি টিম শীঘ্রই আপনার মোবাইল নম্বরে কল করে কনফার্ম করবে।'
              : 'Our Dhaka dispatch team will verify your delivery slot via phone shortly.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-white border border-[#E5E0D5] text-sm">
        <div>
          <span className="block text-xs text-[#59645F]">
            {lang === 'bn' ? 'গ্রাহক' : 'Recipient'}
          </span>
          <span className="font-medium text-[#141A17]">{order.customerName}</span>
          <span className="block text-xs text-[#59645F] font-mono-tabular">
            {order.customerPhone}
          </span>
        </div>
        <div>
          <span className="block text-xs text-[#59645F]">
            {lang === 'bn' ? 'ডেলিভারি এলাকা' : 'Destination'}
          </span>
          <span className="font-medium text-[#141A17]">
            {order.upazila}, {order.district}
          </span>
          <span className="block text-xs text-[#59645F] truncate">{order.deliveryAddress}</span>
        </div>
        <div>
          <span className="block text-xs text-[#59645F]">
            {lang === 'bn' ? 'পরিশোধযোগ্য মোট' : 'Payable Total (COD)'}
          </span>
          <span className="text-lg font-semibold text-[#075B42] font-mono-tabular">
            {formatBdt(order.totalBdt)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            const message = [
              'NUSAIFA SPICES - Order Confirmation',
              '',
              'Order Number: ' + order.orderNumber,
              'Customer: ' + order.customerName,
              'Phone: ' + order.customerPhone,
              'Address: ' + order.deliveryAddress + ', ' + order.upazila + ', ' + order.district,
              '',
              'Ordered Products:',
              ...order.items.map(
                (item) => '- ' + item.productNameEn + ' x ' + item.quantity + ' = ' + formatBdt(item.lineTotalBdt)
              ),
              '',
              'Subtotal: ' + formatBdt(order.subtotalBdt),
              'Delivery Charge: ' + formatBdt(order.deliveryChargeBdt),
              'Total Payable: ' + formatBdt(order.totalBdt),
              'Payment: Cash on Delivery',
              order.customerNote ? 'Note: ' + order.customerNote : '',
            ].filter(Boolean).join('\n');

            const whatsappUrl =
              'https://wa.me/8801863581745?text=' + encodeURIComponent(message);

            window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
          }}
          className="px-5 py-2.5 rounded-lg bg-[#128C4A] text-white text-sm font-semibold hover:bg-[#0B713A]"
        >
          WhatsApp-এ অর্ডার পাঠান
        </button>

        <button
          type="button"
          onClick={() => onTrackOrder(order)}
          className="px-5 py-2.5 rounded-lg bg-[#075B42] text-white text-sm font-semibold hover:bg-[#054431]"
        >
          {lang === 'bn' ? 'অর্ডার ট্র্যাক করুন' : 'Track This Order'}
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="px-5 py-2.5 rounded-lg border border-[#D6D0C4] bg-white text-[#141A17] text-sm font-semibold hover:bg-[#F8F6F1]"
        >
          {t(lang, 'backToShop')}
        </button>
      </div>
    </div>
  </section>
);

export const OrderTrackingPage: React.FC<{
  lang: Language;
  initialOrder?: Order | null;
}> = ({ lang, initialOrder }) => {
  const [orderNumber, setOrderNumber] = useState(initialOrder?.orderNumber || 'NS-261101');
  const [phone, setPhone] = useState(initialOrder?.customerPhone || '01711223344');
  const [order, setOrder] = useState<Order | null>(initialOrder || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const found = await api.trackOrder(orderNumber, phone);
      setOrder(found);
    } catch (err: any) {
      setOrder(null);
      setError(err.message || 'Order not found.');
    } finally {
      setLoading(false);
    }
  };

  const steps: Array<{ key: Order['orderStatus']; en: string; bn: string }> = [
    { key: 'pending', en: 'Placed', bn: 'গৃহীত' },
    { key: 'confirmed', en: 'Confirmed', bn: 'নিশ্চিত' },
    { key: 'processing', en: 'Packing', bn: 'প্যাকিং' },
    { key: 'shipped', en: 'Shipped', bn: 'পাঠানো' },
    { key: 'delivered', en: 'Delivered', bn: 'সম্পন্ন' },
  ];

  const activeIdx = order ? steps.findIndex((s) => s.key === order.orderStatus) : -1;

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-semibold text-[#141A17]">
          {lang === 'bn' ? 'অর্ডার ট্র্যাকিং' : 'Track Your Order'}
        </h1>
        <p className="mt-1.5 text-sm text-[#59645F]">
          {lang === 'bn'
            ? 'আপনার অর্ডার নম্বর এবং মোবাইল নম্বর দিয়ে বর্তমান অবস্থা জানুন।'
            : 'Enter your Order Number and checkout phone number to view live dispatch notifications.'}
        </p>
      </div>

      <form
        onSubmit={handleTrack}
        className="bg-[#F8F6F1] border border-[#E5E0D5] rounded-xl p-5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
      >
        <div className="sm:col-span-5">
          <label className="block text-xs font-semibold text-[#2C3531] mb-1">
            {lang === 'bn' ? 'অর্ডার নম্বর' : 'Order Number'}
          </label>
          <input
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="NS-261101"
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] bg-white text-sm font-mono-tabular"
          />
        </div>
        <div className="sm:col-span-4">
          <label className="block text-xs font-semibold text-[#2C3531] mb-1">
            {lang === 'bn' ? 'মোবাইল নম্বর' : 'Phone Number'}
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="017XXXXXXXX"
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] bg-white text-sm font-mono-tabular"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="sm:col-span-3 py-2.5 px-4 rounded-lg bg-[#075B42] text-white text-sm font-semibold hover:bg-[#054431] inline-flex items-center justify-center gap-2 min-h-[42px]"
        >
          <Search className="w-4 h-4" />
          <span>{loading ? '...' : lang === 'bn' ? 'খুঁজুন' : 'Track'}</span>
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">
          {error}
        </div>
      )}

      {order && (
        <div className="bg-white border border-[#E5E0D5] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E5E0D5]">
            <div>
              <span className="text-xs text-[#59645F] font-mono-tabular">
                #{order.orderNumber} · {new Date(order.createdAt).toLocaleDateString()}
              </span>
              <h2 className="text-2xl font-semibold text-[#141A17] mt-0.5">
                {order.customerName} — {order.upazila}, {order.district}
              </h2>
            </div>
            <span
              className={`px-3 py-1 rounded-md border text-xs font-semibold ${
                ORDER_STATUS_LABELS[order.orderStatus].tone
              }`}
            >
              {lang === 'bn'
                ? ORDER_STATUS_LABELS[order.orderStatus].bn
                : ORDER_STATUS_LABELS[order.orderStatus].en}
            </span>
          </div>

          {order.orderStatus !== 'cancelled' && (
            <div className="grid grid-cols-5 gap-2">
              {steps.map((step, i) => {
                const done = i <= activeIdx;
                return (
                  <div key={step.key} className="text-center">
                    <div
                      className={`h-2 rounded-full mb-2 ${
                        done ? 'bg-[#075B42]' : 'bg-[#E5E0D5]'
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        done ? 'text-[#075B42]' : 'text-[#727D78]'
                      }`}
                    >
                      {lang === 'bn' ? step.bn : step.en}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-[#141A17] mb-3">
              {lang === 'bn' ? 'স্ট্যাটাস আপডেট' : 'Status Notifications'}
            </h3>
            <div className="space-y-2.5">
              {[...order.notifications].reverse().map((n) => (
                <div
                  key={n.id}
                  className="p-3.5 rounded-lg bg-[#F8F6F1] border border-[#E5E0D5] flex items-start justify-between gap-4 text-sm"
                >
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-[#075B42] mt-0.5 shrink-0" />
                    <span className="text-[#141A17]">
                      {lang === 'bn' ? n.messageBn : n.messageEn}
                    </span>
                  </div>
                  <span className="text-xs text-[#59645F] font-mono-tabular shrink-0">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E0D5] flex items-center justify-between text-sm">
            <span className="text-[#59645F]">
              {order.items.map((i) => `${lang === 'bn' ? i.productNameBn : i.productNameEn} ×${i.quantity}`).join(', ')}
            </span>
            <span className="text-base font-semibold text-[#075B42] font-mono-tabular">
              {formatBdt(order.totalBdt)}
            </span>
          </div>
        </div>
      )}
    </section>
  );
};

export const CustomerAccountPage: React.FC<{
  lang: Language;
  user: UserPublic | null;
  onAuthChange: (user: UserPublic | null) => void;
  onTrackOrder: (order: Order) => void;
}> = ({ lang, user, onAuthChange, onTrackOrder }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (user) {
      api.myOrders().then(setOrders).catch(() => {});
    } else {
      setOrders([]);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.login({ email, password });
        api.setToken(res.token);
        onAuthChange(res.user);
      } else {
        const res = await api.register({ fullName, email, phone, password });
        api.setToken(res.token);
        onAuthChange(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    api.setToken(null);
    onAuthChange(null);
  };

  if (!user) {
    return (
      <section className="max-w-md mx-auto px-4 py-14">
        <div className="bg-white border border-[#E5E0D5] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex gap-1 p-1 bg-[#F8F6F1] rounded-lg border border-[#E5E0D5]">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                mode === 'login' ? 'bg-white text-[#075B42] shadow-sm' : 'text-[#59645F]'
              }`}
            >
              {t(lang, 'signIn')}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                mode === 'register' ? 'bg-white text-[#075B42] shadow-sm' : 'text-[#59645F]'
              }`}
            >
              {t(lang, 'createAccount')}
            </button>
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-[#141A17]">
              {mode === 'login'
                ? lang === 'bn'
                  ? 'গ্রাহক সাইন ইন'
                  : 'Customer Sign In'
                : lang === 'bn'
                  ? 'নতুন গ্রাহক নিবন্ধন'
                  : 'Create Customer Account'}
            </h1>
            <p className="text-xs text-[#59645F] mt-1">
              {lang === 'bn'
                ? 'আপনার অর্ডারের ইতিহাস ও দ্রুত চেকআউটের জন্য লগইন করুন।'
                : 'Access your saved delivery address and complete order history.'}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#2C3531] mb-1">
                    {lang === 'bn' ? 'পূর্ণ নাম *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C3531] mb-1">
                    {lang === 'bn' ? 'মোবাইল নম্বর *' : 'Phone Number *'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm font-mono-tabular"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#2C3531] mb-1">
                {lang === 'bn' ? 'ইমেইল *' : 'Email *'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C3531] mb-1">
                {lang === 'bn' ? 'পাসওয়ার্ড *' : 'Password *'}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[#075B42] text-white text-sm font-semibold hover:bg-[#054431]"
            >
              {loading
                ? '...'
                : mode === 'login'
                  ? t(lang, 'signIn')
                  : t(lang, 'createAccount')}
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E5E0D5]">
        <div>
          <h1 className="text-3xl font-semibold text-[#141A17]">{user.fullName}</h1>
          <p className="text-sm text-[#59645F] mt-1">
            {user.email} · <span className="font-mono-tabular">{user.phone}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#D6D0C4] text-sm font-medium text-[#141A17] hover:bg-[#F8F6F1]"
        >
          <LogOut className="w-4 h-4" />
          <span>{t(lang, 'signOut')}</span>
        </button>
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-[#141A17] mb-4">
          {t(lang, 'orderHistory')}
        </h2>

        {orders.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#F8F6F1] border border-[#E5E0D5] text-center text-sm text-[#59645F]">
            {lang === 'bn'
              ? 'এখনো কোনো অর্ডার পাওয়া যায়নি।'
              : 'You have not placed any orders under this account yet.'}
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="p-5 rounded-xl bg-white border border-[#E5E0D5] flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono-tabular font-semibold text-[#141A17]">
                      #{ord.orderNumber}
                    </span>
                    <span className="text-xs text-[#59645F]">
                      {new Date(ord.createdAt).toLocaleDateString()}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded border text-xs font-medium ${
                        ORDER_STATUS_LABELS[ord.orderStatus].tone
                      }`}
                    >
                      {lang === 'bn'
                        ? ORDER_STATUS_LABELS[ord.orderStatus].bn
                        : ORDER_STATUS_LABELS[ord.orderStatus].en}
                    </span>
                  </div>
                  <p className="text-sm text-[#4B5651] mt-1.5">
                    {ord.items
                      .map((i) => `${lang === 'bn' ? i.productNameBn : i.productNameEn} ×${i.quantity}`)
                      .join(', ')}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-base font-semibold text-[#075B42] font-mono-tabular">
                    {formatBdt(ord.totalBdt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onTrackOrder(ord)}
                    className="px-3.5 py-2 rounded-lg border border-[#075B42] text-[#075B42] text-xs font-semibold hover:bg-[#075B42]/5"
                  >
                    {lang === 'bn' ? 'ট্র্যাক' : 'Track'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export const EditorialContentPage: React.FC<{
  pageKey: 'about' | 'contact' | 'privacy' | 'returns' | 'terms';
  lang: Language;
  siteContent: SiteContentItem[];
}> = ({ pageKey, lang, siteContent }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const getContent = (key: string) => {
    const item = siteContent.find((s) => s.key === key);
    return item ? (lang === 'bn' ? item.valueBn : item.valueEn) : '';
  };

  const titles: Record<typeof pageKey, { en: string; bn: string; contentKey: string }> = {
    about: { en: 'About NUSAIFA SPICES', bn: 'নুসাইফা স্পাইসেস সম্পর্কে', contentKey: 'about_story' },
    contact: { en: 'Contact Us', bn: 'যোগাযোগ করুন', contentKey: 'contact_info' },
    privacy: { en: 'Privacy Policy', bn: 'গোপনীয়তা নীতি', contentKey: 'privacy_policy' },
    returns: { en: 'Return & Refund Policy', bn: 'রিটার্ন ও রিফান্ড নীতি', contentKey: 'return_policy' },
    terms: { en: 'Terms & Conditions', bn: 'শর্তাবলী', contentKey: 'terms_conditions' },
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.submitContact({ name, phone, email, subject, message });
      setSent(true);
      setName('');
      setPhone('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'Could not submit inquiry.');
    }
  };

  const info = titles[pageKey];

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-semibold text-[#141A17]">
          {lang === 'bn' ? info.bn : info.en}
        </h1>
        <p className="mt-4 text-base text-[#3A433E] leading-relaxed whitespace-pre-line">
          {getContent(info.contentKey)}
        </p>
      </div>

      {pageKey === 'about' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="p-6 rounded-xl bg-[#F8F6F1] border border-[#E5E0D5]">
            <ShieldCheck className="w-6 h-6 text-[#075B42] mb-3" />
            <h3 className="text-base font-semibold text-[#141A17]">
              {lang === 'bn' ? 'সরাসরি কৃষক থেকে সংগ্রহ' : 'Direct Farmer Sourcing'}
            </h3>
            <p className="mt-1.5 text-sm text-[#59645F]">
              {lang === 'bn'
                ? 'বগুড়া, রাজশাহী, ফরিদপুর ও সুন্দরবন থেকে মধ্যস্বত্বভোগী ছাড়া সংগ্রহ।'
                : 'Traceable single-origin harvests from Bogura, Rajshahi, Faridpur, and Satkhira.'}
            </p>
          </div>
          <div className="p-6 rounded-xl bg-[#F8F6F1] border border-[#E5E0D5]">
            <Package className="w-6 h-6 text-[#075B42] mb-3" />
            <h3 className="text-base font-semibold text-[#141A17]">
              {lang === 'bn' ? 'ফুড-গ্রেড প্যাকেজিং' : 'Small-Batch Milling'}
            </h3>
            <p className="mt-1.5 text-sm text-[#59645F]">
              {lang === 'bn'
                ? 'প্রাকৃতিক ঘ্রাণ ও পুষ্টি অক্ষুণ্ণ রাখতে কম তাপমাত্রায় ভাঙা ও সিল করা।'
                : 'Low-heat stone milling to preserve volatile essential oils and vibrant potency.'}
            </p>
          </div>
          <div className="p-6 rounded-xl bg-[#F8F6F1] border border-[#E5E0D5]">
            <Truck className="w-6 h-6 text-[#075B42] mb-3" />
            <h3 className="text-base font-semibold text-[#141A17]">
              {lang === 'bn' ? '৬৪ জেলায় ক্যাশ অন ডেলিভারি' : '64-District COD Network'}
            </h3>
            <p className="mt-1.5 text-sm text-[#59645F]">
              {lang === 'bn'
                ? 'সারা বাংলাদেশে দ্রুত হোম ডেলিভারি এবং হাতে পেয়ে পেমেন্ট সুবিধা।'
                : 'Reliable doorstep courier dispatch across every district in Bangladesh.'}
            </p>
          </div>
        </div>
      )}

      {pageKey === 'contact' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-4">
          <div className="md:col-span-5 space-y-4">
            <div className="p-5 rounded-xl bg-[#F8F6F1] border border-[#E5E0D5] space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#075B42] mt-1 shrink-0" />
                <span>House 24, Road 7, Dhanmondi, Dhaka 1205, Bangladesh</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#075B42] shrink-0" />
                <span className="font-mono-tabular">+880 1700-000000</span>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleContactSubmit}
            className="md:col-span-7 bg-white border border-[#E5E0D5] rounded-xl p-6 space-y-4"
          >
            <h2 className="text-xl font-semibold text-[#141A17]">
              {lang === 'bn' ? 'বার্তা পাঠান' : 'Send an Inquiry'}
            </h2>
            {sent && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                {lang === 'bn'
                  ? 'আপনার বার্তা সফলভাবে পাঠানো হয়েছে। আমরা শীঘ্রই যোগাযোগ করব।'
                  : 'Your inquiry has been received. Our team will respond shortly.'}
              </div>
            )}
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={lang === 'bn' ? 'আপনার নাম *' : 'Your Name *'}
                className="px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm"
              />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="017XXXXXXXX *"
                className="px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm font-mono-tabular"
              />
            </div>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={lang === 'bn' ? 'বিষয় *' : 'Subject *'}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm"
            />
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={lang === 'bn' ? 'আপনার বার্তা লিখুন *' : 'Message *'}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#075B42] text-white text-sm font-semibold hover:bg-[#054431]"
            >
              <Send className="w-4 h-4" />
              <span>{lang === 'bn' ? 'বার্তা পাঠান' : 'Submit Message'}</span>
            </button>
          </form>
        </div>
      )}
    </section>
  );
};
