import type { DecimalString, IsoDateTimeString, NumericId, PaginationResponseDto } from "./common";
import type { PaymentMethod } from "./orders";

export interface CurrencyDto { currency_id: NumericId; code: string; name: string; symbol: string; is_base: boolean; is_active: boolean; created_at: IsoDateTimeString; }
export interface PaymentCheckInputDto { check_number: string; account_number?: string; bank_number?: string; branch_number?: string; due_date?: string; }
export interface CreatePaymentDto { amount: number; currency_id: NumericId; exchange_rate: number; payment_method: PaymentMethod; check?: PaymentCheckInputDto; money_account_id?: number; cash_account_id?: number; bank_account_id?: number; notes?: string; paid_at?: string; }
export type CheckDisplayStatus = "NotDue" | "Due" | "Returned";
export interface PaymentCheckDto { check_number: string; account_number?: string | null; bank_number?: string | null; branch_number?: string | null; due_date?: string | null; status: CheckDisplayStatus; collected_at?: IsoDateTimeString | null; returned_at?: IsoDateTimeString | null; return_reason?: string | null; }
export interface PaymentDto { id: NumericId; voucher_number?: string; payment_type: "Receipt" | "Disbursement"; amount: DecimalString; currency: CurrencyDto | null; exchange_rate: DecimalString | null; base_amount: DecimalString | null; payment_method: PaymentMethod; paid_at: IsoDateTimeString; notes?: string | null; recorded_by: { user_id: NumericId; name: string } | null; updated_by?: { user_id: NumericId; name: string } | null; cancelled_at?: IsoDateTimeString | null; cancelled_by?: { user_id: NumericId; name: string } | null; effective_state: "Effective" | "Returned" | "Cancelled"; check: PaymentCheckDto | null; customer?: { customer_id: NumericId; name: string; phone: string } | null; customer_purchase?: { customer_purchase_id: NumericId; status: string; total_amount: DecimalString } | null; }
export interface PaymentsListResponseDto { message: string; items: PaymentDto[]; pagination: PaginationResponseDto; }
export interface PaymentDetailsResponseDto { message: string; payment: PaymentDto; }
export interface CreatePaymentResponseDto { message: string; payment_id: NumericId; voucher_number?: string; base_amount: DecimalString; }
export interface CheckListItemDto extends PaymentCheckDto { payment_id: NumericId; payment?: PaymentDto; }
export interface ChecksQuery { page?: number; limit?: number; search?: string; status?: CheckDisplayStatus; due_from?: string; due_to?: string; }
export interface ChecksListResponseDto { message: string; items: CheckListItemDto[]; pagination: PaginationResponseDto; }
export interface WriteOffDto { write_off_id: NumericId; customer_id: NumericId; amount: DecimalString; notes?: string | null; created_at: IsoDateTimeString; cancelled_at?: IsoDateTimeString | null; is_cancelled: boolean; created_by_user?: { user_id: NumericId; name: string } | null; }
export interface WriteOffInputDto { amount: number; notes?: string; }
export interface WriteOffsResponseDto { message: string; items: WriteOffDto[]; pagination: PaginationResponseDto; }

export interface TreasuryBalanceDto { balance: DecimalString; cash_net: DecimalString; collected_checks_net: DecimalString; pending_incoming_checks: DecimalString; pending_outgoing_checks: DecimalString; }
export interface TreasuryOpeningBalanceInputDto { amount: number; effective_at: string; notes?: string; }
export interface TreasuryOpeningBalanceDto { treasury_entry_id: NumericId; amount: DecimalString; effective_at: IsoDateTimeString; notes?: string | null; cancelled_at?: IsoDateTimeString | null; }
export type ReturnType = "SalesReturn" | "PurchaseReturn";
export interface ReturnItemDto { customer_return_item_id: number; product_variant_id: number; quantity: number; unit_price: DecimalString; product_variants: { size: string; is_active: boolean; products: { name: string; code: string; is_active: boolean }; colors: { name: string } }; }
export interface PurchaseReturnDto { customer_return_id: number; return_type: "PurchaseReturn"; customer_id: number | null; account_id: number | null; account?: { account_id: number; name: string } | null; customer_purchase_id: number | null; total_amount: DecimalString; notes: string | null; created_at: IsoDateTimeString; cancelled_at: IsoDateTimeString | null; items: ReturnItemDto[]; }
export interface SalesReturnDto { customer_return_id: number; return_number: string; return_date: string; status: "Completed" | "Cancelled"; account_id: number; account: { account_id: number; name: string }; total_amount: DecimalString; notes: string | null; created_at: string; updated_at: string; created_by_user: { user_id: number; name: string }; items: ReturnItemDto[]; history?: Array<{ audit_log_id: number; action: string; created_at: string; users: { user_id: number; name: string } | null; before_data: unknown; after_data: unknown }>; }
export interface SalesReturnInput { account_id: number; return_date: string; notes?: string; items: Array<{ customer_return_item_id?: number; product_variant_id: number; quantity: number; unit_price: number }>; }
export interface ReturnVariant { product_variant_id: number; size: string; is_active: boolean; products: { name: string; code: string; is_active: boolean }; colors: { name: string }; }
export interface ReturnsQuery { page?: number; limit?: number; search?: string; account_id?: number; status?: "Completed" | "Cancelled"; date_from?: string; date_to?: string; }
export interface CreateReturnDto { items: Array<{ product_variant_id: number; quantity: number; unit_price?: number }>; notes?: string; }
export interface CreateAccountReturnDto { account_id: number; type: "PurchaseReturn"; items: Array<{ product_variant_id: number; quantity: number; unit_price: number }>; notes?: string; }
