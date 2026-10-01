import type {
  DecimalString,
  IsoDateTimeString,
  NumericId,
  PaginationResponseDto,
} from "./common";

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
  debits_total: DecimalString;
  credits_total: DecimalString;
  closing_balance: DecimalString;
  movements_count: number;
}
export interface StatementEntryDto {
  date: IsoDateTimeString;
  type: string;
  journal_entry_id: NumericId;
  journal_line_id: NumericId;
  source_type: string | null;
  source_id: NumericId | null;
  reversal_of: NumericId | null;
  description: string;
  payment_id: NumericId | null;
  source_details: import('./ledger').StatementSourceDetails | null;
  counterpart_lines: import('./ledger').StatementCounterpartLine[];
  payment_details: {
    method: "Cash" | "Check";
    amount: DecimalString;
    exchange_rate: DecimalString | null;
    base_amount: DecimalString | null;
    notes: string | null;
    currency: { code: string; name: string; symbol: string } | null;
    check: {
      number: string;
      bank_name: string | null;
      due_date: IsoDateTimeString;
      current_location: string;
    } | null;
  } | null;
  debit: DecimalString;
  credit: DecimalString;
  balance: DecimalString;
  actor?: { user_id: NumericId; name: string } | null;
}
export interface CustomerStatementResponseDto {
  customer: StatementCustomerDto;
  period: StatementPeriodDto;
  summary: StatementSummaryDto;
  entries: StatementEntryDto[];
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
