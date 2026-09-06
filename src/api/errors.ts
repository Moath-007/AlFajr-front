import type { ErrorResponseDto } from './types/common';

const FALLBACK_ERROR_MESSAGE = 'حدث خطأ غير متوقع';

export class ApiError extends Error {
  readonly status: number;
  readonly error: string;
  readonly messages: string[];
  readonly response: ErrorResponseDto;

  constructor(response: ErrorResponseDto) {
    const messages = Array.isArray(response.message) ? response.message : [response.message];
    super(messages.filter(Boolean).join('\n') || FALLBACK_ERROR_MESSAGE);
    this.name = 'ApiError';
    this.status = response.statusCode;
    this.error = response.error;
    this.messages = messages;
    this.response = response;
  }
}

export function normalizeApiError(status: number, payload: unknown): ErrorResponseDto {
  if (isErrorResponse(payload)) return payload;

  return {
    statusCode: status,
    error: 'API Error',
    message: FALLBACK_ERROR_MESSAGE,
  };
}

function isErrorResponse(value: unknown): value is ErrorResponseDto {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ErrorResponseDto>;
  const hasValidMessage = typeof candidate.message === 'string'
    || (Array.isArray(candidate.message) && candidate.message.every((item) => typeof item === 'string'));

  return typeof candidate.statusCode === 'number'
    && typeof candidate.error === 'string'
    && hasValidMessage;
}
