import { useCallback, useRef, useState } from 'react';
import { ApiError, customersService, type CustomerBalanceDataDto } from '@/api';
import { apiMessages } from './repOrderUtils';

export type CustomerLookupState = 'idle' | 'loading' | 'found' | 'new' | 'error';

export function useCustomerLookup(phone: string, onFound: (customer: CustomerBalanceDataDto) => void) {
  const [result, setResult] = useState<{ state: CustomerLookupState; messages: string[]; customer: CustomerBalanceDataDto | null; phone: string }>({ state: 'idle', messages: [], customer: null, phone: '' });
  const activeRequest = useRef<AbortController | null>(null);
  const normalizedPhone = phone.trim();
  const lookup = useCallback(async (phoneOverride?: string) => {
    const lookupPhone = (phoneOverride ?? normalizedPhone).trim();
    if (lookupPhone.length < 7) { setResult({ state: 'error', messages: ['أدخل رقم هاتف صحيحًا أولًا.'], customer: null, phone: lookupPhone }); return; }
    activeRequest.current?.abort(); const controller = new AbortController(); activeRequest.current = controller;
    setResult({ state: 'loading', messages: [], customer: null, phone: lookupPhone });
    try { const response = await customersService.findByPhone(lookupPhone, controller.signal); if (!controller.signal.aborted) { onFound(response.customer); setResult({ state: 'found', messages: [], customer: response.customer, phone: lookupPhone }); } }
    catch (error) { if (controller.signal.aborted) return; if (error instanceof ApiError && error.status === 404) setResult({ state: 'new', messages: [], customer: null, phone: lookupPhone }); else setResult({ state: 'error', messages: apiMessages(error, 'تعذر البحث عن بيانات الزبون.'), customer: null, phone: lookupPhone }); }
  }, [normalizedPhone, onFound]);
  const matchesCurrentPhone = result.phone === normalizedPhone;
  return { state: matchesCurrentPhone ? result.state : 'idle', messages: matchesCurrentPhone ? result.messages : [], customer: matchesCurrentPhone ? result.customer : null, lookup };
}
