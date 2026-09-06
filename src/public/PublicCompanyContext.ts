import { createContext } from 'react';
import type { CompanyProfileDataDto } from '@/api';

export type PublicCompanyStatus = 'loading' | 'ready' | 'error' | 'missing';

export interface PublicCompanyContextValue {
  company: CompanyProfileDataDto | null;
  status: PublicCompanyStatus;
  errorMessages: string[];
  reload: () => void;
}

export const PublicCompanyContext = createContext<PublicCompanyContextValue | null>(null);
