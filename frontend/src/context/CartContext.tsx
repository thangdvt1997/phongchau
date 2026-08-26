'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export interface CartItem {
  id: string;
  productVariantId: string;
  productId: string;
  productName: string;
  sku: string;
  weightLabel: string | null;
  packagingLabel: string | null;
  quantity: number;
  unitPrice: number;
  priceSource: string;
  currency: string;
  lineTotal: number;
}

export interface CartState {
  id: string;
  currency: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

interface CartContextValue {
  cart: CartState | null;
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (productVariantId: string, quantity: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/cart');
      setCart(data);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(async (productVariantId: string, quantity: number) => {
    const { data } = await apiClient.post('/cart/items', { productVariantId, quantity });
    setCart(data);
  }, []);

  const updateItem = useCallback(async (itemId: string, quantity: number) => {
    const { data } = await apiClient.patch(`/cart/items/${itemId}`, { quantity });
    setCart(data);
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    const { data } = await apiClient.delete(`/cart/items/${itemId}`);
    setCart(data);
  }, []);

  return (
    <CartContext.Provider value={{ cart, loading, refresh, addItem, updateItem, removeItem }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
