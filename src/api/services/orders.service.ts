import { apiClient } from "../client";
import type {
  CreateInvoiceDto,
  CreateOnlineOrderDto,
  OrderActionResponseDto,
  OrderDetailsResponseDto,
  OrderMessageResponseDto,
  OrdersQuery,
  OrdersSummaryListResponseDto,
  UpdateOrderDto,
} from "../types";
const queryPath = (path: string, query: OrdersQuery) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  return params.size ? `${path}?${params}` : path;
};
export const ordersService = {
  createInvoice: (data: CreateInvoiceDto, signal?: AbortSignal) =>
    apiClient.post<OrderActionResponseDto>("/orders", data, { signal }),
  createOnline: (data: CreateOnlineOrderDto, signal?: AbortSignal) =>
    apiClient.post<OrderActionResponseDto>("/orders/online", data, { signal }),
  list: (query: OrdersQuery = {}, signal?: AbortSignal) =>
    apiClient.get<OrdersSummaryListResponseDto>(queryPath("/orders", query), {
      signal,
    }),
  getById: (id: number, signal?: AbortSignal) =>
    apiClient.get<OrderDetailsResponseDto>(`/orders/${id}`, { signal }),
  update: (id: number, data: UpdateOrderDto, signal?: AbortSignal) =>
    apiClient.put<OrderActionResponseDto>(`/orders/${id}`, data, { signal }),
  confirm: (id: number, sale_account_id: number, signal?: AbortSignal) =>
    apiClient.post<OrderActionResponseDto>(
      `/orders/${id}/confirm`,
      { sale_account_id },
      { signal },
    ),
  cancel: (id: number, signal?: AbortSignal) =>
    apiClient.delete<OrderMessageResponseDto>(`/orders/${id}`, { signal }),
  deletePermanent: (id: number, signal?: AbortSignal) =>
    apiClient.delete<OrderMessageResponseDto>(`/orders/${id}/permanent`, {
      signal,
    }),
};
