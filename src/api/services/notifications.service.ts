import { apiClient } from "../client";
import type {
  NotificationActionResponseDto,
  NotificationsListResponseDto,
  NotificationsQuery,
  UnreadCountResponseDto,
} from "../types";

const withQuery = (query: NotificationsQuery) => {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.unread_only !== undefined)
    params.set("unread_only", String(query.unread_only));
  const value = params.toString();
  return value ? `/notifications?${value}` : "/notifications";
};

export const notificationsService = {
  list: (query: NotificationsQuery = {}, signal?: AbortSignal) =>
    apiClient.get<NotificationsListResponseDto>(withQuery(query), { signal }),
  unreadCount: (signal?: AbortSignal) =>
    apiClient.get<UnreadCountResponseDto>("/notifications/unread-count", {
      signal,
    }),
  markRead: (id: number, signal?: AbortSignal) =>
    apiClient.patch<NotificationActionResponseDto>(
      `/notifications/${id}/read`,
      undefined,
      { signal },
    ),
  markAllRead: (signal?: AbortSignal) =>
    apiClient.patch<NotificationActionResponseDto>(
      "/notifications/read-all",
      undefined,
      { signal },
    ),
};
