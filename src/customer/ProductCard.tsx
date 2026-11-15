import React, { useState } from 'react';
import { Check, Leaf, Plus } from 'lucide-react';
import type { Category, Language, Product } from '../shared/types.ts';
import { formatBdt, t } from '../lib/i18n.ts';

interface ProductCardProps {
  product: Product;
  category?: Category;
  lang: Language;
  onSelect: (product: Product) => void;
  onAdd: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  category,
  lang,
  onSelect,
  onAdd,
}) => {
  const [imgError, setImgError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const hasDiscount =
    product.discountPriceBdt !== null && product.discountPriceBdt < product.priceBdt;
  const activePrice = hasDiscount ? product.discountPriceBdt! : product.priceBdt;
  const inStock = product.stockQty > 0;

  const title = lang === 'bn' ? product.nameBn : product.nameEn;
  const shortDesc = lang === 'bn' ? product.shortDescBn : product.shortDescEn;
  const catLabel = category ? (lang === 'bn' ? category.nameBn : category.nameEn) : '';

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inStock) return;
    onAdd(product);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1100);
  };

  return (
    <article
      onClick={() => onSelect(product)}
      className="group cursor-pointer bg-[#F8F6F1] border border-[#E5E0D5] rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full bg-[#EFECE4] overflow-hidden">
        {!imgError && product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#075B42]/10 to-[#D4AF37]/15 text-[#075B42] p-6 text-center">
            <Leaf className="w-8 h-8 mb-2 opacity-75" />
            <span className="text-sm font-medium">{title}</span>
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#59645F] tracking-wide mb-1.5">
            {catLabel && <span>{catLabel}</span>}
            {catLabel && <span aria-hidden="true">·</span>}
            <span className="tabular-nums">{product.weightLabel}</span>
            <span aria-hidden="true">·</span>
            <span className={inStock ? 'text-[#075B42]' : 'text-rose-700'}>
              {inStock ? t(lang, 'inStock') : t(lang, 'outOfStock')}
            </span>
          </div>

          <h3 className="text-[17px] font-semibold text-[#141A17] leading-snug line-clamp-2">
            {title}
          </h3>
          {shortDesc && (
            <p className="mt-1.5 text-sm text-[#4B5651] leading-relaxed line-clamp-2">
              {shortDesc}
            </p>
          )}
        </div>

        <div className="pt-3 border-t border-[#E5E0D5] flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold text-[#075B42] font-mono-tabular">
              {formatBdt(activePrice)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-[#727D78] line-through font-mono-tabular">
                {formatBdt(product.priceBdt)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={!inStock}
            onClick={handleAdd}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
              !inStock
                ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                : justAdded
                  ? 'bg-[#8E6F16] text-white'
                  : 'bg-[#075B42] text-white hover:bg-[#054431]'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{t(lang, 'added')}</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>{t(lang, 'addToBag')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
};
