import { apiClient } from '../client';
import type { AdminDashboardQuery, AdminDashboardResponseDto } from '../types';

export const dashboardService = {
  get: (query: AdminDashboardQuery = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (query.date_from) params.set('date_from', query.date_from);
    if (query.date_to) params.set('date_to', query.date_to);
    if (query.low_stock_threshold !== undefined) params.set('low_stock_threshold', String(query.low_stock_threshold));
    const search = params.toString();
    return apiClient.get<AdminDashboardResponseDto>(`/admin/dashboard${search ? `?${search}` : ''}`, { signal });
  },
};
