import { apiClient } from '../client';
import type {
  AddOrderPaymentDto,
  AddPaymentResponseDto,
  CreateRetailOrderDto,
  CreateStoreSaleOrderDto,
  CreateWholesaleOrderDto,
  OrderActionResponseDto,
  OrderDetailsResponseDto,
  OrdersQuery,
  OrdersSummaryListResponseDto,
  OrderPaymentInfoResponseDto,
  ReceivablesResponseDto,
  RepresentativeOrderStatsResponseDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
} from '../types';

export const ordersService = {
  createRetail: (data: CreateRetailOrderDto, signal?: AbortSignal) =>
    apiClient.post<OrderActionResponseDto>('/orders/retail', data, { signal }),
  createWholesale: (data: CreateWholesaleOrderDto, signal?: AbortSignal) =>
    apiClient.post<OrderActionResponseDto>('/orders/wholesale', data, { signal }),
  createStoreSale: (data: CreateStoreSaleOrderDto, signal?: AbortSignal) =>
    apiClient.post<OrderActionResponseDto>('/orders/store-sale', data, { signal }),
  list: (query: OrdersQuery = {}, signal?: AbortSignal) =>
    apiClient.get<OrdersSummaryListResponseDto>(withOrdersQuery('/orders', query), { signal }),
  listMine: (query: OrdersQuery = {}, signal?: AbortSignal) =>
    apiClient.get<OrdersSummaryListResponseDto>(withOrdersQuery('/orders/my', query), { signal }),
  getMyStats: (signal?: AbortSignal) =>
    apiClient.get<RepresentativeOrderStatsResponseDto>('/orders/my/stats', { signal }),
  listReceivables: (query: OrdersQuery = {}, signal?: AbortSignal) =>
    apiClient.get<ReceivablesResponseDto>(withOrdersQuery('/orders/receivables', query), { signal }),
  getPaymentInfo: (id: number, signal?: AbortSignal) =>
    apiClient.get<OrderPaymentInfoResponseDto>(`/orders/${id}/payment-info`, { signal }),
  getById: (id: number, signal?: AbortSignal) =>
    apiClient.get<OrderDetailsResponseDto>(`/orders/${id}`, { signal }),
  update: (id: number, data: UpdateOrderDto, signal?: AbortSignal) =>
    apiClient.put<OrderActionResponseDto>(`/orders/${id}`, data, { signal }),
  updateStatus: (id: number, data: UpdateOrderStatusDto, signal?: AbortSignal) =>
    apiClient.patch<OrderActionResponseDto>(`/orders/${id}/status`, data, { signal }),
  addPayment: (id: number, data: AddOrderPaymentDto, signal?: AbortSignal) =>
    apiClient.post<AddPaymentResponseDto>(`/orders/${id}/payments`, data, { signal }),
};

function withOrdersQuery(path: string, query: OrdersQuery): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}
