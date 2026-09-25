import type { DecimalString, IsoDateTimeString, NumericId } from "./common";
export interface CustomerPurchaseItemInputDto { product_variant_id: NumericId; quantity: number; unit_price: number; }
export interface CustomerPurchaseItemDto { customer_purchase_item_id: NumericId; product_variant_id: NumericId; quantity: number; unit_price: DecimalString; product_variants?: { variant_id?: NumericId; size: string; colors?: { color_name?: string; name?: string }; products?: { product_name?: string; name?: string; code: string } }; }
export interface CustomerPurchaseDto { customer_purchase_id: NumericId; customer_id: NumericId; total_amount: DecimalString; status: "Completed" | "Cancelled"; notes?: string | null; created_at: IsoDateTimeString; cancelled_at?: IsoDateTimeString | null; customers?: { customer_id: NumericId; name: string; phone: string }; customer_purchase_items: CustomerPurchaseItemDto[]; }
export interface CreateCustomerPurchaseDto { customer_id: NumericId; items: CustomerPurchaseItemInputDto[]; notes?: string; }
export interface UpdateCustomerPurchaseDto { items: CustomerPurchaseItemInputDto[]; notes?: string; }
export interface CustomerPurchasesResponseDto { message: string; items?: CustomerPurchaseDto[]; purchases?: CustomerPurchaseDto[]; }
export interface CustomerPurchaseDetailsResponseDto { message: string; item?: CustomerPurchaseDto; purchase?: CustomerPurchaseDto; }
export interface CreateCustomerPurchaseResponseDto { message: string; purchase_id: NumericId; total_amount: DecimalString; }
