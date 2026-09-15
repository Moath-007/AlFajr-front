import type {
  DecimalString,
  IsoDateTimeString,
  NumericId,
  PaginationResponseDto,
} from "./common";
import type { PaymentMethod } from "./orders";

export interface NotificationsQuery {
  page?: number;
  limit?: number;
  unread_only?: boolean;
}
export interface NotificationRepresentativeDto {
  user_id: NumericId;
  name: string;
}
export interface NotificationCustomerDto {
  customer_id: NumericId;
  name: string;
  phone: string;
}
export interface NotificationDto {
  id: NumericId;
  type: "PaymentReceived" | "OrderCreated";
  is_read: boolean;
  created_at: IsoDateTimeString;
  message: string;
  order_id: NumericId;
  payment_id: NumericId | null;
  amount: DecimalString;
  payment_method: PaymentMethod | null;
  representative: NotificationRepresentativeDto | null;
  customer: NotificationCustomerDto;
}
export interface NotificationsListResponseDto {
  notifications: NotificationDto[];
  pagination: PaginationResponseDto;
}
export interface UnreadCountResponseDto {
  unread_count: number;
}
export interface NotificationActionResponseDto {
  message: string;
}
