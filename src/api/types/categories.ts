import type { NumericId } from './common';

export interface CategoryResponseDto {
  category_id: NumericId;
  name: string;
  is_active: boolean;
  products_count: number;
}

export interface CreateCategoryDto {
  name: string;
}

export type UpdateCategoryDto = CreateCategoryDto;

export interface UpdateCategoryStatusDto {
  is_active: boolean;
}
