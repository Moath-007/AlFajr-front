import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { NumericId } from '@/api';
import { WholesaleCartContext, type WholesaleCartItem } from './WholesaleCartContext';

const STORAGE_KEY = 'alfajr_wholesale_cart';

function restoreCart(): WholesaleCartItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is WholesaleCartItem => {
      if (!item || typeof item !== 'object') return false;
      const value = item as Partial<WholesaleCartItem>;
      const quantity = value.quantity;
      const stock = value.last_known_stock;
      const positiveInteger = (candidate: unknown) => typeof candidate === 'number' && Number.isSafeInteger(candidate) && candidate > 0;
      const finiteNonNegative = (candidate: unknown) => typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0;
      const nonEmpty = (candidate: unknown) => typeof candidate === 'string' && candidate.trim().length > 0;
      const decimal = (candidate: unknown) => typeof candidate === 'string' && candidate.trim() !== '' && Number.isFinite(Number(candidate)) && Number(candidate) >= 0;
      return positiveInteger(value.product_id)
        && positiveInteger(value.product_variant_id)
        && positiveInteger(quantity)
        && finiteNonNegative(stock)
        && Number(quantity) <= Number(stock)
        && nonEmpty(value.product_name)
        && nonEmpty(value.product_code)
        && nonEmpty(value.size)
        && nonEmpty(value.color)
        && decimal(value.display_price)
        && decimal(value.display_discount);
    });
  } catch {
    return [];
  }
}

export default function WholesaleCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WholesaleCartItem[]>(restoreCart);

  const save = useCallback((updater: (current: WholesaleCartItem[]) => WholesaleCartItem[]) => {
    setItems((current) => {
      const next = updater(current);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Keep the in-memory cart usable if browser storage is unavailable.
      }
      return next;
    });
  }, []);

  const addItem = useCallback((item: WholesaleCartItem) => save((current) => {
    const existing = current.find((entry) => entry.product_variant_id === item.product_variant_id);
    if (!existing) return [...current, item];
    return current.map((entry) => entry.product_variant_id === item.product_variant_id
      ? { ...item, quantity: Math.min(entry.quantity + item.quantity, item.last_known_stock) }
      : entry);
  }), [save]);

  const updateQuantity = useCallback((variantId: NumericId, quantity: number) => save((current) => current.map((item) => item.product_variant_id === variantId
    ? { ...item, quantity: Math.max(1, Math.min(quantity, item.last_known_stock)) }
    : item)), [save]);
  const removeItem = useCallback((variantId: NumericId) => save((current) => current.filter((item) => item.product_variant_id !== variantId)), [save]);
  const clearCart = useCallback(() => save(() => []), [save]);
  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const value = useMemo(() => ({ items, totalQuantity, addItem, updateQuantity, removeItem, clearCart }), [addItem, clearCart, items, removeItem, totalQuantity, updateQuantity]);

  return <WholesaleCartContext.Provider value={value}>{children}</WholesaleCartContext.Provider>;
}
