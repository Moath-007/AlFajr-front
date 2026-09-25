import type {
  DecimalString,
  IsoDateTimeString,
  NumericId,
  PaginationResponseDto,
} from "./common";
import type { OrderType, PaymentMethod } from "./orders";

export interface CustomerBalanceDataDto {
  id: NumericId;
  name: string;
  phone: string;
  email?: string | null;
  created_at: IsoDateTimeString;
  total_outstanding_amount: DecimalString;
  balance: DecimalString;
  amount_due_from_customer: DecimalString;
  amount_due_to_customer: DecimalString;
}

export interface CustomerBalanceResponseDto {
  message: string;
  customer: CustomerBalanceDataDto;
}
export interface CustomersQuery {
  page?: number;
  limit?: number;
  search?: string;
}
export interface CustomerSelectionDto {
  customer_id: NumericId;
  name: string;
  phone: string;
  email: string | null;
}
export interface ManageCustomerDto {
  name: string;
  phone: string;
  email?: string;
  initial_debt_amount?: number;
  initial_debt_date?: string;
  initial_debt_reason?: string;
  initial_debt_notes?: string;
}
export interface CustomersListResponseDto {
  customers: CustomerSelectionDto[];
  pagination: PaginationResponseDto;
}
export interface CustomerDebtDto {
  id: NumericId;
  amount: DecimalString;
  /** @deprecated لا يُعرض؛ الدين جزء من الحساب الموحّد */ remaining_amount: DecimalString;
  debt_date: IsoDateTimeString;
  reason: string;
  notes?: string | null;
  created_at: IsoDateTimeString;
  cancelled_at?: IsoDateTimeString | null;
  created_by?: { user_id: NumericId; name: string } | null;
  cancelled_by?: { user_id: NumericId; name: string } | null;
}
export interface CreateCustomerDebtDto {
  amount: number;
  debt_date: string;
  reason: string;
  notes?: string;
}
export interface CustomerDebtsResponseDto {
  items: CustomerDebtDto[];
  pagination: PaginationResponseDto;
}
export interface CustomerStatementQuery {
  date_from?: string;
  date_to?: string;
}
export type StatementCustomerDto = CustomerSelectionDto;
export interface StatementPeriodDto {
  date_from: string | null;
  date_to: string;
  timezone: "Asia/Hebron";
}
export interface StatementSummaryDto {
  opening_balance: DecimalString;
  orders_total: DecimalString;
  payments_total: DecimalString;
  debits_total: DecimalString;
  credits_total: DecimalString;
  customer_purchases_total: DecimalString;
  sales_returns_total: DecimalString;
  purchase_returns_total: DecimalString;
  disbursements_total: DecimalString;
  write_offs_total: DecimalString;
  opening_adjustments_total: DecimalString;
  pending_checks_total: DecimalString;
  closing_balance: DecimalString;
}
export interface StatementEntryDto {
  date: IsoDateTimeString;
  type:
    | "Order"
    | "OrderCancelled"
    | "Payment"
    | "Disbursement"
    | "ReturnedCheck"
    | "PaymentCancelled"
    | "WriteOff"
    | "WriteOffCancelled"
    | "CustomerDebt"
    | "CustomerDebtCancelled"
    | "CustomerPurchase"
    | "CustomerPurchaseCancelled"
    | "OpeningBalance"
    | "OpeningBalanceCancelled"
    | "SalesReturn"
    | "PurchaseReturn"
    | "ReturnCancelled";
  description: string;
  order_id: NumericId | null;
  payment_id: NumericId | null;
  order_type: OrderType | null;
  payment_method: PaymentMethod | null;
  check_number: string | null;
  debit: DecimalString;
  credit: DecimalString;
  balance: DecimalString;
  actor?: { user_id: NumericId; name: string } | null;
}
export interface CustomerStatementResponseDto {
  customer: StatementCustomerDto;
  period: StatementPeriodDto;
  summary: StatementSummaryDto;
  orders: StatementOrderDto[];
  entries: StatementEntryDto[];
}
export interface StatementOrderDto {
  order_id: NumericId;
  order_type: OrderType;
  status: string;
  total_amount: DecimalString;
  order_discount: DecimalString;
  created_at: IsoDateTimeString;
  cancelled_at: IsoDateTimeString | null;
  representative_name: string | null;
  items: Array<{
    product_name: string;
    product_code: string;
    size: string;
    color: string;
    quantity: number;
    unit_price: DecimalString;
    base_unit_price: DecimalString;
    product_discount: DecimalString;
    is_bonus: boolean;
    total: DecimalString;
  }>;
}
export interface CustomerAccountDto extends CustomerSelectionDto {
  balance: DecimalString;
  amount_due_from_customer: DecimalString;
  amount_due_to_customer: DecimalString;
  pending_checks_amount: DecimalString;
  last_activity_at: IsoDateTimeString | null;
}
export interface CustomerAccountsResponseDto {
  items: CustomerAccountDto[];
  pagination: PaginationResponseDto;
}
export interface CustomerOpeningBalanceInputDto {
  direction: "DueFromCustomer" | "DueToCustomer";
  amount: number;
  effective_at: string;
  notes?: string;
}
export interface CustomerOpeningBalanceDto {
  customer_account_adjustment_id: NumericId;
  direction: "Debit" | "Credit";
  amount: DecimalString;
  effective_at: IsoDateTimeString;
  notes?: string | null;
  cancelled_at?: IsoDateTimeString | null;
}
