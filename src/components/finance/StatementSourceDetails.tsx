import type { StatementCounterpartLine, StatementSourceDetails } from '@/api/types/ledger';
import { formatMoney } from '@/utils/money';

const orderTypes: Record<string, string> = { Retail: 'طلب أونلاين', Wholesale: 'طلب جملة', StoreSale: 'بيع محل' };
const statuses: Record<string, string> = { Pending: 'معلّق', Completed: 'مكتمل', Cancelled: 'ملغى' };
const checkActions: Record<string, string> = {
  DEPOSITED: 'إيداع في البنك', SENT_TO_COLLECTION: 'إرسال للتحصيل',
  RETURNED_FROM_BANK: 'إرجاع من البنك', ENDORSED: 'تجيير لطرف',
  ENDORSEMENT_RETURNED: 'إرجاع التجيير', RETURNED_TO_SOURCE: 'إرجاع للمصدر',
  RETRIEVED_FROM_SOURCE: 'استرجاع من المصدر', CASHED: 'صرف نقدًا',
};
const checkLocations: Record<string, string> = {
  TREASURY: 'خزنة الشيكات', BANK: 'البنك', COLLECTION: 'برسم التحصيل',
  ENDORSED_PARTY: 'مظهّر لطرف', SOURCE_PARTY: 'عند المصدر',
  CASHED: 'مصروف', CANCELLED: 'ملغى', ISSUED: 'صادر',
  CLEARED: 'مسدّد', RETURNED_OUTGOING: 'راجع صادر',
};

export const statementMovementName: Record<string, string> = {
  Sale: 'بيع', Purchase: 'شراء من عميل', SalesReturn: 'مردود مبيعات',
  PurchaseReturn: 'مردود مشتريات', Receipt: 'سند قبض', Disbursement: 'سند صرف',
  CustomerDebt: 'دين يدوي', WriteOff: 'مسامحة', Opening: 'رصيد افتتاحي',
  Reversal: 'عكس حركة', Journal: 'قيد يدوي',
  CheckMovement: 'حركة شيك',
};

export function StatementCounterparts({ lines }: { lines: StatementCounterpartLine[] }) {
  if (!lines.length) return null;
  return <div className="mt-2 rounded-lg bg-stone-50 p-3 text-xs sm:text-sm">
    <b className="text-brand">الطرف المقابل في القيد</b>
    <div className="mt-1 space-y-1">{lines.map((line, index) => <div key={`${line.account_code}-${index}`} className="flex flex-wrap gap-x-4">
      <span>{line.account_name} #{line.account_code}</span>
      {Number(line.debit) > 0 && <span>مدين: {formatMoney(line.debit)}</span>}
      {Number(line.credit) > 0 && <span>دائن: {formatMoney(line.credit)}</span>}
    </div>)}</div>
  </div>;
}

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  return <div><span className="text-stone-500">{label}: </span><b className="text-brand">{value}</b></div>;
}

