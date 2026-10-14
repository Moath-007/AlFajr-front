import type { NumericId } from './common';

export interface CategoryResponseDto {
  category_id: NumericId;
  name: string;
  image_url?: string | null;
  is_active: boolean;
  is_visible_online: boolean;
  products_count: number;
}

export interface CreateCategoryDto {
  is_visible_online?: boolean;
  name: string;
  image?: File;
}

export interface UpdateCategoryDto extends CreateCategoryDto { remove_image?: boolean; }

export interface UpdateCategoryStatusDto {
  is_active: boolean;
}
