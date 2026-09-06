import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, companyProfileService, type CompanyProfileDataDto } from '@/api';
import {
  PublicCompanyContext,
  type PublicCompanyContextValue,
  type PublicCompanyStatus,
} from './PublicCompanyContext';

interface PublicCompanyProviderProps {
  children: ReactNode;
}

export function PublicCompanyProvider({ children }: PublicCompanyProviderProps) {
  const [company, setCompany] = useState<CompanyProfileDataDto | null>(null);
  const [status, setStatus] = useState<PublicCompanyStatus>('loading');
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setStatus('loading');
    setErrorMessages([]);

    companyProfileService.get(controller.signal)
      .then((response) => {
        if (!response.company) {
          setCompany(null);
          setStatus('missing');
          return;
        }

        setCompany(response.company);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setCompany(null);
        if (error instanceof ApiError) {
          if (error.status === 404) {
            setStatus('missing');
            return;
          }
          setErrorMessages(error.messages);
        } else {
          setErrorMessages(['تعذر تحميل بيانات الشركة حاليًا. يرجى المحاولة مرة أخرى.']);
        }
        setStatus('error');
      });

    return () => controller.abort();
  }, [requestVersion]);

  const reload = useCallback(() => setRequestVersion((version) => version + 1), []);
  const value = useMemo<PublicCompanyContextValue>(
    () => ({ company, status, errorMessages, reload }),
    [company, status, errorMessages, reload],
  );

  return <PublicCompanyContext.Provider value={value}>{children}</PublicCompanyContext.Provider>;
}
