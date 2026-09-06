import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PublicCartContext, RETAIL_CART_STORAGE_KEY, type AddCartItemResult, type PublicCartItem } from './PublicCartContext';

export function PublicCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PublicCartItem[]>(readStoredCart);

  useEffect(() => {
    if (items.length === 0) localStorage.removeItem(RETAIL_CART_STORAGE_KEY);
    else localStorage.setItem(RETAIL_CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((incoming: PublicCartItem): AddCartItemResult => {
    const index = items.findIndex((item) => item.product_variant_id === incoming.product_variant_id);
    const existingQuantity = index >= 0 ? items[index].quantity : 0;
    const nextQuantity = existingQuantity + incoming.quantity;
    if (nextQuantity > incoming.stock_quantity) return { ok: false, message: 'الكمية المطلوبة تتجاوز المخزون المتاح.' };
    setItems(index < 0 ? [...items, incoming] : items.map((item, itemIndex) => itemIndex === index ? { ...incoming, quantity: nextQuantity } : item));
    return { ok: true, message: 'تمت إضافة المنتج إلى السلة.' };
  }, [items]);

  const setQuantity = useCallback((productVariantId: number, quantity: number): AddCartItemResult => {
    const item = items.find((candidate) => candidate.product_variant_id === productVariantId);
    if (!item) return { ok: false, message: 'هذا المنتج غير موجود في السلة.' };
    if (!Number.isInteger(quantity) || quantity < 1) return { ok: false, message: 'الحد الأدنى للكمية هو قطعة واحدة.' };
    if (quantity > item.stock_quantity) return { ok: false, message: 'الكمية المطلوبة تتجاوز المخزون المتاح.' };
    setItems((current) => current.map((candidate) => candidate.product_variant_id === productVariantId ? { ...candidate, quantity } : candidate));
    return { ok: true, message: '' };
  }, [items]);

  const removeItem = useCallback((productVariantId: number) => setItems((current) => current.filter((item) => item.product_variant_id !== productVariantId)), []);
  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo(() => ({
    items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    displaySubtotal: items.reduce((sum, item) => sum + item.display_effective_price * item.quantity, 0),
    addItem,
    setQuantity,
    removeItem,
    clearCart,
  }), [addItem, clearCart, items, removeItem, setQuantity]);

  return <PublicCartContext.Provider value={value}>{children}</PublicCartContext.Provider>;
}

function readStoredCart(): PublicCartItem[] {
  try {
    const stored = localStorage.getItem(RETAIL_CART_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error('Invalid cart');
    const validItems = parsed.filter(isPublicCartItem);
    if (validItems.length !== parsed.length) localStorage.setItem(RETAIL_CART_STORAGE_KEY, JSON.stringify(validItems));
    return validItems;
  } catch {
    localStorage.removeItem(RETAIL_CART_STORAGE_KEY);
    return [];
  }
}

function isPublicCartItem(value: unknown): value is PublicCartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<PublicCartItem>;
  return Number.isInteger(item.product_variant_id) && Number.isInteger(item.product_id)
    && typeof item.product_name === 'string' && typeof item.product_code === 'string'
    && (typeof item.image_url === 'string' || item.image_url === null)
    && typeof item.size === 'string' && typeof item.color === 'string'
    && Number.isInteger(item.quantity) && (item.quantity ?? 0) >= 1
    && Number.isInteger(item.stock_quantity) && (item.stock_quantity ?? 0) >= (item.quantity ?? 1)
    && isFiniteNumber(item.display_price) && isFiniteNumber(item.display_discount)
    && isFiniteNumber(item.display_effective_price);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
