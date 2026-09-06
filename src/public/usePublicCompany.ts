import { useContext } from 'react';
import { PublicCompanyContext } from './PublicCompanyContext';

export function usePublicCompany() {
  const context = useContext(PublicCompanyContext);
  if (!context) {
    throw new Error('usePublicCompany must be used within PublicCompanyProvider');
  }
  return context;
}
