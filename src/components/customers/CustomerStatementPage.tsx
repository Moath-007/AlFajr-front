import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { customersService, type CustomerStatementQuery, type CustomerStatementResponseDto, type StatementEntryDto } from '@/api';
import { RepDateInput } from '@/components/rep/RepFormControls';
import { apiMessages } from '@/components/rep/repOrderUtils';
import PrintHeader from '@/components/printing/PrintHeader';
import { printA4Element } from '@/utils/printDocument';
import { formatMoney } from '@/utils/money';
import StatementSourceDetailsView, { StatementCounterparts } from '@/components/finance/StatementSourceDetails';

const movementNames: Record<string, string> = {
  Receipt: 'سند قبض', Disbursement: 'سند صرف', Purchase: 'شراء من الزبون', CheckMovement: 'حركة شيك',
  SalesReturn: 'مردود مبيعات', PurchaseReturn: 'مردود مشتريات', WriteOff: 'مسامحة',
  CustomerDebt: 'دين يدوي', OpeningBalance: 'رصيد افتتاحي', Opening: 'رصيد افتتاحي',
  ReturnedCheck: 'شيك راجع', Reversal: 'عكس قيد', Journal: 'قيد يدوي',
  PaymentCancelled: 'إلغاء دفعة', CustomerPurchaseCancelled: 'إلغاء شراء',
};
const localDate = (value: string) => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Hebron', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(new Date(value));
const balanceText = (value: string) => {
  const amount = Number(value);
  return amount > 0 ? `مدين ${formatMoney(amount)}` : amount < 0 ? `دائن ${formatMoney(-amount)}` : `متوازن ${formatMoney(0)}`;
};
const sourceNames: Record<string, string> = {
  Order: 'طلب', CustomerPurchase: 'شراء', CustomerReturn: 'مردود',
  Payment: 'دفعة', CustomerDebt: 'دين', CustomerDebtEdit: 'تعديل دين',
  WriteOff: 'مسامحة', CustomerOpening: 'رصيد افتتاحي',
};
const referenceText = (entry: StatementEntryDto) => entry.reversal_of
  ? `عكس قيد #${entry.reversal_of}`
  : entry.source_type && entry.source_id !== null
    ? `${sourceNames[entry.source_type] ?? (entry.type === 'CheckMovement' ? 'شيك' : 'حركة')} #${entry.source_id}`
    : `قيد #${entry.journal_entry_id}`;
const checkLocation: Record<string, string> = {
  TREASURY: 'في خزنة الشيكات', BANK: 'في البنك', COLLECTION: 'برسم التحصيل',
  ENDORSED_PARTY: 'مظهّر لطرف', SOURCE_PARTY: 'معاد للمصدر', CASHED: 'مصروف',
  CANCELLED: 'ملغى', ISSUED: 'صادر', CLEARED: 'مسدّد', RETURNED_OUTGOING: 'راجع صادر',
};

