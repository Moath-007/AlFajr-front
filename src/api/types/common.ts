export type NumericId = number;
export type DecimalString = string;
export type IsoDateTimeString = string;
export interface PaginationResponseDto {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ErrorResponseDto {
  statusCode: number;
  error: string;
  message: string | string[];
}

export interface MessageResponse {
  message: string;
}
