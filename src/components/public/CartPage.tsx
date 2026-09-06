import { ArrowLeft, Minus, PackageOpen, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { usePublicCart } from '@/public';

export default function CartPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { items, displaySubtotal, setQuantity, removeItem, clearCart } = usePublicCart();

  if (items.length === 0) {
    return <main className="mx-auto grid min-h-[58vh] max-w-xl place-items-center px-4 py-16 text-center"><div><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#162E21]/[0.07]"><ShoppingBag className="h-8 w-8 text-[#162E21]" /></span><h1 className="mt-5 text-2xl font-black text-[#162E21]">سلتك فارغة</h1><p className="mt-3 leading-7 text-stone-500">اختر المنتجات المناسبة، وستظهر هنا قبل إرسال الطلب.</p><button onClick={() => onNavigate('products')} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#162E21] px-5 py-3 text-sm font-black text-white transition hover:bg-[#21452f]">تصفح المنتجات <ArrowLeft className="h-4 w-4" /></button></div></main>;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-extrabold text-[#9C7537]">مراجعة المنتجات</p><h1 className="mt-1 text-2xl font-black text-[#162E21] sm:text-[1.75rem]">سلة المشتريات</h1></div><button onClick={clearCart} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50"><Trash2 className="h-4 w-4" /> تفريغ السلة</button></div>
      <div className="grid gap-5 lg:grid-cols-[1fr_310px] lg:items-start">
        <section className="space-y-3" aria-label="منتجات السلة">
          {items.map((item) => <article key={item.product_variant_id} className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:grid-cols-[88px_1fr_auto] sm:items-center">
            <div className="aspect-square overflow-hidden rounded-xl bg-stone-100">{item.image_url ? <img src={item.image_url} alt={item.product_name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><PackageOpen className="h-8 w-8 text-stone-300" /></div>}</div>
            <div><h2 className="text-base font-black text-[#162E21]">{item.product_name}</h2><p className="mt-0.5 text-xs font-bold text-stone-400">الكود: {item.product_code}</p><p className="mt-1.5 text-sm font-semibold text-stone-600">{item.size} — {item.color}</p><div className="mt-2 flex flex-wrap items-baseline gap-2">{item.display_discount > 0 && <><span className="text-xs font-bold text-stone-400 line-through">{formatPrice(item.display_price)}</span><span className="rounded-md bg-[#9C7537]/10 px-1.5 py-0.5 text-[11px] font-black text-[#9C7537]">خصم {formatPrice(item.display_discount)}</span></>}<span className="font-black text-[#9C7537]">{formatPrice(item.display_effective_price)}</span></div></div>
            <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
              <div className="flex h-10 items-center rounded-xl border border-stone-200 bg-stone-50"><button onClick={() => setQuantity(item.product_variant_id, item.quantity - 1)} disabled={item.quantity <= 1} aria-label={`تقليل كمية ${item.product_name}`} className="h-full px-2.5 text-stone-600 disabled:opacity-30"><Minus className="h-3.5 w-3.5" /></button><span className="min-w-7 text-center text-sm font-black text-[#162E21]" aria-live="polite">{item.quantity}</span><button onClick={() => setQuantity(item.product_variant_id, item.quantity + 1)} disabled={item.quantity >= item.stock_quantity} aria-label={`زيادة كمية ${item.product_name}`} className="h-full px-2.5 text-stone-600 disabled:opacity-30"><Plus className="h-3.5 w-3.5" /></button></div>
              <p className="font-black text-[#162E21]">{formatPrice(item.display_effective_price * item.quantity)}</p>
              <button onClick={() => removeItem(item.product_variant_id)} className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-800"><Trash2 className="h-3.5 w-3.5" /> إزالة</button>
            </div>
          </article>)}
        </section>
        <aside className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm lg:sticky lg:top-40"><h2 className="text-base font-black text-[#162E21]">ملخص السلة</h2><div className="mt-4 flex items-center justify-between border-y border-stone-100 py-3"><span className="text-sm font-bold text-stone-600">المجموع التقديري</span><span className="text-lg font-black text-[#9C7537]">{formatPrice(displaySubtotal)}</span></div><p className="mt-3 text-xs font-semibold leading-5 text-stone-500">يتم تأكيد السعر والتوفر عند إرسال الطلب.</p><button onClick={() => onNavigate('checkout')} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#162E21] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#21452f]">متابعة الطلب <ArrowLeft className="h-4 w-4" /></button><button onClick={() => onNavigate('products')} className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-stone-600 hover:bg-stone-50">متابعة التسوق</button></aside>
      </div>
    </main>
  );
}

function formatPrice(value: number) { return `${new Intl.NumberFormat('ar', { maximumFractionDigits: 2 }).format(value)} ₪`; }
