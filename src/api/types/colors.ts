import type { NumericId } from './common';

export interface ColorResponseDto {
  color_id: NumericId;
  name: string;
}

export interface CreateColorDto {
  name: string;
}
