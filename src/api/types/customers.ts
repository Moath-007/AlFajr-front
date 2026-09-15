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
}

export interface CustomerBalanceResponseDto {
  message: string;
  customer: CustomerBalanceDataDto;
}
export interface CustomerSettlementDto { amount: number; payment_method: PaymentMethod; check_number?: string; notes?: string; }
export interface SettlementAllocationDto { order_id: NumericId; amount: DecimalString; remaining_amount: DecimalString; payment_status: "Paid" | "PartiallyPaid"; }
export interface CustomerSettlementResponseDto {
  message: string;
  customer: { id: NumericId; name: string; phone: string };
  settlement: { amount: DecimalString; payment_method: PaymentMethod; check_number: string | null };
  allocations: SettlementAllocationDto[];
  summary: { allocated_amount: DecimalString; remaining_customer_debt: DecimalString };
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
export interface CustomersListResponseDto {
  customers: CustomerSelectionDto[];
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
  closing_balance: DecimalString;
}
export interface StatementEntryDto {
  date: IsoDateTimeString;
  type: "Order" | "Payment";
  description: string;
  order_id: NumericId;
  payment_id: NumericId | null;
  order_type: OrderType | null;
  payment_method: PaymentMethod | null;
  check_number: string | null;
  debit: DecimalString;
  credit: DecimalString;
  balance: DecimalString;
}
export interface CustomerStatementResponseDto {
  customer: StatementCustomerDto;
  period: StatementPeriodDto;
  summary: StatementSummaryDto;
  entries: StatementEntryDto[];
}