export default function StatementSourceDetailsView({ details }: { details: StatementSourceDetails }) {
  const items = details.items ?? [];
  return <div className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm" style={{ breakInside: 'avoid' }}>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <b className="text-brand">{details.kind === 'Order' ? orderTypes[details.order_type ?? ''] ?? 'طلب بيع' :
        details.kind === 'Purchase' ? 'عملية شراء' : details.kind === 'Return' ? details.return_type === 'SalesReturn' ? 'مردود مبيعات' : 'مردود مشتريات' :
        details.kind === 'Payment' ? details.payment_type === 'Receipt' ? 'سند قبض' : 'سند صرف' :
        details.kind === 'Debt' ? 'دين يدوي' : details.kind === 'WriteOff' ? 'مسامحة' :
        details.kind === 'CheckMovement' ? 'حركة شيك' : 'رصيد افتتاحي'} #{details.reference_id}</b>
      {details.is_reversal && <span className="font-bold text-red-700">حركة معكوسة</span>}
      {details.status && <span>{statuses[details.status] ?? details.status}</span>}
      {details.cancelled && <span>ملغى حاليًا</span>}
    </div>
    {items.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[620px] border-collapse text-xs sm:text-sm">
      <thead><tr className="bg-stone-100">{['المنتج', 'المقاس / اللون', 'الكمية', 'سعر الوحدة', 'خصم الوحدة', 'الإجمالي'].map((label) => <th key={label} className="border p-2 text-right">{label}</th>)}</tr></thead>
      <tbody>{items.map((item, index) => <tr key={`${item.product_code}-${index}`}>
        <td className="border p-2"><b>{item.product_name}</b><small className="block text-stone-500">{item.product_code}{item.is_bonus ? ' · بونص' : ''}</small></td>
        <td className="border p-2">{item.size} · {item.color}</td>
        <td className="border p-2">{item.quantity}</td>
        <td className="border p-2">{formatMoney(item.unit_price)}{item.base_unit_price && Number(item.base_unit_price) !== Number(item.unit_price) && <small className="block text-stone-500">السعر الأساسي: {formatMoney(item.base_unit_price)}</small>}</td>
        <td className="border p-2">{item.unit_discount && Number(item.unit_discount) > 0 ? formatMoney(item.unit_discount) : '—'}</td>
        <td className="border p-2 font-bold">{formatMoney(item.line_total)}</td>
      </tr>)}</tbody>
    </table></div>}
    <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
      {details.kind === 'Order' && <><Detail label="مجموع المنتجات بعد خصم البنود" value={details.subtotal ? formatMoney(details.subtotal) : null} /><Detail label="إجمالي خصومات المنتجات" value={details.product_discount_total ? formatMoney(details.product_discount_total) : null} /><Detail label="خصم الطلب" value={details.order_discount ? formatMoney(details.order_discount) : null} /></>}
      {(details.kind === 'Order' || details.kind === 'Purchase' || details.kind === 'Return') && <Detail label="الإجمالي النهائي" value={details.total ? formatMoney(details.total) : null} />}
      {details.kind === 'Return' && <Detail label="العملية الأصلية" value={details.order_id ? `طلب #${details.order_id}` : details.purchase_id ? `شراء #${details.purchase_id}` : null} />}
      {details.kind === 'Payment' && <>
        <Detail label="الطريقة" value={details.method === 'Check' ? 'شيك' : 'نقد'} />
        <Detail label="المبلغ الأصلي" value={details.amount ? `${formatMoney(details.amount)} ${details.currency?.code ?? ''}` : null} />
        <Detail label="سعر الصرف" value={details.exchange_rate} />
        <Detail label="بالعملة الأساسية" value={details.base_amount ? formatMoney(details.base_amount) : null} />
        <Detail label="العملية المرتبطة" value={details.order_id ? `طلب #${details.order_id}` : details.purchase_id ? `شراء #${details.purchase_id}` : null} />
        {details.check && <><Detail label="رقم الشيك" value={details.check.number} /><Detail label="بنك الشيك" value={details.check.bank_name} /><Detail label="تاريخ الاستحقاق" value={details.check.due_date.slice(0, 10)} /><Detail label="موقع الشيك الحالي" value={checkLocations[details.check.location] ?? details.check.location} /></>}
      </>}
      {details.kind === 'CheckMovement' && <>
        <Detail label="الحركة" value={checkActions[details.action ?? ''] ?? details.action} />
        <Detail label="رقم الشيك" value={details.check?.number} />
        <Detail label="البنك" value={details.check?.bank_name} />
        <Detail label="تاريخ الاستحقاق" value={details.check?.due_date.slice(0, 10)} />
        <Detail label="موقع الشيك الحالي" value={details.check?.location ? checkLocations[details.check.location] ?? details.check.location : null} />
        <Detail label="المبلغ الأصلي" value={details.amount ? `${formatMoney(details.amount)} ${details.currency?.code ?? ''}` : null} />
        <Detail label="بالعملة الأساسية" value={details.base_amount ? formatMoney(details.base_amount) : null} />
      </>}
      {(details.kind === 'Debt' || details.kind === 'WriteOff' || details.kind === 'Opening') && <><Detail label="المبلغ" value={details.amount ? formatMoney(details.amount) : null} /><Detail label="السبب" value={details.reason} /><Detail label="التاريخ" value={details.debt_date?.slice(0, 10)} /><Detail label="الاتجاه" value={details.direction === 'Debit' ? 'مدين' : details.direction === 'Credit' ? 'دائن' : details.direction} /></>}
    </div>
    {details.notes && <p className="whitespace-pre-wrap text-stone-600"><b>ملاحظات:</b> {details.notes}</p>}
    {items.length > 0 && <p className="text-xs text-stone-500">تفاصيل المستند كما هي الآن؛ أثر الحركة والرصيد مأخوذان من القيد بتاريخها.</p>}
  </div>;
}
