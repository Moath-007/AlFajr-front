import type { NumericId } from './common';

export interface CategoryResponseDto {
  sort_order: number;
  category_id: NumericId;
  name: string;
  image_url?: string | null;
  is_active: boolean;
  is_visible_online: boolean;
  products_count: number;
}

export interface CreateCategoryDto {
  sort_order?: number;
  is_visible_online?: boolean;
  name: string;
  image?: File;
}

export interface UpdateCategoryDto extends CreateCategoryDto { expected_sort_order?: number; remove_image?: boolean; }

export interface UpdateCategoryStatusDto {
  is_active: boolean;
}
