import type { DecimalString, IsoDateTimeString, NumericId } from './common';
import type { ApiOrderStatus } from './orders';

export interface AdminDashboardQuery {
  range?: 'current_month' | 'all_time';
  date_from?: string;
  date_to?: string;
}
export interface AdminDashboardResponseDto {
  period: { date_from: string; date_to: string; timezone: 'Asia/Hebron'; scope: 'all_time' | 'selected_or_current_month' };
  financial: { net_sales_base: DecimalString; net_collections_base: DecimalString;
    party_debit_balances_base: DecimalString; party_credit_balances_base: DecimalString;
    treasury_base_balance: DecimalString };
  orders: { completed: number; pending: number; cancelled: number; pending_online: number;
    scope: 'current_document_state' };
  stock_alerts: { low: number; out: number; negative: number; low_threshold: 5 };
  check_alerts: { due_today: number; overdue: number; scope: 'incoming_in_treasury_bank_collection' };
  recent_orders: Array<{ order_id: NumericId; status: ApiOrderStatus;
    total_amount: DecimalString; created_at: IsoDateTimeString; customer: { id: NumericId; name: string } | null;
    sale_account: { id: NumericId; name: string } | null }>;
}