export default function CustomerStatementPage({ basePath }: { basePath: '/owner' | '/rep' }) {
  const customerId = Number(useParams().id);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [query, setQuery] = useState<CustomerStatementQuery>({});
  const [statement, setStatement] = useState<CustomerStatementResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!Number.isInteger(customerId) || customerId <= 0) { setError('معرف الزبون غير صالح.'); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError(''); setStatement(null);
    customersService.statement(customerId, query, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setStatement(data); })
      .catch((reason) => { if (!controller.signal.aborted) setError(apiMessages(reason, 'تعذر تحميل كشف الحساب.').join('، ')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [customerId, query]);

  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (from && to && from > to) { setError('تاريخ البداية يجب أن يسبق تاريخ النهاية.'); return; }
    setQuery({ date_from: from || undefined, date_to: to || undefined });
  };
  const reset = () => { setFrom(''); setTo(''); setQuery({}); };
  const period = statement ? `${statement.period.date_from || 'البداية'} — ${statement.period.date_to}` : '';
  const summary = statement?.summary;

  return <div className="mx-auto max-w-[1400px] space-y-5 pb-10" dir="rtl">
    <Link className="text-sm font-bold text-gold-dark" to={`${basePath}/customers/${customerId}`}>← ملف الزبون</Link>
    <header className="border-b pb-4">
      <p className="text-xs font-black text-gold-dark">دفتر حساب الطرف</p>
      <h1 className="mt-1 text-3xl font-black text-brand">كشف حساب الزبون{statement ? `: ${statement.customer.name}` : ''}</h1>
      {statement && <p className="mt-1 text-sm text-stone-600">{statement.customer.phone} · الفترة: {period} · Asia/Hebron</p>}
      <p className="mt-2 text-sm text-stone-500">يعرض حركات حساب الطرف من دفتر اليومية. الرصيد هنا ليس متبقي الفواتير.</p>
    </header>
    <form onSubmit={apply} className="grid items-end gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[180px_180px_auto_auto]">
      <RepDateInput label="من تاريخ" value={from} onChange={setFrom} max={to || undefined} />
      <RepDateInput label="إلى تاريخ" value={to} onChange={setTo} min={from || undefined} />
      <button className="btn-primary min-h-11">تطبيق</button>
      <button type="button" className="btn-outline min-h-11" onClick={reset}>إعادة ضبط</button>
    </form>
    {error && <p className="rep-error" role="alert">{error}</p>}
    {loading && <p className="rounded-xl border bg-white p-5">جارٍ تحميل كشف الحساب…</p>}
    {!loading && statement && <>
      <div className="flex justify-end"><button className="btn-outline" onClick={() => printRef.current && void printA4Element({ element: printRef.current, title: `كشف حساب ${statement.customer.name}`, orientation: 'landscape' })}>طباعة / حفظ PDF</button></div>
      <article ref={printRef} className="print-document space-y-5 rounded-2xl border bg-white p-4 sm:p-6">
        <PrintHeader company={null} title="كشف حساب الزبون" subtitle={`${statement.customer.name} · ${period}`} />
        <section className="border-b pb-3"><h2 className="text-xl font-black text-brand">{statement.customer.name}</h2><p className="text-sm text-stone-600">{statement.customer.phone} · الفترة: {period}</p></section>
        {summary && <section className="print-summary grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Summary label="الرصيد الافتتاحي" value={balanceText(summary.opening_balance)} />
          <Summary label="إجمالي المدين" value={formatMoney(summary.debits_total)} />
          <Summary label="إجمالي الدائن" value={formatMoney(summary.credits_total)} />
          <Summary label="الرصيد الختامي" value={balanceText(summary.closing_balance)} />
        </section>}
        <p className="text-sm text-stone-500">عدد الحركات: {summary?.movements_count ?? statement.entries.length}</p>
        <section><h2 className="mb-3 text-lg font-black text-brand">حركات الحساب</h2>
          <div className="print-active hidden overflow-x-auto md:block"><table className="statement-table w-full min-w-[850px] border-collapse text-sm"><thead><tr className="bg-stone-100">{['التاريخ', 'النوع والبيان', 'المرجع', 'مدين', 'دائن', 'الرصيد'].map((label) => <th key={label} className="border p-2 text-right">{label}</th>)}</tr></thead><tbody>{statement.entries.map((entry) => <Fragment key={entry.journal_line_id}><tr><td className="whitespace-nowrap border p-2">{localDate(entry.date)}</td><td className="border p-2"><b>{movementNames[entry.type] ?? entry.type}</b><small className="block text-stone-500">{entry.description}</small>{entry.payment_details && <PaymentNote entry={entry} />}</td><td className="border p-2">{referenceText(entry)}</td><td className="border p-2">{formatMoney(entry.debit)}</td><td className="border p-2">{formatMoney(entry.credit)}</td><td className="border p-2 font-bold">{balanceText(entry.balance)}</td></tr>{(entry.source_details || entry.counterpart_lines?.length > 0) && <tr><td colSpan={6} className="border p-2">{entry.source_details && <StatementSourceDetailsView details={entry.source_details} />}<StatementCounterparts lines={entry.counterpart_lines ?? []} /></td></tr>}</Fragment>)}</tbody></table></div>
          <div className="report-mobile-cards space-y-2 md:hidden print:hidden">{statement.entries.map((entry) => <article key={entry.journal_line_id} className="rounded-xl border p-3 text-sm"><div className="flex justify-between gap-2"><b>{movementNames[entry.type] ?? entry.type}</b><span>{localDate(entry.date)}</span></div><p className="mt-1 text-stone-600">{entry.description} · {referenceText(entry)}</p><div className="mt-2 grid grid-cols-3 gap-2"><span>مدين<br/><b>{formatMoney(entry.debit)}</b></span><span>دائن<br/><b>{formatMoney(entry.credit)}</b></span><span>الرصيد<br/><b>{balanceText(entry.balance)}</b></span></div><PaymentNote entry={entry} />{entry.source_details && <StatementSourceDetailsView details={entry.source_details} />}<StatementCounterparts lines={entry.counterpart_lines ?? []} /></article>)}</div>
          {!statement.entries.length && <p className="p-5 text-center text-stone-500">لا توجد حركات في الفترة المختارة.</p>}
        </section>
      </article>
    </>}
  </div>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-stone-50 p-4"><span className="text-xs text-stone-600">{label}</span><b className="mt-2 block text-lg text-brand">{value}</b></div>;
}

function PaymentNote({ entry }: { entry: StatementEntryDto }) {
  const detail = entry.payment_details;
  if (!detail) return null;
  return <small className="mt-1 block text-stone-500">{detail.method === 'Check' ? 'شيك' : 'نقد'}{detail.check ? ` #${detail.check.number} · الاستحقاق: ${detail.check.due_date.slice(0, 10)} · الحالة الحالية: ${checkLocation[detail.check.current_location] ?? detail.check.current_location}` : ''}</small>;
}
