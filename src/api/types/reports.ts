import type { DecimalString, NumericId, PaginationResponseDto } from "./common";

export type ReportGroupBy = "day" | "week" | "month";
export interface DateReportQuery {
  date_from?: string;
  date_to?: string;
}
export interface GroupedReportQuery extends DateReportQuery {
  group_by?: ReportGroupBy;
}

export interface SalesReportQuery extends GroupedReportQuery {
  source?: "Online" | "Direct" | "Representative";
  sale_account_id?: NumericId;
  customer_id?: NumericId;
  representative_id?: NumericId;
  page?: number;
  limit?: number;
}
export interface SalesReportSummaryDto {
  gross_sales: DecimalString;
  returns: DecimalString;
  net_sales: DecimalString;
}
export interface SalesReportBreakdownDto extends SalesReportSummaryDto { source?: "Online" | "Direct" | "Representative" | "Unknown"; sale_account_id?: NumericId | null; sale_account_name?: string | null }
export interface SalesReportSeriesItemDto extends SalesReportSummaryDto { period: string }
export interface SalesReportActivityDto { journal_entry_id: NumericId; occurred_at: string; kind: "Sale" | "SaleReversal" | "SalesReturn" | "ReturnReversal"; order_id: NumericId | null; return_id: NumericId | null; source: "Online" | "Direct" | "Representative" | "Unknown"; sale_account_id: NumericId | null; sale_account_name: string | null; customer: { id: NumericId; name: string | null } | null; representative: { id: NumericId; name: string | null } | null; gross_effect: DecimalString; returns_effect: DecimalString; net_effect: DecimalString }
export interface SalesReportResponseDto {
  period: { date_from: string; date_to: string; timezone: "Asia/Hebron" };
  filter_scope: "ledger_activity" | "known_metadata_only";
  summary: SalesReportSummaryDto;
  by_source: SalesReportBreakdownDto[];
  by_sale_account: SalesReportBreakdownDto[];
  time_series: SalesReportSeriesItemDto[];
  activity: { items: SalesReportActivityDto[]; pagination: PaginationResponseDto };
}

export interface CollectionsReportQuery extends GroupedReportQuery {
  account_id?: NumericId;
  payment_method?: "Cash" | "Check";
  cash_account_id?: NumericId;
  currency_id?: NumericId;
  check_number?: string;
  recorded_by?: NumericId;
  page?: number;
  limit?: number;
}
export interface CollectionsReportTotalsDto {
  gross_receipts: DecimalString;
  receipt_reversals: DecimalString;
  check_adjustments: DecimalString;
  net_collections: DecimalString;
}
export type CollectionsReportActivityKind = "Receipt" | "ReceiptReversal" | "ReturnedToSource" | "RetrievedFromSource" | "CheckAdjustmentReversal";
export interface CollectionsReportActivityDto {
  journal_entry_id: NumericId;
  occurred_at: string;
  kind: CollectionsReportActivityKind;
  payment_id: NumericId;
  voucher_number: string;
  account: { id: NumericId; name: string };
  payment_method: string;
  cash_account: { id: NumericId; name: string } | null;
  bank_account_name: string | null;
  currency: { id: NumericId; code: string | null } | null;
  original_amount: DecimalString;
  exchange_rate: DecimalString | null;
  base_amount: DecimalString | null;
  base_effect: DecimalString;
  check_number: string | null;
  check_bank_name: string | null;
  check_due_date: string | null;
  check_current_location: string | null;
  recorded_by: { id: NumericId; name: string | null } | null;
  current_payment_status: "Active" | "Cancelled";
  notes: string | null;
}
export interface CollectionsReportResponseDto {
  period: { date_from: string; date_to: string; timezone: "Asia/Hebron" };
  filter_scope: "direct_payment_relation";
  actors: Array<{ id: NumericId; name: string | null }>;
  summary: CollectionsReportTotalsDto;
  by_method: Array<CollectionsReportTotalsDto & { method: string }>;
  by_currency: Array<CollectionsReportTotalsDto & { currency_id: NumericId | null; currency_code: string | null }>;
  by_cash_account: Array<CollectionsReportTotalsDto & { cash_account_id: NumericId; cash_account_name: string }>;
  time_series: Array<CollectionsReportTotalsDto & { period: string }>;
  activity: { items: CollectionsReportActivityDto[]; pagination: PaginationResponseDto };
}
export interface CustomerBalancesReportQuery {
  search?: string;
  balance_side?: 'All' | 'Debit' | 'Credit' | 'Zero';
  page?: number;
  limit?: number;
}
export interface CustomerBalancesReportResponseDto {
  snapshot_at: string;
  filter_scope: 'current_party_ledger';
  summary: {
    customers_count: number;
    customers_with_balance: number;
    debit_balances: DecimalString;
    credit_balances: DecimalString;
    net_balance: DecimalString;
  };
  items: Array<{
    customer: { id: NumericId; name: string; phone: string };
    party_account: { id: NumericId; name: string | null } | null;
    balance_base: DecimalString;
    balance_side: 'Debit' | 'Credit' | 'Zero';
    pending_checks_base: DecimalString;
  }>;
  pagination: PaginationResponseDto;
}

