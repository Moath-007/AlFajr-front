import type { DecimalString, IsoDateTimeString, NumericId } from './common';

export interface PurchaseItemInputDto { product_variant_id: NumericId; quantity: number; unit_price: number }
export interface PurchaseItemDto { customer_purchase_item_id: NumericId; product_variant_id: NumericId; quantity: number; unit_price: DecimalString; product_variants?: { variant_id?: NumericId; size: string; colors?: { color_name?: string; name?: string }; products?: { product_name?: string; name?: string; code: string } } }
export interface PurchaseDto {
  customer_purchase_id: NumericId; account_id: NumericId;
  account?: { account_id: NumericId; name: string } | null; total_amount: DecimalString;
  status: 'Completed' | 'Cancelled'; notes?: string | null;
  created_at: IsoDateTimeString; purchase_date: string; cancelled_at?: IsoDateTimeString | null;
  customer_purchase_items: PurchaseItemDto[];
}
export interface CreateAccountPurchaseDto { account_id: NumericId; items: PurchaseItemInputDto[]; notes?: string; purchase_date?: string }
export interface UpdatePurchaseDto { items: PurchaseItemInputDto[]; notes?: string; purchase_date?: string }
export interface PurchasesQuery { page?: number; limit?: number; search?: string; status?: 'Completed' | 'Cancelled'; date_from?: string; date_to?: string; account_id?: number }
export interface PurchasesListResponse { items: PurchaseDto[]; summary: { active_count: number; active_amount: string }; pagination: { page: number; limit: number; total: number; total_pages: number } }
export interface CreatePurchaseResponseDto { message: string; purchase_id: NumericId; total_amount: DecimalString }
