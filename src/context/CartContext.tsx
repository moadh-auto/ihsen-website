'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
export interface CartItem {
  cartId:       string;   // unique per cart entry (productId-colorIndex-size-ts)
  productId:    number;
  nameAr:       string;
  nameFr:       string;
  emoji:        string;
  image?:       string;   // thumbnail URL from Supabase
  color:        string;   // hex color
  colorIndex:   number;
  size:         string;
  qty:          number;
  price:        number;   // unit price at time of adding
  category:     string;
}

interface CartContextValue {
  items:       CartItem[];
  itemCount:   number;
  subtotal:    number;
  isOpen:      boolean;
  openCart:    () => void;
  closeCart:   () => void;
  toggleCart:  () => void;
  addItem:     (item: Omit<CartItem, 'cartId'>) => void;
  removeItem:  (cartId: string) => void;
  updateItem:  (cartId: string, updates: Partial<Pick<CartItem, 'qty' | 'colorIndex' | 'color' | 'size'>>) => void;
  clearCart:   () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'ihsen_cart_v1';

// ── Provider ───────────────────────────────────────────────────────────────
export function CartProvider({ children }: { children: ReactNode }) {
  const [items,   setItems]   = useState<CartItem[]>([]);
  const [isOpen,  setIsOpen]  = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount (client only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved) as CartItem[]);
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  // Persist to localStorage whenever items change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch { /* ignore */ }
  }, [items, hydrated]);

  const openCart   = useCallback(() => setIsOpen(true),  []);
  const closeCart  = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen(p => !p), []);

  const addItem = useCallback((item: Omit<CartItem, 'cartId'>) => {
    const cartId = `${item.productId}-${item.colorIndex}-${item.size}-${Date.now()}`;
    // If exact same product+color+size already in cart, just increment qty
    setItems(prev => {
      const existing = prev.find(
        i => i.productId === item.productId &&
             i.colorIndex === item.colorIndex &&
             i.size === item.size
      );
      if (existing) {
        return prev.map(i =>
          i.cartId === existing.cartId
            ? { ...i, qty: i.qty + item.qty }
            : i
        );
      }
      return [...prev, { ...item, cartId }];
    });
  }, []);

  const removeItem = useCallback((cartId: string) => {
    setItems(prev => prev.filter(i => i.cartId !== cartId));
  }, []);

  const updateItem = useCallback((cartId: string, updates: Partial<Pick<CartItem, 'qty' | 'colorIndex' | 'color' | 'size'>>) => {
    setItems(prev => prev.map(i =>
      i.cartId === cartId ? { ...i, ...updates } : i
    ).filter(i => i.qty > 0));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((s, i) => s + i.qty, 0);
  const subtotal  = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{
      items, itemCount, subtotal, isOpen,
      openCart, closeCart, toggleCart,
      addItem, removeItem, updateItem, clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
