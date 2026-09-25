import { API_BASE_URL } from './config';
import { ApiError, normalizeApiError } from './errors';
import { getAccessToken, notifyUnauthorized } from './session';

export type ApiMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ApiRequestOptions {
  method?: ApiMethod;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  timeoutMs?: number;
  suppressUnauthorizedNotification?: boolean | ((payload: unknown) => boolean);
}

async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;
  const requestBody: BodyInit | undefined = options.body === undefined
    ? undefined
    : options.body instanceof FormData
      ? options.body
      : JSON.stringify(options.body);

  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body !== undefined && !isFormData) headers.set('Content-Type', 'application/json');

  const timeoutController = new AbortController();
  const timeoutMs = options.timeoutMs ?? ((options.method ?? 'GET') === 'GET' ? 15_000 : 30_000);
  let didTimeout = false;
  const abortFromCaller = () => timeoutController.abort(options.signal?.reason);
  const timeoutId = window.setTimeout(() => {
    didTimeout = true;
    timeoutController.abort();
  }, timeoutMs);

  if (options.signal?.aborted) abortFromCaller();
  else options.signal?.addEventListener('abort', abortFromCaller, { once: true });

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${normalizePath(path)}`, {
      method: options.method ?? 'GET',
      headers,
      body: requestBody,
      signal: timeoutController.signal,
    });
  } catch (error) {
    if (didTimeout) {
      throw new ApiError({
        statusCode: 408,
        error: 'Request Timeout',
        message: 'الخادم لم يستجب خلال الوقت المحدد. تأكد من تشغيل الخادم ثم أعد المحاولة.',
      });
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    const suppressUnauthorized = typeof options.suppressUnauthorizedNotification === 'function'
      ? options.suppressUnauthorizedNotification(payload)
      : options.suppressUnauthorizedNotification;
    if (response.status === 401 && !suppressUnauthorized) notifyUnauthorized();
    throw new ApiError(normalizeApiError(response.status, payload));
  }

  return payload as T;
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;

  const text = await response.text();
  if (!text) return undefined;

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return text;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
