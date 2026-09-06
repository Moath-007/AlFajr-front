import { apiClient } from '../client';
import type {
  AddOrderPaymentDto,
  AddPaymentResponseDto,
  CreateRetailOrderDto,
  CreateStoreSaleOrderDto,
  CreateWholesaleOrderDto,
  OrderActionResponseDto,
  OrderDetailsResponseDto,
  OrdersListResponseDto,
  UpdateOrderStatusDto,
} from '../types';

export const ordersService = {
  createRetail: (data: CreateRetailOrderDto, signal?: AbortSignal) =>
    apiClient.post<OrderActionResponseDto>('/orders/retail', data, { signal }),
  createWholesale: (data: CreateWholesaleOrderDto, signal?: AbortSignal) =>
    apiClient.post<OrderActionResponseDto>('/orders/wholesale', data, { signal }),
  createStoreSale: (data: CreateStoreSaleOrderDto, signal?: AbortSignal) =>
    apiClient.post<OrderActionResponseDto>('/orders/store-sale', data, { signal }),
  list: (signal?: AbortSignal) =>
    apiClient.get<OrdersListResponseDto>('/orders', { signal }),
  listMine: (signal?: AbortSignal) =>
    apiClient.get<OrdersListResponseDto>('/orders/my', { signal }),
  getById: (id: number, signal?: AbortSignal) =>
    apiClient.get<OrderDetailsResponseDto>(`/orders/${id}`, { signal }),
  updateStatus: (id: number, data: UpdateOrderStatusDto, signal?: AbortSignal) =>
    apiClient.patch<OrderActionResponseDto>(`/orders/${id}/status`, data, { signal }),
  addPayment: (id: number, data: AddOrderPaymentDto, signal?: AbortSignal) =>
    apiClient.post<AddPaymentResponseDto>(`/orders/${id}/payments`, data, { signal }),
};
