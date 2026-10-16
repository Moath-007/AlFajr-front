import type {
  IsoDateTimeString,
  NumericId,
  PaginationResponseDto,
} from "./common";
export type CommercialClassification = 'Customer' | 'Supplier';
export type UserAccountKind = "General" | "Cash" | "Bank";
// Identity contracts never include financial data.
export interface AccountIdentity {
  commercial_classification?:CommercialClassification|null;
  group?: AccountGroupIdentity | null;
  group_id?:number|null;
  account_id: NumericId;
  account_number: string;
  name: string;
  kind: UserAccountKind;
  phone: string | null;
  city_id: number | null;
  city: { city_id: number; name: string } | null;
  notes: string | null;
  created_at: IsoDateTimeString;
}
export type AccountIdentityOption = Pick<
  AccountIdentity,
  "account_id" | "account_number" | "name" | "kind" | "commercial_classification" | "phone" | "group" | "group_id"
>;
export interface AccountsQuery {
  commercial_classification?:CommercialClassification;
  group_id?:number;
  scope?:'commercial'|'financial';
  search?: string;
  type?: "All" | UserAccountKind;
  page?: number;
  limit?: number;
}
export interface AccountIdentityInput {
  commercial_classification?:CommercialClassification;
  group_id?:number;
  city_id?: number;
  opening_balance?: OpeningBalanceInput;
  kind: UserAccountKind;
  name: string;
  phone?: string | null;
  notes?: string | null;
}
export type AccountIdentityEdit = Partial<
  Pick<AccountIdentityInput, "name" | "phone" | "notes" | "city_id" | "commercial_classification">
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
  direction: "Debit" | "Credit";
  business_date: string;
  notes?: string;
}
export interface AccountDiscountInput {
  amount: number;
  direction: "ReduceReceivable" | "ReducePayable";
  business_date: string;
  notes?: string;
}
export interface AccountFinancialDocument {
  document_id: number;
  account_id: number;
  document_type: "Opening" | "Discount";
  amount: string;
  direction:
    OpeningBalanceInput["direction"] | AccountDiscountInput["direction"];
  business_date: string;
  notes: string | null;
  status: "Completed" | "Cancelled";
  active_journal_id: number | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  created_by: number;
  updated_by: number;
  cancelled_by: number | null;
}
export type AccountMovementType =
  | "Opening"
  | "Sale"
  | "Purchase"
  | "SalesReturn"
  | "PurchaseReturn"
  | "Receipt"
  | "Disbursement"
  | "CheckMovement"
  | "AccountDiscount"
  | "Journal"
  | "Reversal"
  | "Other";
export interface AccountMovementQuery {
  search?: string;
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
  search?: string | null;
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
    | "FinancialVoucher"
    | "Invoice"
    | "Purchase"
    | "SalesReturn"
    | "PurchaseReturn"
    | "Payment"
    | "Check"
    | "Opening"
    | "Discount";
  id: number;
}
export interface AccountStatementEntry {
  source_document_number?: string | null;
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
  counterpart_lines?: Array<{ account_code: string; account_name: string; debit: string; credit: string }>;
  source: AccountSource | null;
  notes: string | null;
}
export interface EffectiveAccountStatement {
  accounting_view?: 'effective_documents';
  balance_convention?: 'DebitMinusCredit';
  balance_scope?: 'all_movements_of_selected_accounts';
  filtered_totals?: AccountMovementTotals;
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
export interface AccountGroupIdentity { group_id: number; name: string; reserved_key: string | null }
export interface GroupBalanceSummary { accounts_count: number; total_debit_balances: string; total_credit_balances: string; net_balance: string }
export interface GroupAccountIdentity { account_id: number; account_number: string; name: string }
export interface GroupStatementQuery extends AccountMovementQuery { account_id?: number }
export interface GroupSummary { group: AccountGroupIdentity; summary: GroupBalanceSummary; balance_convention: 'DebitMinusCredit'; accounts: Array<GroupAccountIdentity & { balance: string; balance_side: 'Debit' | 'Credit' | 'Zero' }> }
export interface GroupStatement extends Omit<EffectiveAccountStatement, 'account' | 'entries'> {
  group: AccountGroupIdentity;
  group_summary: GroupBalanceSummary;
  selected_accounts_summary: GroupBalanceSummary;
  scope: { account_id: number | null; balance_accounts: 'selected_account' | 'whole_group'; row_filters_change_balances: false };
  accounts?: GroupSummary['accounts'];
  entries: Array<AccountStatementEntry & { account: GroupAccountIdentity }>;
}
