import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { CartItem, Product } from '../shared/types.ts';

interface CartContextValue {
  items: CartItem[];
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  addToCart: (productId: string, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  totalItems: number;
  getSubtotal: (products: Product[]) => number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = 'nusaifa_spices_cart_v1';

export const CartProvider: React.FC<{ children: React.ReactNode; products: Product[] }> = ({ children, products }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore quota errors
    }
  }, [items]);

  const addToCart = (productId: string, quantity = 1) => {
    const product = products.find((p) => p.id === productId);

    if (product && typeof window !== 'undefined') {
      const unitPrice =
        product.discountPriceBdt !== null && product.discountPriceBdt < product.priceBdt
          ? product.discountPriceBdt
          : product.priceBdt;

      const win = window as Window & {
        dataLayer?: Array<Record<string, unknown>>;
      };

      win.dataLayer = win.dataLayer || [];
      win.dataLayer.push({ ecommerce: null });
      win.dataLayer.push({
        event: 'add_to_cart',
        ecommerce: {
          currency: 'BDT',
          value: unitPrice * quantity,
          items: [{
            item_id: product.sku || product.id,
            item_name: product.nameEn,
            item_brand: 'NUSAIFA SPICES',
            item_variant: product.weightLabel,
            price: unitPrice,
            quantity,
          }],
        },
      });
    }

    setItems((prev) => {
      const idx = prev.findIndex((i) => i.productId === productId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity };
        return next;
      }
      return [...prev, { productId, quantity }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const clearCart = () => setItems([]);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const getSubtotal = (products: Product[]) =>
    items.reduce((sum, item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) return sum;
      const unit =
        prod.discountPriceBdt !== null && prod.discountPriceBdt < prod.priceBdt
          ? prod.discountPriceBdt
          : prod.priceBdt;
      return sum + unit * item.quantity;
    }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        drawerOpen,
        setDrawerOpen,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalItems,
        getSubtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
