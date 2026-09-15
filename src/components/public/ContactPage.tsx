import { AlertCircle, Building2, Clock, Mail, MapPin, Phone, RefreshCw } from 'lucide-react';
import { getPublicCompanyDetails, usePublicCompany } from '@/public';
import { heroImage } from '@/data/publicContent';

const iconBox = 'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C2A66D]/10 text-[#C2A66D]';

export default function ContactPage() {
  const { company, status, errorMessages, reload } = usePublicCompany();
  const { companyName, phones, email, location, workingHours } = getPublicCompanyDetails(company);
  const hasContactDetails = Boolean(phones.length || email || location || workingHours);
  const hasDirectContact = Boolean(phones.length || email);

  return (
    <div className="min-h-screen bg-stone-50/70">
      <section className="relative overflow-hidden bg-[#162E21] text-white">
        <img src={heroImage} alt="" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-[#162E21]/60 lg:bg-gradient-to-l lg:from-[#162E21] lg:from-[28%] lg:via-[#162E21]/82 lg:via-[58%] lg:to-[#162E21]/5" />
        <div className="relative mx-auto flex min-h-72 max-w-7xl items-center px-4 py-12 sm:min-h-80 sm:px-6 lg:min-h-[360px] lg:px-8 lg:py-16">
          <div className="relative z-10 max-w-xl py-2">
            <span className="mb-4 inline-flex rounded-full border border-[#C2A66D]/35 bg-[#C2A66D]/15 px-3 py-1 text-xs font-bold text-[#E8DCC2]">تواصل مباشر وواضح</span>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">اتصل بنا</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">اختر وسيلة التواصل المناسبة، وسيكون فريق الشركة جاهزًا لمساعدتك.</p>
          </div>
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
            <Building2 className="mx-auto h-10 w-10 text-[#C2A66D]" />
            <h2 className="mt-4 text-lg font-black text-stone-900">بيانات الشركة غير متاحة حاليًا</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">لم تُضف معلومات التواصل إلى ملف الشركة بعد.</p>
          </div>
        )}

        {status === 'ready' && company && (
          <div className={`grid gap-8 ${hasDirectContact ? 'lg:grid-cols-[1.25fr_0.75fr]' : ''} lg:items-start`}>
            <section>
              <div className="mb-6">
                {companyName && <p className="text-xs font-extrabold text-[#C2A66D]">{companyName}</p>}
                <h2 className="mt-2 text-2xl font-black text-[#162E21]">معلومات التواصل</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {phones.map((phone) => (
                  <a key={phone} href={`tel:${phone.replace(/\s/g, '')}`} className="group flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#C2A66D]/50 hover:shadow-md">
                    <span className={iconBox}><Phone className="h-5 w-5" /></span>
                    <span><span className="block text-xs font-bold text-stone-400">رقم الهاتف</span><span className="mt-1 block font-extrabold text-stone-800 group-hover:text-[#162E21]" dir="ltr">{phone}</span></span>
                  </a>
                ))}
                {email && (
                  <a href={`mailto:${email}`} className="group flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#C2A66D]/50 hover:shadow-md">
                    <span className={iconBox}><Mail className="h-5 w-5" /></span>
                    <span className="min-w-0"><span className="block text-xs font-bold text-stone-400">البريد الإلكتروني</span><span className="mt-1 block truncate font-extrabold text-stone-800 group-hover:text-[#162E21]" dir="ltr">{email}</span></span>
                  </a>
                )}
                {location && <InfoCard icon={<MapPin className="h-5 w-5" />} label="العنوان" value={location} />}
                {workingHours && <InfoCard icon={<Clock className="h-5 w-5" />} label="ساعات العمل" value={workingHours} />}
              </div>

              {!hasContactDetails && (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm font-semibold text-stone-500">لا تتوفر معلومات تواصل في ملف الشركة حاليًا.</div>
              )}
            </section>

            {hasDirectContact && <aside className="rounded-2xl bg-[#162E21] p-6 text-white shadow-lg shadow-[#162E21]/10 sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#C2A66D]/25 text-[#E8DCC2]"><Phone className="h-5 w-5" /></div>
              <h2 className="mt-5 text-xl font-black">تواصل معنا مباشرة</h2>
              <p className="mt-3 text-sm leading-7 text-stone-300">لا يتوفر إرسال رسائل من الموقع حاليًا. استخدم الهاتف أو البريد الإلكتروني للتواصل مع الشركة مباشرة.</p>
              <div className="mt-6 space-y-3">
                {phones[0] && <a href={`tel:${phones[0].replace(/\s/g, '')}`} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C2A66D] px-4 py-3 text-sm font-extrabold text-[#162E21] transition hover:bg-[#D0B982]"><Phone className="h-4 w-4" /> اتصال هاتفي</a>}
                {email && <a href={`mailto:${email}`} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-white/10"><Mail className="h-4 w-4" /> إرسال بريد إلكتروني</a>}
              </div>
            </aside>}
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
