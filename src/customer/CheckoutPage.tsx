import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Lock, MapPin, ShieldCheck, Truck } from 'lucide-react';
import { BANGLADESH_DIVISIONS, BANGLADESH_DISTRICTS, resolveDeliveryZone } from '../shared/bangladeshLocations.ts';
import type {
  DeliverySettings,
  Language,
  Order,
  PaymentMethod,
  Product,
  UserPublic,
} from '../shared/types.ts';
import { api } from '../lib/api.ts';
import { formatBdt, t } from '../lib/i18n.ts';
import { useCart } from './CartContext.tsx';

interface CheckoutPageProps {
  lang: Language;
  products: Product[];
  deliverySettings: DeliverySettings;
  user: UserPublic | null;
  onOrderConfirmed: (order: Order) => void;
  onBack: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  lang,
  products,
  deliverySettings,
  user,
  onOrderConfirmed,
  onBack,
}) => {
  const { items, getSubtotal, clearCart } = useCart();
  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const initialDivision =
    BANGLADESH_DISTRICTS.find((d) => d.nameEn === user?.district)?.division || 'Dhaka';
  const [division, setDivision] = useState(initialDivision);
  const districtsInDivision = useMemo(
    () => BANGLADESH_DISTRICTS.filter((d) => d.division === division),
    [division]
  );
  const [district, setDistrict] = useState(
    BANGLADESH_DISTRICTS.find((d) => d.nameEn === user?.district && d.division === initialDivision)?.nameEn ||
    BANGLADESH_DISTRICTS.find((d) => d.division === initialDivision)?.nameEn ||
    BANGLADESH_DISTRICTS[0].nameEn
  );
  const districtObj = useMemo(
    () => BANGLADESH_DISTRICTS.find((d) => d.nameEn === district) || districtsInDivision[0] || BANGLADESH_DISTRICTS[0],
    [district, districtsInDivision]
  );
  const [upazila, setUpazila] = useState(
    user?.upazila || districtObj.upazilas[0]?.nameEn || ''
  );
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');
  const [customerNote, setCustomerNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [gateways, setGateways] = useState<{
    bkash: { enabled: boolean; configured: boolean; mode: string };
    nagad: { enabled: boolean; configured: boolean; mode: string };
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getPaymentGateways().then((res) => setGateways(res)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!districtObj.upazilas.some((u) => u.nameEn === upazila)) {
      setUpazila(districtObj.upazilas[0]?.nameEn || '');
    }
  }, [districtObj, upazila]);

  const subtotal = getSubtotal(products);
  const zone = resolveDeliveryZone(district, upazila);
  const freeThreshold = deliverySettings.freeDeliveryThresholdBdt;
  const isFreeDelivery = freeThreshold > 0 && subtotal >= freeThreshold;
  const deliveryCharge = isFreeDelivery
    ? 0
    : zone === 'inside_dhaka'
      ? deliverySettings.insideDhakaBdt
      : zone === 'sub_dhaka'
        ? deliverySettings.subDhakaBdt
        : deliverySettings.outsideDhakaBdt;
  const total = subtotal + deliveryCharge;

  const zoneLabel =
    zone === 'inside_dhaka'
      ? lang === 'bn'
        ? 'ঢাকা সিটি'
        : 'Inside Dhaka Metro'
      : zone === 'sub_dhaka'
        ? lang === 'bn'
          ? 'ঢাকা শহরতলী'
          : 'Dhaka Suburbs'
        : lang === 'bn'
          ? 'ঢাকার বাইরে (সারা বাংলাদেশ)'
          : 'Outside Dhaka (Nationwide)';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (items.length === 0) {
      setError(lang === 'bn' ? 'আপনার ব্যাগ খালি।' : 'Your shopping bag is empty.');
      return;
    }
    setSubmitting(true);
    try {
      const order = await api.placeOrder({
        customerName,
        customerPhone,
        customerEmail,
        district,
        upazila,
        deliveryAddress,
        paymentMethod,
        customerNote,
        items,
      });
      clearCart();
      onOrderConfirmed(order);
    } catch (err: any) {
      setError(err.message || 'Could not place order.');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h2 className="text-3xl font-semibold text-[#141A17]">
          {t(lang, 'emptyBagTitle')}
        </h2>
        <p className="mt-2 text-[#59645F]">{t(lang, 'emptyBagDesc')}</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#075B42] text-white text-sm font-semibold hover:bg-[#054431]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t(lang, 'backToShop')}</span>
        </button>
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#075B42] hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t(lang, 'backToShop')}</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white border border-[#E5E0D5] rounded-xl p-6 sm:p-8 space-y-6"
        >
          <div>
            <h1 className="text-3xl font-semibold text-[#141A17]">
              {lang === 'bn' ? 'ডেলিভারি ও অর্ডার তথ্য' : 'Delivery & Order Details'}
            </h1>
            <p className="mt-1 text-sm text-[#59645F]">
              {lang === 'bn'
                ? 'সারা বাংলাদেশে হোম ডেলিভারি · ক্যাশ অন ডেলিভারিতে আগে অর্ডার করুন'
                : 'Bangladesh-wide home delivery · Order first, pay on delivery'}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800"
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#2C3531] mb-1.5">
                {lang === 'bn' ? 'গ্রাহকের পূর্ণ নাম *' : 'Full Name *'}
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={lang === 'bn' ? 'যেমন: তানভীর আহমেদ' : 'e.g. Tanvir Ahmed'}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm focus:outline-none focus:border-[#075B42]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C3531] mb-1.5">
                {lang === 'bn' ? 'মোবাইল নম্বর (১১ ডিজিট) *' : 'Mobile Number (BD) *'}
              </label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm font-mono-tabular focus:outline-none focus:border-[#075B42]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2C3531] mb-1.5">
              {lang === 'bn' ? 'ইমেইল (ঐচ্ছিক)' : 'Email Address (Optional)'}
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm focus:outline-none focus:border-[#075B42]"
            />
          </div>

           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
  <div>
    <label className="block text-xs font-semibold text-[#2C3531] mb-1.5">
      {lang === 'bn' ? 'বিভাগ নির্বাচন করুন *' : 'Division *'}
    </label>
    <select value={division} onChange={(e) => {
      const next = e.target.value;
      const first = BANGLADESH_DISTRICTS.find(d => d.division === next);
      setDivision(next);
      if (first) {
        setDistrict(first.nameEn);
        setUpazila(first.upazilas[0]?.nameEn || '');
      }
    }} className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm bg-white">
      {BANGLADESH_DIVISIONS.map(d => <option key={d.nameEn} value={d.nameEn}>
        {lang === 'bn' ? `${d.nameBn} (${d.nameEn})` : d.nameEn}
      </option>)}
    </select>
  </div>
  <div>
    <label className="block text-xs font-semibold text-[#2C3531] mb-1.5">
      {lang === 'bn' ? 'জেলা নির্বাচন করুন *' : 'District *'}
    </label>
    <select value={district} onChange={e => setDistrict(e.target.value)}
      className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm bg-white">
      {districtsInDivision.map(d => <option key={d.nameEn} value={d.nameEn}>
        {lang === 'bn' ? `${d.nameBn} (${d.nameEn})` : d.nameEn}
      </option>)}
    </select>
  </div>
  <div>
    <label className="block text-xs font-semibold text-[#2C3531] mb-1.5">
      {lang === 'bn' ? 'উপজেলা / থানা *' : 'Upazila / Area *'}
    </label>
    <select value={upazila} onChange={e => setUpazila(e.target.value)}
      className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm bg-white">
      {districtObj.upazilas.map(u => <option key={u.nameEn} value={u.nameEn}>
        {lang === 'bn' ? `${u.nameBn} (${u.nameEn})` : u.nameEn}
      </option>)}
    </select>
  </div>
</div>
<div>
            <label className="block text-xs font-semibold text-[#2C3531] mb-1.5">
              {lang === 'bn' ? 'বিস্তারিত ডেলিভারি ঠিকানা *' : 'Full Delivery Address *'}
            </label>
            <textarea
              required
              rows={2}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder={
                lang === 'bn'
                  ? 'বাসা নং, রোড নং, ফ্ল্যাট, ল্যান্ডমার্ক লিখুন'
                  : 'House, road, flat number, and nearest landmark'
              }
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm focus:outline-none focus:border-[#075B42]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2C3531] mb-1.5">
              {lang === 'bn' ? 'অর্ডার নোট (ঐচ্ছিক)' : 'Delivery Note (Optional)'}
            </label>
            <input
              type="text"
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder={
                lang === 'bn'
                  ? 'যেমন: বিকেল ৪টার পর ডেলিভারি করবেন'
                  : 'e.g. Call upon arrival or deliver after 4 PM'
              }
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#D6D0C4] text-sm focus:outline-none focus:border-[#075B42]"
            />
          </div>

          <div className="pt-4 border-t border-[#E5E0D5]">
            <h2 className="text-lg font-semibold text-[#141A17] mb-3">
              {lang === 'bn' ? 'পেমেন্ট পদ্ধতি নির্বাচন করুন' : 'Payment Method'}
            </h2>
            <div className="space-y-3">
              <label
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                  paymentMethod === 'cod'
                    ? 'border-[#075B42] bg-[#075B42]/5'
                    : 'border-[#E5E0D5] hover:border-[#075B42]/40'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="mt-1 accent-[#075B42]"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#141A17]">
                      {t(lang, 'codTitle')}
                    </span>
                    <span className="text-xs font-medium text-[#075B42]">
                      {lang === 'bn' ? 'সক্রিয়' : 'Available'}
                    </span>
                  </div>
                  <p className="text-xs text-[#59645F] mt-1">{t(lang, 'codDesc')}</p>
                </div>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-[#E5E0D5] bg-[#F8F6F1] opacity-85">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#141A17]">bKash Merchant</span>
                    <span className="text-[11px] font-medium text-[#8E6F16]">
                      {gateways?.bkash.enabled && gateways.bkash.configured
                        ? 'Gateway Ready'
                        : lang === 'bn'
                          ? 'মার্চেন্ট এপিআই প্রস্তুত'
                          : 'Integration Ready'}
                    </span>
                  </div>
                  <p className="text-xs text-[#59645F] mt-1">
                    {lang === 'bn'
                      ? 'লাইভ মার্চেন্ট কী কনফিগার করলে বিকাশ পেমেন্ট চালু হবে।'
                      : 'Awaiting live merchant API keys in server configuration.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E5E0D5] bg-[#F8F6F1] opacity-85">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#141A17]">Nagad Merchant</span>
                    <span className="text-[11px] font-medium text-[#8E6F16]">
                      {gateways?.nagad.enabled && gateways.nagad.configured
                        ? 'Gateway Ready'
                        : lang === 'bn'
                          ? 'মার্চেন্ট এপিআই প্রস্তুত'
                          : 'Integration Ready'}
                    </span>
                  </div>
                  <p className="text-xs text-[#59645F] mt-1">
                    {lang === 'bn'
                      ? 'লাইভ মার্চেন্ট কী কনফিগার করলে নগদ পেমেন্ট চালু হবে।'
                      : 'Awaiting live merchant API keys in server configuration.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-6 rounded-xl bg-[#075B42] text-white font-semibold text-sm hover:bg-[#054431] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {submitting
                ? lang === 'bn'
                  ? 'অর্ডার প্রক্রিয়াকরণ হচ্ছে...'
                  : 'Confirming Order...'
                : `${t(lang, 'placeOrder')} · ${formatBdt(total)}`}
            </span>
          </button>
        </form>

        <aside className="lg:col-span-5 bg-[#F8F6F1] border border-[#E5E0D5] rounded-xl p-6 space-y-5">
          <h2 className="text-xl font-semibold text-[#141A17]">
            {lang === 'bn' ? 'অর্ডার সারাংশ' : 'Order Summary'}
          </h2>

          <div className="divide-y divide-[#E5E0D5]">
            {items.map((item) => {
              const prod = products.find((p) => p.id === item.productId);
              if (!prod) return null;
              const unit =
                prod.discountPriceBdt !== null && prod.discountPriceBdt < prod.priceBdt
                  ? prod.discountPriceBdt
                  : prod.priceBdt;
              return (
                <div key={item.productId} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={prod.imageUrl}
                      alt={lang === 'bn' ? prod.nameBn : prod.nameEn}
                      className="w-12 h-12 rounded-lg object-cover bg-white shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#141A17] truncate">
                        {lang === 'bn' ? prod.nameBn : prod.nameEn}
                      </p>
                      <p className="text-xs text-[#59645F] tabular-nums">
                        {prod.weightLabel} × {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-[#141A17] font-mono-tabular shrink-0">
                    {formatBdt(unit * item.quantity)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-[#E5E0D5] space-y-2.5 text-sm">
            <div className="flex items-center justify-between text-[#4B5651]">
              <span>{t(lang, 'subtotal')}</span>
              <span className="font-mono-tabular font-medium">{formatBdt(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-[#4B5651]">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#075B42]" />
                <span>{zoneLabel}</span>
              </span>
              <span className="font-mono-tabular font-medium">
                {deliveryCharge === 0 ? t(lang, 'freeDelivery') : formatBdt(deliveryCharge)}
              </span>
            </div>
            {freeThreshold > 0 && !isFreeDelivery && (
              <p className="text-xs text-[#8E6F16]">
                {lang === 'bn'
                  ? `আরও ${formatBdt(freeThreshold - subtotal)} এর অর্ডার করলে ফ্রি ডেলিভারি পাবেন।`
                  : `Add ${formatBdt(freeThreshold - subtotal)} more for free nationwide delivery.`}
              </p>
            )}
            <div className="pt-3 border-t border-[#D6D0C4] flex items-center justify-between text-base font-semibold text-[#141A17]">
              <span>{t(lang, 'total')}</span>
              <span className="text-xl text-[#075B42] font-mono-tabular">{formatBdt(total)}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E0D5] space-y-2 text-xs text-[#59645F]">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#075B42] shrink-0" />
              <span>
                {lang === 'bn'
                  ? 'ঢাকায় ২৪–৪৮ ঘণ্টা, সারা দেশে ২–৫ কর্মদিবসে ডেলিভারি'
                  : '24–48h inside Dhaka · 2–5 business days nationwide'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#075B42] shrink-0" />
              <span>
                {lang === 'bn'
                  ? '১০০% বিশুদ্ধতা নিশ্চিত ও নিরাপদ প্যাকেজিং'
                  : 'Lab-screened purity & tamper-evident food-grade seal'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#075B42] shrink-0" />
              <span>
                {lang === 'bn'
                  ? 'ডেলিভারির সময় পণ্য যাচাই করে মূল্য পরিশোধের সুবিধা'
                  : 'Verify parcel integrity upon Cash on Delivery arrival'}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};
