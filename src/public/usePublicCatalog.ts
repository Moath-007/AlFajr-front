import { useContext } from 'react';
import { PublicCatalogContext } from './PublicCatalogContext';

export function usePublicCatalog() {
  const context = useContext(PublicCatalogContext);
  if (!context) throw new Error('usePublicCatalog must be used within PublicCatalogProvider');
  return context;
}
