import { useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, PackageCheck, ShoppingBag } from 'lucide-react';
import { ApiError, ordersService, type OrderActionResponseDto } from '@/api';
import { usePublicCart } from '@/public';

interface CheckoutFields { customer_name: string; phone: string; email: string; delivery_address: string; notes: string; }
type FieldErrors = Partial<Record<keyof CheckoutFields, string>>;
const EMPTY_FIELDS: CheckoutFields = { customer_name: '', phone: '', email: '', delivery_address: '', notes: '' };

export default function CheckoutPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { items, displaySubtotal, clearCart } = usePublicCart();
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiErrors, setApiErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<OrderActionResponseDto | null>(null);
  const submissionLock = useRef(false);

  if (result) return <SuccessState result={result} onNavigate={onNavigate} />;
  if (items.length === 0) return <main className="mx-auto grid min-h-[58vh] max-w-xl place-items-center px-4 py-16 text-center"><div><ShoppingBag className="mx-auto h-12 w-12 text-stone-300" /><h1 className="mt-5 text-2xl font-black text-[#162E21]">لا توجد منتجات لإرسال الطلب</h1><p className="mt-3 leading-7 text-stone-500">أضف منتجًا إلى السلة أولًا ثم تابع بيانات الطلب.</p><button onClick={() => onNavigate('products')} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#162E21] px-5 py-3 text-sm font-black text-white">تصفح المنتجات <ArrowLeft className="h-4 w-4" /></button></div></main>;

  const updateField = (name: keyof CheckoutFields, value: string) => {
    setFields((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submissionLock.current) return;
    const errors = validate(fields);
    setFieldErrors(errors);
    setApiErrors([]);
    if (Object.keys(errors).length > 0) return;
    submissionLock.current = true;
    setSubmitting(true);
    try {
      const response = await ordersService.createRetail({
        customer_name: fields.customer_name.trim(),
        phone: fields.phone.trim(),
        delivery_address: fields.delivery_address.trim(),
        items: items.map((item) => ({ product_variant_id: item.product_variant_id, quantity: item.quantity })),
        ...(fields.email.trim() ? { email: fields.email.trim() } : {}),
        ...(fields.notes.trim() ? { notes: fields.notes.trim() } : {}),
      });
      setResult(response);
      clearCart();
    } catch (error) {
      setApiErrors(error instanceof ApiError ? error.messages : ['تعذر إرسال الطلب حاليًا. يرجى المحاولة مرة أخرى.']);
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8"><div className="mb-6"><p className="text-xs font-extrabold text-[#C2A66D]">إتمام الطلب</p><h1 className="mt-1 text-2xl font-black text-[#162E21] sm:text-[1.75rem]">بيانات العميل والتوصيل</h1></div><div className="grid gap-5 lg:grid-cols-[1fr_330px] lg:items-start">
      <form onSubmit={submit} noValidate className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        {apiErrors.length > 0 && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800"><ul className="space-y-1">{apiErrors.map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}</ul></div>}
        <div className="grid gap-4 sm:grid-cols-2"><Field id="customer_name" label="الاسم" value={fields.customer_name} error={fieldErrors.customer_name} required onChange={(value) => updateField('customer_name', value)} /><Field id="phone" label="رقم الهاتف" value={fields.phone} error={fieldErrors.phone} required inputMode="tel" onChange={(value) => updateField('phone', value)} /><Field id="email" label="البريد الإلكتروني (اختياري)" value={fields.email} error={fieldErrors.email} type="email" inputMode="email" onChange={(value) => updateField('email', value)} /><Field id="delivery_address" label="عنوان التوصيل" value={fields.delivery_address} error={fieldErrors.delivery_address} required onChange={(value) => updateField('delivery_address', value)} /></div>
        <label htmlFor="notes" className="mt-4 block text-sm font-black text-[#162E21]">ملاحظات (اختياري)</label><textarea id="notes" value={fields.notes} onChange={(event) => updateField('notes', event.target.value)} rows={3} className="mt-1.5 w-full resize-y rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-base outline-none transition focus:border-[#C2A66D] focus:bg-white focus:ring-4 focus:ring-[#C2A66D]/10" />
        <button type="submit" disabled={submitting} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#162E21] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#21452f] disabled:cursor-wait disabled:opacity-60">{submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> جاري إرسال الطلب…</> : <><PackageCheck className="h-4 w-4" /> تأكيد الطلب</>}</button>
      </form>
      <aside className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm lg:sticky lg:top-40"><h2 className="font-black text-[#162E21]">مراجعة الطلب</h2><ul className="mt-3 divide-y divide-stone-100">{items.map((item) => <li key={item.product_variant_id} className="flex justify-between gap-3 py-2.5 text-sm"><span><strong className="block text-[#162E21]">{item.product_name}</strong><span className="text-xs text-stone-500">{item.size} — {item.color} × {item.quantity}</span>{item.display_discount > 0 && <span className="mt-1 block text-[11px] font-bold text-[#C2A66D]">خصم {formatPrice(item.display_discount)} للقطعة</span>}</span><span className="shrink-0 font-black text-stone-700">{formatPrice(item.display_effective_price * item.quantity)}</span></li>)}</ul><div className="mt-3 flex justify-between border-t border-stone-200 pt-3"><span className="text-sm font-bold text-stone-600">المجموع التقديري</span><span className="text-lg font-black text-[#C2A66D]">{formatPrice(displaySubtotal)}</span></div><p className="mt-3 text-xs font-semibold leading-5 text-stone-500">يتم تأكيد السعر والتوفر عند إرسال الطلب.</p><button onClick={() => onNavigate('cart')} className="mt-2 w-full rounded-xl px-4 py-2 text-sm font-bold text-stone-600 hover:bg-stone-50">العودة إلى السلة</button></aside>
    </div></main>
  );
}

function Field({ id, label, value, error, onChange, required, type = 'text', inputMode }: { id: string; label: string; value: string; error?: string; onChange: (value: string) => void; required?: boolean; type?: string; inputMode?: 'tel' | 'email' }) { return <div><label htmlFor={id} className="block text-sm font-black text-[#162E21]">{label}</label><input id={id} type={type} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} required={required} className={`mt-1.5 h-11 w-full rounded-xl border bg-stone-50 px-3.5 text-base outline-none transition focus:bg-white focus:ring-4 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-stone-200 focus:border-[#C2A66D] focus:ring-[#C2A66D]/10'}`} />{error && <p id={`${id}-error`} className="mt-1 text-xs font-bold text-red-700">{error}</p>}</div>; }
function validate(fields: CheckoutFields): FieldErrors { const errors: FieldErrors = {}; if (!fields.customer_name.trim()) errors.customer_name = 'يرجى إدخال الاسم.'; if (!fields.phone.trim()) errors.phone = 'يرجى إدخال رقم الهاتف.'; if (!fields.delivery_address.trim()) errors.delivery_address = 'يرجى إدخال عنوان التوصيل.'; if (fields.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) errors.email = 'يرجى إدخال بريد إلكتروني صحيح.'; return errors; }
function SuccessState({ result, onNavigate }: { result: OrderActionResponseDto; onNavigate: (page: string) => void }) { return <main className="mx-auto grid min-h-[62vh] max-w-2xl place-items-center px-4 py-16 text-center"><div className="w-full rounded-3xl border border-green-200 bg-white p-8 shadow-sm sm:p-12"><CheckCircle2 className="mx-auto h-16 w-16 text-green-700" /><h1 className="mt-5 text-3xl font-black text-[#162E21]">تم إرسال طلبك بنجاح</h1><p className="mt-3 leading-7 text-stone-600">استلمنا طلبك وسيتم تأكيد التفاصيل والتوفر.</p><div className="mx-auto mt-6 max-w-sm rounded-xl bg-stone-50 p-4"><span className="text-sm font-bold text-stone-500">معرّف الطلب</span><strong className="ms-2 text-lg text-[#162E21]">#{result.order.order_id}</strong></div><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><button onClick={() => onNavigate('products')} className="rounded-xl bg-[#162E21] px-5 py-3 text-sm font-black text-white">العودة للمنتجات</button><button onClick={() => onNavigate('home')} className="rounded-xl border border-stone-200 px-5 py-3 text-sm font-bold text-stone-600">العودة للرئيسية</button></div></div></main>; }
function formatPrice(value: number) { return `${new Intl.NumberFormat('ar', { maximumFractionDigits: 2 }).format(value)} ₪`; }
