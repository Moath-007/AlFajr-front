import { createContext } from 'react';
import type { CategoryResponseDto, ColorResponseDto } from '@/api';

export type PublicResourceStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PublicCatalogContextValue {
  categories: CategoryResponseDto[];
  colors: ColorResponseDto[];
  categoriesStatus: PublicResourceStatus;
  colorsStatus: PublicResourceStatus;
  categoriesErrors: string[];
  colorsErrors: string[];
  reloadCategories: () => void;
  reloadColors: () => void;
  ensureCategories: () => void;
  ensureColors: () => void;
}

export const PublicCatalogContext = createContext<PublicCatalogContextValue | null>(null);