export interface ReturnsReportQuery extends GroupedReportQuery {
  return_type?: 'SalesReturn' | 'PurchaseReturn';
  customer_id?: NumericId;
  source?: 'Online' | 'Direct' | 'Representative' | 'CustomerPurchase' | 'Unknown';
  sale_account_id?: NumericId;
  search?: string;
  page?: number;
  limit?: number;
}
export interface ReturnsReportTotalsDto {
  gross_returns: DecimalString;
  return_reversals: DecimalString;
  net_returns: DecimalString;
}
export interface ReturnsReportResponseDto {
  period: { date_from: string; date_to: string; timezone: 'Asia/Hebron' };
  filter_scope: 'ledger_activity' | 'known_metadata_only';
  summary: ReturnsReportTotalsDto;
  by_type: Array<ReturnsReportTotalsDto & { return_type: 'SalesReturn' | 'PurchaseReturn' }>;
  by_source: Array<ReturnsReportTotalsDto & { source: 'Online' | 'Direct' | 'Representative' | 'CustomerPurchase' | 'Unknown' }>;
  time_series: Array<ReturnsReportTotalsDto & { period: string }>;
  activity: {
    items: Array<{
      journal_entry_id: NumericId;
      occurred_at: string;
      kind: 'Return' | 'ReturnReversal';
      return_type: 'SalesReturn' | 'PurchaseReturn';
      return_id: NumericId | null;
      order_id: NumericId | null;
      customer_purchase_id: NumericId | null;
      customer: { id: NumericId; name: string | null } | null;
      source: 'Online' | 'Direct' | 'Representative' | 'CustomerPurchase' | 'Unknown';
      sale_account_id: NumericId | null;
      sale_account_name: string | null;
      actor: { id: NumericId; name: string | null } | null;
      items_count: number | null;
      quantity: number | null;
      current_document_status: 'Active' | 'Cancelled' | 'Unavailable';
      gross_effect: DecimalString;
      reversal_effect: DecimalString;
      net_effect: DecimalString;
    }>;
    pagination: PaginationResponseDto;
  };
}
export interface ProductsReportQuery extends DateReportQuery {
  rank_by?: "quantity" | "sales_line_amount";
  page?: number;
  limit?: number;
  product_id?: NumericId;
  category_id?: NumericId;
  search?: string;
}
export type ReportPaginationDto = PaginationResponseDto;
export interface ProductReportRowDto {
  product_id: NumericId;
  name: string;
  code: string;
  category_id: NumericId;
  sold_quantity: number;
  returned_quantity: number;
  net_quantity: number;
  sales_line_amount: DecimalString;
  return_document_amount: DecimalString;
}
export interface ProductsReportResponseDto {
  semantics: 'current_product_documents';
  summary: { products_count: number; sold_quantity: number; returned_quantity: number;
    net_quantity: number; sales_line_amount: DecimalString; return_document_amount: DecimalString };
  products: ProductReportRowDto[];
  pagination: ReportPaginationDto;
}

export interface InventoryReportQuery {
  page?: number; limit?: number; search?: string; category_id?: NumericId;
  product_id?: NumericId; color_id?: NumericId;
  stock_status?: 'available' | 'low' | 'out' | 'negative';
}
export interface InventoryReportResponseDto {
  snapshot_at: string;
  low_stock_threshold: number;
  summary_scope: 'search_category_product_color';
  summary: { variants: number; total_quantity: number; available: number; low: number; out: number; negative: number };
  items: Array<{ product_variant_id: NumericId; product: { id: NumericId; name: string; code: string };
    category: { id: NumericId; name: string }; size: string; color: { id: NumericId; name: string };
    stock_quantity: number; stock_status: 'available' | 'low' | 'out' | 'negative';
    average_cost: DecimalString | null; retail_price: DecimalString }>;
  pagination: PaginationResponseDto;
}
export interface InventoryReportMovementsQuery {
  page?: number; limit?: number; date_from?: string; date_to?: string;
  product_id?: NumericId; variant_id?: NumericId; source_type?: string;
  actor_id?: NumericId; search?: string;
}
export interface InventoryReportMovementsResponseDto {
  timezone: 'Asia/Hebron'; date_basis: 'inventory_movements.created_at'; available_types: string[];
  items: Array<{ inventory_movement_id: NumericId; occurred_at_local: string;
    product_variant_id: NumericId; product: { id: NumericId; name: string; code: string };
    size: string; color: { id: NumericId; name: string }; source_type: string;
    quantity_change: number; order_id: NumericId | null; customer_purchase_id: NumericId | null;
    customer_return_id: NumericId | null; actor: { id: NumericId; name: string } | null; notes: string | null }>;
  pagination: PaginationResponseDto;
}

