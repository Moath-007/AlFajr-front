import type { DecimalString, IsoDateTimeString, NumericId } from './common';
import type { CurrencyDto } from './finance';

export interface CustomerPurchaseItemInputDto { product_variant_id: NumericId; quantity: number; unit_price: number }
export interface CustomerPurchaseItemDto { customer_purchase_item_id: NumericId; product_variant_id: NumericId; quantity: number; unit_price: DecimalString; product_variants?: { variant_id?: NumericId; size: string; colors?: { color_name?: string; name?: string }; products?: { product_name?: string; name?: string; code: string } } }
export interface CustomerPurchasePaymentInputDto {
  amount: number; currency_id: NumericId; exchange_rate: number; payment_method: 'Cash' | 'Check';
  cash_account_id?: NumericId; check_number?: string; account_number?: string; bank_number?: string;
  branch_number?: string; due_date?: string; bank_account_id?: NumericId; paid_at?: IsoDateTimeString;
}
export interface CustomerPurchaseLinkedPaymentDto {
  payment_id: NumericId; customer_purchase_id: NumericId; payment_type: 'Disbursement';
  amount: DecimalString; base_amount: DecimalString | null; exchange_rate: DecimalString | null;
  payment_method: 'Cash' | 'Check'; currency_id: NumericId; paid_at: IsoDateTimeString;
  cancelled_at: IsoDateTimeString | null; check_number: string | null;
  currencies: CurrencyDto | null;
  managed_checks: { managed_check_id: NumericId; number: string; direction: 'Outgoing' | 'Incoming'; location: string; due_date: IsoDateTimeString; bank_name: string | null } | null;
  recorded_by_user?: { user_id: NumericId; name: string } | null;
}
export interface CustomerPurchaseDto {
  customer_purchase_id: NumericId; customer_id: NumericId | null; account_id: NumericId | null;
  account?: { account_id: NumericId; name: string } | null; total_amount: DecimalString;
  paid_amount: DecimalString; remaining_amount: DecimalString;
  status: 'Completed' | 'Cancelled'; notes?: string | null;
  created_at: IsoDateTimeString; cancelled_at?: IsoDateTimeString | null;
  customers?: { customer_id: NumericId; name: string; phone: string };
  customer_purchase_items: CustomerPurchaseItemDto[]; payments: CustomerPurchaseLinkedPaymentDto[];
}
export interface CreateCustomerPurchaseDto { customer_id: NumericId; items: CustomerPurchaseItemInputDto[]; payments: CustomerPurchasePaymentInputDto[]; notes?: string }
export interface CreateAccountPurchaseDto { account_id: NumericId; items: CustomerPurchaseItemInputDto[]; notes?: string }
export interface UpdateCustomerPurchaseDto { items: CustomerPurchaseItemInputDto[]; notes?: string }
export interface CreateCustomerPurchaseResponseDto { message: string; purchase_id: NumericId; total_amount: DecimalString }
