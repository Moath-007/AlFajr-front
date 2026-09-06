export type NumericId = number;
export type DecimalString = string;
export type IsoDateTimeString = string;

export interface ErrorResponseDto {
  statusCode: number;
  error: string;
  message: string | string[];
}

export interface MessageResponse {
  message: string;
}