export type ChecksReportDirection = 'Incoming' | 'Outgoing';
export type ChecksReportDueStatus = 'Future' | 'Today' | 'Overdue';
export type ChecksReportLocation = 'TREASURY' | 'BANK' | 'COLLECTION' | 'ENDORSED_PARTY' |
  'SOURCE_PARTY' | 'CASHED' | 'CANCELLED' | 'ISSUED' | 'CLEARED' | 'RETURNED_OUTGOING';
export interface ChecksReportCurrencyDto { currency_id: NumericId; code: string; name: string; symbol: string }
export interface ChecksSnapshotReportQuery {
  page?: number; limit?: number; search?: string; direction?: ChecksReportDirection;
  location?: ChecksReportLocation; due_status?: ChecksReportDueStatus;
  currency_id?: NumericId; account_id?: NumericId; due_from?: string; due_to?: string;
}
export interface ChecksSnapshotReportResponseDto {
  snapshot_at: string; business_date: string; due_status_meaning: 'calendar_only';
  summary: { checks_count: number; future: number; due_today: number; overdue: number };
  by_location: Array<{ location: ChecksReportLocation; count: number }>;
  by_currency: Array<{ currency: ChecksReportCurrencyDto; direction: ChecksReportDirection;
    count: number; original_amount: DecimalString }>;
  items: Array<{ managed_check_id: NumericId; payment_id: NumericId; number: string;
    direction: ChecksReportDirection; bank_name: string | null; original_amount: DecimalString;
    currency: ChecksReportCurrencyDto; account: { id: NumericId; name: string };
    due_date: string; location: ChecksReportLocation; due_status: ChecksReportDueStatus;
    current_bank_account: { account_id: NumericId; name: string } | null;
    current_party_account: { account_id: NumericId; name: string } | null;
    classified_collected: boolean }>;
  pagination: PaginationResponseDto;
}
export interface ChecksMovementsReportQuery {
  page?: number; limit?: number; search?: string; direction?: ChecksReportDirection;
  currency_id?: NumericId; account_id?: NumericId; date_from?: string; date_to?: string;
  action?: string; actor_id?: NumericId; bank_account_id?: NumericId;
}
export interface ChecksMovementsReportResponseDto {
  date_basis: 'check_events.operation_date'; timezone: 'Asia/Hebron'; available_actions: string[];
  items: Array<{ check_event_id: NumericId; managed_check_id: NumericId;
    operation_date: string; created_at: string; action: string;
    from_location: ChecksReportLocation | null; to_location: ChecksReportLocation;
    number_current: string; direction: ChecksReportDirection; original_amount: DecimalString;
    currency: ChecksReportCurrencyDto; account: { id: NumericId; name: string };
    bank_name_current: string | null;
    bank_account: { account_id: NumericId; name: string } | null;
    party_account: { account_id: NumericId; name: string } | null;
    payment_id: NumericId; actor: { id: NumericId; name: string } | null;
    notes: string | null; cancelled_at: string | null; cancel_reason: string | null;
    cancels_event_id: NumericId | null; reversed_by_event_id: NumericId | null }>;
  pagination: PaginationResponseDto;
}

export interface RepresentativesReportQuery extends DateReportQuery {
  representative_id?: NumericId;
  page?: number;
  limit?: number;
  sort_by?: "completed_sales_document_amount" | "completed_orders_count" | "name";
  sort_order?: "asc" | "desc";
}
export interface RepresentativeReportRowDto {
  representative_id: NumericId;
  name: string;
  completed_orders_count: number;
  pending_orders_count: number;
  cancelled_orders_count: number;
  completed_sales_document_amount: DecimalString;
  returns_document_amount: DecimalString;
}
export interface RepresentativesReportResponseDto {
  semantics: 'current_wholesale_order_documents';
  representatives: RepresentativeReportRowDto[];
  pagination: ReportPaginationDto;
}

export interface WriteOffsReportQuery extends DateReportQuery {
  customer_id?: NumericId; actor_id?: NumericId; page?: number; limit?: number;
}
export interface WriteOffsReportResponseDto {
  date_basis: 'journal_entries.occurred_at'; timezone: 'Asia/Hebron';
  summary: { gross_write_offs: DecimalString; reversals: DecimalString; net_write_offs: DecimalString };
  activity: { items: Array<{ journal_entry_id: NumericId; original_journal_entry_id: NumericId | null;
    occurred_at: string; kind: 'WriteOff' | 'Reversal'; write_off_id: NumericId;
    customer: { id: NumericId; name: string }; actor: { id: NumericId; name: string | null } | null;
    amount: DecimalString; effect: DecimalString; notes: string | null }>;
    pagination: PaginationResponseDto };
}
