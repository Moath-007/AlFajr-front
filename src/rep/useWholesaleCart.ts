import { useContext } from 'react';
import { WholesaleCartContext } from './WholesaleCartContext';

export function useWholesaleCart() {
  const value = useContext(WholesaleCartContext);
  if (!value) throw new Error('useWholesaleCart must be used within WholesaleCartProvider');
  return value;
}
