import { ArrowLeft, Home, MapPinOff } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PublicNotFoundPage() {
  return (
    <main className="mx-auto grid min-h-[62vh] max-w-2xl place-items-center px-4 py-16 text-center sm:px-6">
      <div className="w-full rounded-3xl border border-stone-200 bg-white px-6 py-10 shadow-sm sm:px-10 sm:py-12">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#162E21]/[0.07] text-[#162E21]">
          <MapPinOff className="h-8 w-8" aria-hidden="true" />
        </span>
        <p className="mt-6 text-sm font-extrabold text-[#C2A66D]">خطأ 404</p>
        <h1 className="mt-2 text-3xl font-black text-[#162E21] sm:text-4xl">الصفحة غير موجودة</h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-stone-600">قد يكون الرابط غير صحيح أو أن الصفحة لم تعد متاحة. يمكنك العودة للرئيسية أو متابعة تصفح المنتجات.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#162E21] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#21452f] focus:outline-none focus:ring-4 focus:ring-[#162E21]/15"><Home className="h-4 w-4" /> العودة للرئيسية</Link>
          <Link to="/products" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-bold text-stone-700 transition hover:border-[#C2A66D]/60 hover:text-[#162E21] focus:outline-none focus:ring-4 focus:ring-[#C2A66D]/10">تصفح المنتجات <ArrowLeft className="h-4 w-4" /></Link>
        </div>
      </div>
    </main>
  );
}
