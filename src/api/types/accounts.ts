import type {
  IsoDateTimeString,
  NumericId,
  PaginationResponseDto,
} from './common';
export type UserAccountKind = 'General' | 'Cash' | 'Bank';
// Identity contracts never include financial data.
export interface AccountIdentity {
  account_id: NumericId;
  account_number: string;
  name: string;
  kind: UserAccountKind;
  phone: string | null;
  notes: string | null;
  created_at: IsoDateTimeString;
}
export type AccountIdentityOption = Pick<
  AccountIdentity,
  'account_id' | 'account_number' | 'name' | 'kind' | 'phone'
>;
export interface AccountsQuery {
  search?: string;
  type?: 'All' | UserAccountKind;
  page?: number;
  limit?: number;
}
export interface AccountIdentityInput {
  kind: UserAccountKind;
  name: string;
  phone?: string | null;
  notes?: string | null;
}
export type AccountIdentityEdit = Partial<
  Pick<AccountIdentityInput, 'name' | 'phone' | 'notes'>
>;
export interface AccountIdentityList {
  items: AccountIdentity[];
  pagination: PaginationResponseDto;
}
export interface AccountIdentityOptions {
  items: AccountIdentityOption[];
  pagination: PaginationResponseDto;
}
export interface OpeningBalanceInput {
  amount: number;
  direction: 'Debit' | 'Credit';
  business_date: string;
  notes?: string;
}
export interface AccountDiscountInput {
  amount: number;
  direction: 'ReduceReceivable' | 'ReducePayable';
  business_date: string;
  notes?: string;
}
export interface AccountFinancialDocument {
  document_id: number;
  account_id: number;
  document_type: 'Opening' | 'Discount';
  amount: string;
  direction:
    OpeningBalanceInput['direction'] | AccountDiscountInput['direction'];
  business_date: string;
  notes: string | null;
  status: 'Completed' | 'Cancelled';
  active_journal_id: number | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  created_by: number;
  updated_by: number;
  cancelled_by: number | null;
}
export type AccountMovementType =
  | 'Opening'
  | 'Sale'
  | 'Purchase'
  | 'SalesReturn'
  | 'PurchaseReturn'
  | 'Receipt'
  | 'Disbursement'
  | 'CheckMovement'
  | 'AccountDiscount'
  | 'Journal'
  | 'Reversal'
  | 'Other';
export interface AccountMovementQuery {
  from?: string;
  to?: string;
  movement_type?: AccountMovementType;
  page?: number;
  limit?: number;
}
export interface AccountMovementTotals {
  debit: string;
  credit: string;
  net: string;
  movement_count: number;
}
export interface AccountPeriodSummary extends AccountMovementTotals {
  categories: Array<AccountMovementTotals & { type: string }>;
}
export interface AccountPeriod {
  from: string | null;
  to: string | null;
  movement_type: string | null;
}
export interface AccountFinancialDetail {
  account: AccountIdentity;
  current_balance: string;
  opening_balance: AccountFinancialDocument | null;
  period: AccountPeriod;
  period_summary: AccountPeriodSummary;
}
export interface AccountSource {
  kind:
    | 'Invoice'
    | 'Purchase'
    | 'SalesReturn'
    | 'PurchaseReturn'
    | 'Payment'
    | 'Check'
    | 'Opening'
    | 'Discount';
  id: number;
}
export interface AccountStatementEntry {
  movement_id: string;
  date: string;
  type: string;
  category: string;
  debit: string;
  credit: string;
  balance: string;
  balance_after: string;
  effect: string;
  source_type: string | null;
  source_id: number | null;
  source_details: Record<string, unknown> | null;
  source: AccountSource | null;
  notes: string | null;
}
export interface EffectiveAccountStatement {
  account: AccountIdentity;
  current_balance: string;
  opening_balance: string;
  closing_balance: string;
  period: AccountPeriod;
  period_summary: AccountPeriodSummary;
  totals: AccountMovementTotals;
  available_types: string[];
  entries: AccountStatementEntry[];
  pagination: PaginationResponseDto;
}
