import { AlertCircle, Building2, RefreshCw } from 'lucide-react';
import { usePublicCompany } from '@/public';

export default function CompanyProfileNotice() {
  const { status, errorMessages, reload } = usePublicCompany();

  if (status === 'loading' || status === 'ready') return null;

  if (status === 'missing') {
    return (
      <div className="border-b border-amber-200 bg-amber-50 text-amber-950" role="status">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2.5 text-center text-xs font-semibold sm:text-sm">
          <Building2 className="h-4 w-4 shrink-0 text-[#9C7537]" />
          بيانات الشركة غير متاحة حاليًا، بينما يمكنك متابعة تصفح الموقع.
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-red-200 bg-red-50 text-red-900" role="alert">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 py-2.5 text-center text-xs font-semibold sm:text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{errorMessages.join('، ')}</span>
        <button
          type="button"
          onClick={reload}
          className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-white px-2.5 py-1 font-bold transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
