import { createContext } from 'react';

export const RETAIL_CART_STORAGE_KEY = 'alfajr_retail_cart';

export interface PublicCartItem {
  product_variant_id: number;
  product_id: number;
  product_name: string;
  product_code: string;
  image_url: string | null;
  size: string;
  color: string;
  quantity: number;
  stock_quantity: number;
  display_price: number;
  display_discount: number;
  display_effective_price: number;
}

export interface AddCartItemResult { ok: boolean; message: string; }

export interface PublicCartContextValue {
  items: PublicCartItem[];
  totalQuantity: number;
  displaySubtotal: number;
  addItem: (item: PublicCartItem) => AddCartItemResult;
  setQuantity: (productVariantId: number, quantity: number) => AddCartItemResult;
  removeItem: (productVariantId: number) => void;
  clearCart: () => void;
}

export const PublicCartContext = createContext<PublicCartContextValue | null>(null);
