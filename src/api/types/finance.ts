import type { DecimalString, IsoDateTimeString, NumericId, PaginationResponseDto } from "./common";
import type { PaymentMethod } from "./orders";

export interface CurrencyDto { currency_id: NumericId; code: string; name: string; symbol: string; is_base: boolean; is_active: boolean; created_at: IsoDateTimeString; }
export interface PaymentCheckInputDto { check_number: string; account_number?: string; bank_number?: string; branch_number?: string; due_date?: string; }
export interface CreatePaymentDto { amount: number; currency_id: NumericId; exchange_rate: number; payment_method: PaymentMethod; check?: PaymentCheckInputDto; notes?: string; paid_at?: string; }
export interface PaymentCheckDto { check_number: string; account_number?: string | null; bank_number?: string | null; branch_number?: string | null; due_date?: string | null; status: "Pending" | "Collected" | "Returned"; collected_at?: IsoDateTimeString | null; returned_at?: IsoDateTimeString | null; return_reason?: string | null; }
export interface PaymentAllocationDto { order_id: NumericId; amount: DecimalString; order?: { order_id: NumericId; total_amount: DecimalString; status: string }; }
export interface PaymentDto { id: NumericId; payment_type: "Receipt" | "Disbursement"; amount: DecimalString; currency: CurrencyDto | null; exchange_rate: DecimalString | null; base_amount: DecimalString | null; payment_method: PaymentMethod; paid_at: IsoDateTimeString; notes?: string | null; recorded_by: { user_id: NumericId; name: string } | null; updated_by?: { user_id: NumericId; name: string } | null; cancelled_at?: IsoDateTimeString | null; cancelled_by?: { user_id: NumericId; name: string } | null; effective_state: "Effective" | "Returned" | "Cancelled"; check: PaymentCheckDto | null; customer?: { customer_id: NumericId; name: string; phone: string } | null; allocations: PaymentAllocationDto[]; debt_allocations?: Array<{ customer_debt_id: NumericId; amount: DecimalString; customer_debts?: { customer_debt_id: NumericId; reason: string } }>; customer_purchase?: { customer_purchase_id: NumericId; status: string; total_amount: DecimalString } | null; }
export interface PaymentsListResponseDto { message: string; items: PaymentDto[]; pagination: PaginationResponseDto; }
export interface PaymentDetailsResponseDto { message: string; payment: PaymentDto; }
export interface CreatePaymentResponseDto { message: string; payment_id: NumericId; base_amount: DecimalString; }
export interface CheckListItemDto extends PaymentCheckDto { payment_id: NumericId; payment?: PaymentDto; }
export interface ChecksQuery { page?: number; limit?: number; search?: string; status?: PaymentCheckDto["status"]; due_from?: string; due_to?: string; due?: "overdue" | "upcoming"; }
export interface ChecksListResponseDto { message: string; items: CheckListItemDto[]; pagination: PaginationResponseDto; }
export interface WriteOffDto { write_off_id: NumericId; customer_id: NumericId; amount: DecimalString; notes?: string | null; created_at: IsoDateTimeString; cancelled_at?: IsoDateTimeString | null; is_cancelled: boolean; created_by_user?: { user_id: NumericId; name: string } | null; allocations: Array<{ order_id: NumericId; amount: DecimalString }>; debt_allocations?: Array<{ customer_debt_id: NumericId; amount: DecimalString }>; }
export interface WriteOffInputDto { amount: number; notes?: string; /** @deprecated الحساب موحّد ولا يجب إرساله */ order_id?: NumericId; }
export interface WriteOffsResponseDto { message: string; items: WriteOffDto[]; pagination: PaginationResponseDto; }

export interface TreasuryBalanceDto { balance: DecimalString; cash_net: DecimalString; collected_checks_net: DecimalString; pending_incoming_checks: DecimalString; pending_outgoing_checks: DecimalString; }
export interface TreasuryOpeningBalanceInputDto { amount: number; effective_at: string; notes?: string; }
export interface TreasuryOpeningBalanceDto { treasury_entry_id: NumericId; amount: DecimalString; effective_at: IsoDateTimeString; notes?: string | null; cancelled_at?: IsoDateTimeString | null; }
export type ReturnType = "SalesReturn" | "PurchaseReturn";
export interface ReturnItemDto { customer_return_item_id?: NumericId; product_variant_id: NumericId; quantity: number; unit_price?: DecimalString; product_variants?: { size?: string; products?: { name?: string; product_name?: string } }; }
export interface CustomerReturnDto { customer_return_id: NumericId; type: ReturnType; customer_id: NumericId; order_id?: NumericId | null; customer_purchase_id?: NumericId | null; total_amount: DecimalString; notes?: string | null; created_at: IsoDateTimeString; cancelled_at?: IsoDateTimeString | null; customers?: { customer_id: NumericId; name: string; phone: string }; items: ReturnItemDto[]; }
export interface CreateReturnDto { items: Array<{ product_variant_id: NumericId; quantity: number }>; notes?: string; }
export interface CreateDirectReturnDto { type: ReturnType; items: Array<{ product_variant_id: NumericId; quantity: number; unit_price: number }>; notes?: string; }
