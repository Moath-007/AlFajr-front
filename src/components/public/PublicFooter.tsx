import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { usePublicCompany } from '@/public';

interface PublicFooterProps { onNavigate: (page: string) => void; }

export default function PublicFooter({ onNavigate }: PublicFooterProps) {
  const { company, status } = usePublicCompany();
  const location = [company?.address, company?.city].filter(Boolean).join('، ');
  const hasContactDetails = Boolean(company?.phones.length || company?.email || location || company?.working_hours);

  return (
    <footer className="mt-16 bg-[#162E21] text-stone-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.1fr_0.8fr_1.3fr]">
          <div><button onClick={() => onNavigate('home')} className="group flex items-center gap-3 text-right"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#9C7537] text-xl font-black text-white transition-transform group-hover:-translate-y-0.5">ف</span><span className="text-lg font-black text-white">{company?.company_name || 'شركة الفجر'}</span></button></div>
          <div>
            <h2 className="mb-4 text-sm font-extrabold text-white">روابط سريعة</h2>
            <ul className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm sm:grid-cols-1">
              {([['home', 'الرئيسية'], ['products', 'المنتجات'], ['categories', 'التصنيفات'], ['about', 'من نحن'], ['contact', 'اتصل بنا']] as const).map(([page, label]) => <li key={page}><button onClick={() => onNavigate(page)} className="transition hover:text-[#D8B16D]">{label}</button></li>)}
            </ul>
          </div>
          <div>
            <h2 className="mb-4 text-sm font-extrabold text-white">معلومات التواصل</h2>
            {status === 'loading' && <div className="space-y-3" aria-label="جاري تحميل معلومات التواصل"><div className="h-4 w-48 animate-pulse rounded bg-white/10" /><div className="h-4 w-56 animate-pulse rounded bg-white/10" /><div className="h-4 w-40 animate-pulse rounded bg-white/10" /></div>}
            {status === 'ready' && hasContactDetails && (
              <ul className="space-y-3 text-sm leading-6">
                {company?.phones.map((phone) => <li key={phone} className="flex items-center gap-2.5"><Phone className="h-4 w-4 shrink-0 text-[#D8B16D]" /><a href={`tel:${phone.replace(/\s/g, '')}`} dir="ltr" className="transition hover:text-white">{phone}</a></li>)}
                {company?.email && <li className="flex items-center gap-2.5"><Mail className="h-4 w-4 shrink-0 text-[#D8B16D]" /><a href={`mailto:${company.email}`} className="break-all transition hover:text-white">{company.email}</a></li>}
                {location && <li className="flex items-start gap-2.5"><MapPin className="mt-1 h-4 w-4 shrink-0 text-[#D8B16D]" /><span>{location}</span></li>}
                {company?.working_hours && <li className="flex items-start gap-2.5"><Clock className="mt-1 h-4 w-4 shrink-0 text-[#D8B16D]" /><span>{company.working_hours}</span></li>}
              </ul>
            )}
            {status === 'ready' && !hasContactDetails && <p className="text-sm text-stone-400">لا تتوفر معلومات تواصل حاليًا.</p>}
            {(status === 'error' || status === 'missing') && <p className="text-sm text-stone-400">تعذر عرض معلومات التواصل حاليًا.</p>}
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-stone-400">© {new Date().getFullYear()} {company?.company_name || 'شركة الفجر'}. جميع الحقوق محفوظة.</div>
      </div>
    </footer>
  );
}
