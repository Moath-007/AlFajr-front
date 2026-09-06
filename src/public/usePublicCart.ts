import { useContext } from 'react';
import { PublicCartContext } from './PublicCartContext';

export function usePublicCart() {
  const context = useContext(PublicCartContext);
  if (!context) throw new Error('usePublicCart must be used inside PublicCartProvider');
  return context;
}
