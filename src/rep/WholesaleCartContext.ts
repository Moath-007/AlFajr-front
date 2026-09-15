import { createContext } from 'react';
import type { DecimalString, NumericId } from '@/api';

export interface WholesaleCartItem {
  product_id: NumericId;
  product_name: string;
  product_code: string;
  product_variant_id: NumericId;
  size: string;
  color: string;
  quantity: number;
  last_known_stock: number;
  display_price: DecimalString;
  display_discount: DecimalString;
}

export interface WholesaleCartValue {
  items: WholesaleCartItem[];
  totalQuantity: number;
  addItem: (item: WholesaleCartItem) => void;
  updateQuantity: (variantId: NumericId, quantity: number) => void;
  removeItem: (variantId: NumericId) => void;
  clearCart: () => void;
}

export const WholesaleCartContext = createContext<WholesaleCartValue | null>(null);
