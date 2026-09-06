import { AlertCircle, Building2, Clock, Mail, MapPin, Phone, RefreshCw } from 'lucide-react';
import { usePublicCompany } from '@/public';

const iconBox = 'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#9C7537]/10 text-[#9C7537]';

export default function ContactPage() {
  const { company, status, errorMessages, reload } = usePublicCompany();
  const location = [company?.address, company?.city].filter(Boolean).join('، ');

  return (
    <div className="min-h-screen bg-stone-50/70">
      <section className="relative overflow-hidden bg-[#162E21] text-white">
        <div className="absolute inset-y-0 left-0 w-1/3 bg-[radial-gradient(circle_at_center,rgba(156,117,55,0.18),transparent_68%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
          <span className="mb-4 inline-flex rounded-full border border-[#D8B16D]/25 bg-[#9C7537]/15 px-3 py-1 text-xs font-bold text-[#E5C68F]">تواصل مباشر وواضح</span>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">اتصل بنا</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">اختر وسيلة التواصل المناسبة، وسيكون فريق الشركة جاهزًا لمساعدتك.</p>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {status === 'loading' && <ContactLoading />}

        {status === 'error' && (
          <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm" role="alert">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
            <h2 className="mt-4 text-lg font-black text-stone-900">تعذر تحميل بيانات التواصل</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">{errorMessages.join('، ')}</p>
            <button onClick={reload} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#162E21] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#21452f]"><RefreshCw className="h-4 w-4" /> إعادة المحاولة</button>
          </div>
        )}

        {status === 'missing' && (
          <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm" role="status">
            <Building2 className="mx-auto h-10 w-10 text-[#9C7537]" />
            <h2 className="mt-4 text-lg font-black text-stone-900">بيانات الشركة غير متاحة حاليًا</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">لم تُضف معلومات التواصل إلى ملف الشركة بعد.</p>
          </div>
        )}

        {status === 'ready' && company && (
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
            <section>
              <div className="mb-6">
                <p className="text-xs font-extrabold text-[#9C7537]">{company.company_name}</p>
                <h2 className="mt-2 text-2xl font-black text-[#162E21]">معلومات التواصل</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {company.phones.map((phone) => (
                  <a key={phone} href={`tel:${phone.replace(/\s/g, '')}`} className="group flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#9C7537]/50 hover:shadow-md">
                    <span className={iconBox}><Phone className="h-5 w-5" /></span>
                    <span><span className="block text-xs font-bold text-stone-400">رقم الهاتف</span><span className="mt-1 block font-extrabold text-stone-800 group-hover:text-[#162E21]" dir="ltr">{phone}</span></span>
                  </a>
                ))}
                {company.email && (
                  <a href={`mailto:${company.email}`} className="group flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#9C7537]/50 hover:shadow-md">
                    <span className={iconBox}><Mail className="h-5 w-5" /></span>
                    <span className="min-w-0"><span className="block text-xs font-bold text-stone-400">البريد الإلكتروني</span><span className="mt-1 block truncate font-extrabold text-stone-800 group-hover:text-[#162E21]" dir="ltr">{company.email}</span></span>
                  </a>
                )}
                {location && <InfoCard icon={<MapPin className="h-5 w-5" />} label="العنوان" value={location} />}
                {company.working_hours && <InfoCard icon={<Clock className="h-5 w-5" />} label="ساعات العمل" value={company.working_hours} />}
              </div>

              {!company.phones.length && !company.email && !location && !company.working_hours && (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm font-semibold text-stone-500">لا تتوفر معلومات تواصل في ملف الشركة حاليًا.</div>
              )}
            </section>

            <aside className="rounded-2xl bg-[#162E21] p-6 text-white shadow-lg shadow-[#162E21]/10 sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#9C7537]/25 text-[#D8B16D]"><Phone className="h-5 w-5" /></div>
              <h2 className="mt-5 text-xl font-black">تواصل معنا مباشرة</h2>
              <p className="mt-3 text-sm leading-7 text-stone-300">لا يتوفر إرسال رسائل من الموقع حاليًا. استخدم الهاتف أو البريد الإلكتروني للتواصل مع الشركة مباشرة.</p>
              <div className="mt-6 space-y-3">
                {company.phones[0] && <a href={`tel:${company.phones[0].replace(/\s/g, '')}`} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#9C7537] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#ad8444]"><Phone className="h-4 w-4" /> اتصال هاتفي</a>}
                {company.email && <a href={`mailto:${company.email}`} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-white/10"><Mail className="h-4 w-4" /> إرسال بريد إلكتروني</a>}
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-start gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><span className={iconBox}>{icon}</span><span><span className="block text-xs font-bold text-stone-400">{label}</span><span className="mt-1 block font-extrabold leading-6 text-stone-800">{value}</span></span></div>;
}

function ContactLoading() {
  return <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]" aria-label="جاري تحميل بيانات التواصل"><div className="grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl border border-stone-200 bg-white"><div className="m-5 h-12 w-12 rounded-xl bg-stone-100" /></div>)}</div><div className="h-64 animate-pulse rounded-2xl bg-[#162E21]/90" /></div>;
}
