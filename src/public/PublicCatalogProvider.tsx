import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, categoriesService, colorsService, type CategoryResponseDto, type ColorResponseDto } from '@/api';
import { PublicCatalogContext, type PublicCatalogContextValue, type PublicResourceStatus } from './PublicCatalogContext';

export function PublicCatalogProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<CategoryResponseDto[]>([]);
  const [colors, setColors] = useState<ColorResponseDto[]>([]);
  const [categoriesStatus, setCategoriesStatus] = useState<PublicResourceStatus>('idle');
  const [colorsStatus, setColorsStatus] = useState<PublicResourceStatus>('idle');
  const [categoriesErrors, setCategoriesErrors] = useState<string[]>([]);
  const [colorsErrors, setColorsErrors] = useState<string[]>([]);
  const [categoriesVersion, setCategoriesVersion] = useState(0);
  const [colorsVersion, setColorsVersion] = useState(0);

  useEffect(() => {
    if (categoriesVersion === 0) return;
    const controller = new AbortController();
    setCategoriesStatus('loading');
    setCategoriesErrors([]);
    categoriesService.list(controller.signal)
      .then((response) => {
        setCategories(response.filter((category) => category.is_active));
        setCategoriesStatus('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setCategories([]);
        setCategoriesErrors(error instanceof ApiError ? error.messages : ['تعذر تحميل التصنيفات حاليًا.']);
        setCategoriesStatus('error');
      });
    return () => controller.abort();
  }, [categoriesVersion]);

  useEffect(() => {
    if (colorsVersion === 0) return;
    const controller = new AbortController();
    setColorsStatus('loading');
    setColorsErrors([]);
    colorsService.list(controller.signal)
      .then((response) => {
        setColors(response);
        setColorsStatus('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setColors([]);
        setColorsErrors(error instanceof ApiError ? error.messages : ['تعذر تحميل الألوان حاليًا.']);
        setColorsStatus('error');
      });
    return () => controller.abort();
  }, [colorsVersion]);

  const reloadCategories = useCallback(() => setCategoriesVersion((version) => version + 1), []);
  const reloadColors = useCallback(() => setColorsVersion((version) => version + 1), []);
  const ensureCategories = useCallback(() => setCategoriesVersion((version) => version || 1), []);
  const ensureColors = useCallback(() => setColorsVersion((version) => version || 1), []);
  const value = useMemo<PublicCatalogContextValue>(() => ({
    categories,
    colors,
    categoriesStatus,
    colorsStatus,
    categoriesErrors,
    colorsErrors,
    reloadCategories,
    reloadColors,
    ensureCategories,
    ensureColors,
  }), [categories, colors, categoriesStatus, colorsStatus, categoriesErrors, colorsErrors, reloadCategories, reloadColors, ensureCategories, ensureColors]);

  return <PublicCatalogContext.Provider value={value}>{children}</PublicCatalogContext.Provider>;
}
