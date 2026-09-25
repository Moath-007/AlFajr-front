import type { NumericId } from './common';

export interface CategoryResponseDto {
  category_id: NumericId;
  name: string;
  image_url?: string | null;
  is_active: boolean;
  products_count: number;
}

export interface CreateCategoryDto {
  name: string;
  image?: File;
}

export interface UpdateCategoryDto extends CreateCategoryDto { remove_image?: boolean; }

export interface UpdateCategoryStatusDto {
  is_active: boolean;
}
