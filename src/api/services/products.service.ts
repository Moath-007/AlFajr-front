import { apiClient } from '../client';
import type {
  CatalogProductDetailsResponseDto,
  CatalogProductsListResponseDto,
  CatalogProductsQuery,
  CreateProductDto,
  CreateProductResponseDto,
  ProductDetailsResponseDto,
  ProductsListResponseDto,
  UpdateProductDto,
  UpdateProductImagesDto,
  UpdateProductImagesResponseDto,
  UpdateProductResponseDto,
  UpdateProductStatusDto,
  UpdateProductStatusResponseDto,
} from '../types';

export const productsService = {
  listAdmin: (signal?: AbortSignal) =>
    apiClient.get<ProductsListResponseDto>('/products', { signal }),
  getAdminById: (id: number, signal?: AbortSignal) =>
    apiClient.get<ProductDetailsResponseDto>(`/products/${id}`, { signal }),
  listRetail: (query: CatalogProductsQuery = {}, signal?: AbortSignal) =>
    apiClient.get<CatalogProductsListResponseDto>(withCatalogQuery('/products/retail', query), { signal }),
  getRetailById: (id: number, signal?: AbortSignal) =>
    apiClient.get<CatalogProductDetailsResponseDto>(`/products/retail/${id}`, { signal }),
  listWholesale: (signal?: AbortSignal) =>
    apiClient.get<CatalogProductsListResponseDto>('/products/wholesale', { signal }),
  getWholesaleById: (id: number, signal?: AbortSignal) =>
    apiClient.get<CatalogProductDetailsResponseDto>(`/products/wholesale/${id}`, { signal }),
  create: (data: CreateProductDto, signal?: AbortSignal) =>
    apiClient.post<CreateProductResponseDto>('/products', toCreateProductFormData(data), { signal }),
  update: (id: number, data: UpdateProductDto, signal?: AbortSignal) =>
    apiClient.put<UpdateProductResponseDto>(`/products/${id}`, data, { signal }),
  updateImages: (productId: number, data: UpdateProductImagesDto, signal?: AbortSignal) =>
    apiClient.put<UpdateProductImagesResponseDto>(
      `/products/${productId}/images`,
      toUpdateProductImagesFormData(data),
      { signal },
    ),
  updateStatus: (id: number, data: UpdateProductStatusDto, signal?: AbortSignal) =>
    apiClient.patch<UpdateProductStatusResponseDto>(`/products/${id}/status`, data, { signal }),
};

function withCatalogQuery(path: string, query: CatalogProductsQuery): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.search) params.set('search', query.search);
  if (query.category_id !== undefined) params.set('category_id', String(query.category_id));
  if (query.color_id !== undefined) params.set('color_id', String(query.color_id));
  if (query.sort !== undefined) params.set('sort', query.sort);
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

function toCreateProductFormData(data: CreateProductDto): FormData {
  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('code', data.code);
  if (data.description !== undefined) formData.append('description', data.description);
  formData.append('category_id', String(data.category_id));
  formData.append('variants', JSON.stringify(data.variants));
  formData.append('primary_image', data.primary_image);
  data.additional_images?.forEach((image) => formData.append('additional_images', image));
  return formData;
}

function toUpdateProductImagesFormData(data: UpdateProductImagesDto): FormData {
  const formData = new FormData();
  if (data.existingImageIds !== undefined) {
    formData.append('existingImageIds', JSON.stringify(data.existingImageIds));
  }
  if (data.primaryExistingImageId !== undefined) {
    formData.append('primaryExistingImageId', String(data.primaryExistingImageId));
  }
  if (data.primaryNewImageIndex !== undefined) {
    formData.append('primaryNewImageIndex', String(data.primaryNewImageIndex));
  }
  data.newImages?.forEach((image) => formData.append('newImages', image));
  return formData;
}
