import type {
  DecimalString,
  IsoDateTimeString,
  NumericId,
  PaginationResponseDto,
} from "./common";

export interface ProductCategoryResponseDto {
  id: NumericId;
  name: string;
}

export interface ProductImageResponseDto {
  id: NumericId;
  url: string;
  is_primary: boolean;
}

export interface ProductColorResponseDto {
  id: NumericId;
  name: string;
}

export interface ProductVariantResponseDto {
  id: NumericId;
  size: string;
  retail_price: DecimalString;
  retail_discount: DecimalString;
  wholesale_price: DecimalString;
  wholesale_discount: DecimalString;
  stock_quantity: number;
  color: ProductColorResponseDto;
}

export interface ProductResponseDto {
  id: NumericId;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at: IsoDateTimeString;
  category: ProductCategoryResponseDto;
  images: ProductImageResponseDto[];
  variants: ProductVariantResponseDto[];
}

export interface ProductsListResponseDto {
  message: string;
  products: ProductResponseDto[];
  pagination: AdminProductsPaginationDto;
}

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
export interface AdminProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: NumericId;
  color_id?: NumericId;
  is_active?: boolean;
  stock_status?: StockStatus;
  sort_by?: "created_at" | "name" | "code";
  sort_order?: "asc" | "desc";
}
export type AdminProductsPaginationDto = PaginationResponseDto;

export interface ProductDetailsResponseDto {
  message: string;
  product: ProductResponseDto;
}

export interface CatalogPrimaryImageResponseDto {
  id: NumericId;
  url: string;
}

export interface CatalogCategoryResponseDto {
  id: NumericId;
  name: string;
}

export interface CatalogImageResponseDto {
  id: NumericId;
  url: string;
  is_primary: boolean;
}

export interface CatalogColorResponseDto {
  id: NumericId;
  name: string;
}

export interface CatalogVariantResponseDto {
  id: NumericId;
  size: string;
  price: DecimalString;
  discount: DecimalString;
  stock_quantity: number;
  color: CatalogColorResponseDto;
}

export interface CatalogProductSummaryDto {
  id: NumericId;
  name: string;
  code: string;
  category: CatalogCategoryResponseDto;
  primary_image?: CatalogPrimaryImageResponseDto | null;
  price: DecimalString;
  has_discount: boolean;
  in_stock: boolean;
  total_stock_quantity?: number;
}

export type CatalogSort = "default" | "price_asc" | "price_desc" | "random";

export interface CatalogProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: NumericId;
  color_id?: NumericId;
  sort?: CatalogSort;
}

export interface CatalogPaginationDto {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface CatalogProductsListResponseDto {
  message: string;
  products: CatalogProductSummaryDto[];
  pagination: CatalogPaginationDto;
}

export interface CatalogProductDetailsDto {
  id: NumericId;
  name: string;
  code: string;
  description?: string | null;
  category: CatalogCategoryResponseDto;
  images: CatalogImageResponseDto[];
  variants: CatalogVariantResponseDto[];
}

export interface CatalogProductDetailsResponseDto {
  message: string;
  product: CatalogProductDetailsDto;
}

export interface ProductVariantWriteDto {
  size: string;
  color_id: NumericId;
  retail_price: number;
  retail_discount: number;
  wholesale_price: number;
  wholesale_discount: number;
}

export interface UpdateProductVariantDto extends ProductVariantWriteDto {
  product_variant_id?: NumericId;
}

export interface CreateProductDto {
  name: string;
  code: string;
  description?: string;
  category_id: NumericId;
  variants: ProductVariantWriteDto[];
  primary_image: File;
  additional_images?: File[];
}

export interface CreatedProductDataDto {
  product_id: NumericId;
  name: string;
  code: string;
  description?: string;
  category_id: NumericId;
  is_active: boolean;
  created_at: IsoDateTimeString;
}

export interface CreateProductResponseDto {
  message: string;
  product: CreatedProductDataDto;
}

export interface UpdateProductDto {
  name: string;
  code: string;
  description?: string;
  category_id: NumericId;
  is_active?: boolean;
  variants: UpdateProductVariantDto[];
}

export interface UpdateProductResponseDto {
  message: string;
  product: ProductResponseDto;
}

export interface UpdateProductStatusDto {
  is_active: boolean;
}

export interface ProductStatusDataDto {
  id: NumericId;
  is_active: boolean;
}

export interface UpdateProductStatusResponseDto {
  message: string;
  product: ProductStatusDataDto;
}

export interface UpdateProductImagesDto {
  existingImageIds?: NumericId[];
  primaryExistingImageId?: NumericId;
  primaryNewImageIndex?: number;
  newImages?: File[];
}

export interface UpdateProductImagesResponseDto {
  message: string;
  images: ProductImageResponseDto[];
}
