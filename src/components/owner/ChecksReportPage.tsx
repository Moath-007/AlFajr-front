import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { currenciesService, ledgerService, reportsService,
  type ChecksMovementsReportQuery, type ChecksMovementsReportResponseDto,
  type ChecksReportDueStatus, type ChecksReportDirection, type ChecksReportLocation,
  type ChecksSnapshotReportQuery, type ChecksSnapshotReportResponseDto,
  type CurrencyDto, type LedgerAccount } from '@/api';
import { RepDateInput } from '@/components/rep/RepFormControls';
import Select from '@/components/ui/Select';
import { apiMessages } from '@/components/rep/repOrderUtils';
import PrintHeader from '@/components/printing/PrintHeader';
import { printA4Element } from '@/utils/printDocument';
import { formatMoney } from '@/utils/money';

type SharedDraft = { search: string; direction: string; currency: string; account: string };
type SnapshotDraft = SharedDraft & { location: string; due: string; from: string; to: string };
type MovementDraft = SharedDraft & { action: string; actor: string; bank: string; from: string; to: string };
const blankSnapshot: SnapshotDraft = { search: '', direction: '', currency: '', account: '', location: '', due: '', from: '', to: '' };
const blankMovement: MovementDraft = { search: '', direction: '', currency: '', account: '', action: '', actor: '', bank: '', from: '', to: '' };
const locations: Record<ChecksReportLocation, string> = {
  TREASURY: 'الخزنة', BANK: 'البنك', COLLECTION: 'برسم التحصيل',
  ENDORSED_PARTY: 'مجيّر لطرف', SOURCE_PARTY: 'لدى المصدر', CASHED: 'مصروف نقدًا',
  CANCELLED: 'ملغى', ISSUED: 'صادر', CLEARED: 'صُرف من البنك', RETURNED_OUTGOING: 'شيك صادر راجع',
};
const actions: Record<string, string> = {
  RECEIVED: 'استلام الشيك', OUTGOING_ISSUED: 'إصدار شيك صادر',
  DEPOSITED: 'إيداع في البنك', SENT_TO_COLLECTION: 'إرسال للتحصيل',
  RETURNED_FROM_BANK: 'إرجاع من البنك', ENDORSED: 'تجيير لطرف',
  ENDORSEMENT_RETURNED: 'إرجاع التجيير', RETURNED_TO_SOURCE: 'إرجاع إلى المصدر',
  RETRIEVED_FROM_SOURCE: 'استرداد من المصدر', CASHED: 'صرف نقدًا',
  OUTGOING_CLEARED: 'تأكيد صرف الشيك الصادر', OUTGOING_RETURNED: 'إرجاع الشيك الصادر',
  PAYMENT_CANCELLED: 'إلغاء الدفعة المرتبطة', DETAILS_EDITED: 'تعديل بيانات الشيك',
  MOVEMENT_CANCELLED: 'التراجع عن حركة',
};
const dueLabels: Record<ChecksReportDueStatus, string> = { Future: 'غير مستحق', Today: 'مستحق اليوم', Overdue: 'متأخر' };
const directionLabel = (value: string) => value === 'Incoming' ? 'وارد' : 'صادر';
const money = (amount: string, code: string) => `${formatMoney(amount)} ${code}`;
const number = (value: number) => new Intl.NumberFormat('en-US').format(value);
const id = (value: string) => value ? Number(value) : undefined;
const checkLink = (checkId: number) => `/owner/checks/${checkId}`;

export default function ChecksReportPage() {
  const [snapshotDraft, setSnapshotDraft] = useState<SnapshotDraft>(blankSnapshot);
  const [movementDraft, setMovementDraft] = useState<MovementDraft>(blankMovement);
  const [snapshotQuery, setSnapshotQuery] = useState<ChecksSnapshotReportQuery>({ page: 1, limit: 20 });
  const [movementQuery, setMovementQuery] = useState<ChecksMovementsReportQuery>({ page: 1, limit: 20 });
  const [snapshot, setSnapshot] = useState<ChecksSnapshotReportResponseDto | null>(null);
  const [movements, setMovements] = useState<ChecksMovementsReportResponseDto | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [movementLoading, setMovementLoading] = useState(true);
  const [snapshotError, setSnapshotError] = useState('');
  const [movementError, setMovementError] = useState('');
  const [currencies, setCurrencies] = useState<CurrencyDto[]>([]);
  const [banks, setBanks] = useState<LedgerAccount[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const snapshotPrint = useRef<HTMLElement>(null);
  const movementsPrint = useRef<HTMLElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    currenciesService.list(controller.signal).then((result) => setCurrencies(Array.isArray(result) ? result : result.items ?? result.currencies ?? [])).catch(() => undefined);
    ledgerService.accounts(controller.signal).then((result) => { setAccounts(result); setBanks(result.filter((row) => row.kind === 'Bank')); }).catch(() => undefined);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setSnapshotLoading(true); setSnapshotError('');
    reportsService.checks(snapshotQuery, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setSnapshot(result); })
      .catch((error) => { if (!controller.signal.aborted) setSnapshotError(apiMessages(error, 'تعذر تحميل الشيكات الحالية.').join('، ')); })
      .finally(() => { if (!controller.signal.aborted) setSnapshotLoading(false); });
    return () => controller.abort();
  }, [snapshotQuery]);
  useEffect(() => {
    const controller = new AbortController();
    setMovementLoading(true); setMovementError('');
    reportsService.checkMovements(movementQuery, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setMovements(result); })
      .catch((error) => { if (!controller.signal.aborted) setMovementError(apiMessages(error, 'تعذر تحميل حركات الشيكات.').join('، ')); })
      .finally(() => { if (!controller.signal.aborted) setMovementLoading(false); });
    return () => controller.abort();
  }, [movementQuery]);
  const common = (draft: SharedDraft) => ({ search: draft.search.trim() || undefined,
    direction: (draft.direction || undefined) as ChecksReportDirection | undefined,
    currency_id: id(draft.currency), account_id: id(draft.account) });
  const applySnapshot = (event: FormEvent) => {
    event.preventDefault();
    if (snapshotDraft.from && snapshotDraft.to && snapshotDraft.from > snapshotDraft.to) { setSnapshotError('تاريخ البداية بعد النهاية.'); return; }
    setSnapshotQuery({ ...common(snapshotDraft), location: (snapshotDraft.location || undefined) as ChecksReportLocation | undefined,
      due_status: (snapshotDraft.due || undefined) as ChecksReportDueStatus | undefined,
      due_from: snapshotDraft.from || undefined, due_to: snapshotDraft.to || undefined, page: 1, limit: 20 });
  };
  const applyMovements = (event: FormEvent) => {
    event.preventDefault();
    if (movementDraft.from && movementDraft.to && movementDraft.from > movementDraft.to) { setMovementError('تاريخ البداية بعد النهاية.'); return; }
    setMovementQuery({ ...common(movementDraft), action: movementDraft.action || undefined,
      actor_id: id(movementDraft.actor), bank_account_id: id(movementDraft.bank),
      date_from: movementDraft.from || undefined, date_to: movementDraft.to || undefined, page: 1, limit: 20 });
  };
  const print = (element: HTMLElement | null, title: string) => element && void printA4Element({ element, title, orientation: 'landscape' });
  const accountSelect = (value: string, onChange: (value: string) => void) => <Select label="حساب مصدر الشيك" value={value} onChange={onChange} searchable searchPlaceholder="ابحث باسم الحساب" options={[{ value: '', label: 'كل الحسابات' }, ...accounts.filter((row) => ['General'].includes(row.kind)).map((row) => ({ value: String(row.account_id), label: `${row.name} · #${row.account_id}` }))]} />;
  const currencySelect = (value: string, onChange: (value: string) => void) => <Select label="العملة" value={value} onChange={onChange} options={[{ value: '', label: 'كل العملات' }, ...currencies.map((row) => ({ value: String(row.currency_id), label: `${row.code} · ${row.name}` }))]} />;
  const directionSelect = (value: string, onChange: (value: string) => void) => <Select label="الاتجاه" value={value} onChange={onChange} options={[{ value: '', label: 'وارد وصادر' }, { value: 'Incoming', label: 'وارد' }, { value: 'Outgoing', label: 'صادر' }]} />;

  return <div className="mx-auto max-w-[1450px] space-y-6 pb-10" dir="rtl">
    <Link to="/owner/reports" className="text-sm font-bold text-gold-dark">← التقارير</Link>
    <header className="border-b pb-4"><h1 className="text-3xl font-black text-brand">تقرير الشيكات</h1><p className="mt-2 text-sm text-stone-600">لقطة الشيكات الحالية وسجل حركاتها. إدارة الشيكات تتم من صفحة الشيكات التشغيلية.</p></header>
    <section className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-xl font-black text-brand">الشيكات الحالية</h2><p className="text-sm text-stone-600">الموقع والحالة كما هما الآن. الاستحقاق تصنيف حسب التاريخ فقط، ولا يعني تحصيلًا جديدًا.</p></div>{snapshot && <button className="btn-outline" onClick={() => print(snapshotPrint.current, 'الشيكات الحالية')}>طباعة الصفحة الحالية / PDF</button>}</div>
      <form onSubmit={applySnapshot} className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="رقم الشيك أو بحث"><input className="rep-control" value={snapshotDraft.search} onChange={(e) => setSnapshotDraft({ ...snapshotDraft, search: e.target.value })} /></Field>
        {directionSelect(snapshotDraft.direction, (direction) => setSnapshotDraft({ ...snapshotDraft, direction }))}
        <Select label="الموقع الحالي" value={snapshotDraft.location} onChange={(location) => setSnapshotDraft({ ...snapshotDraft, location })} options={[{ value: '', label: 'كل المواقع' }, ...Object.entries(locations).map(([value, label]) => ({ value, label }))]} />
        <Select label="الاستحقاق" value={snapshotDraft.due} onChange={(due) => setSnapshotDraft({ ...snapshotDraft, due })} options={[{ value: '', label: 'الكل' }, ...Object.entries(dueLabels).map(([value, label]) => ({ value, label }))]} />
        {currencySelect(snapshotDraft.currency, (currency) => setSnapshotDraft({ ...snapshotDraft, currency }))}
        {accountSelect(snapshotDraft.account, (account) => setSnapshotDraft({ ...snapshotDraft, account }))}
        <RepDateInput label="استحقاق من" value={snapshotDraft.from} onChange={(from) => setSnapshotDraft({ ...snapshotDraft, from })} max={snapshotDraft.to || undefined} />
        <RepDateInput label="استحقاق إلى" value={snapshotDraft.to} onChange={(to) => setSnapshotDraft({ ...snapshotDraft, to })} min={snapshotDraft.from || undefined} />
        <div className="flex items-end gap-2"><button className="btn-primary min-h-11">تطبيق</button><button type="button" className="btn-outline min-h-11" onClick={() => { setSnapshotDraft(blankSnapshot); setSnapshotQuery({ page: 1, limit: 20 }); }}>إعادة ضبط</button></div>
      </form>
      {snapshotError && <p role="alert" className="rep-error">{snapshotError}</p>}{snapshotLoading && <p className="rounded-xl border bg-white p-4">جارٍ تحميل الشيكات…</p>}
      {snapshot && <article ref={snapshotPrint} className="print-document space-y-4 rounded-2xl border bg-white p-4 sm:p-6">
        <PrintHeader company={null} title="الشيكات الحالية" subtitle={`تاريخ العمل: ${snapshot.business_date} · صفحة ${snapshot.pagination.page}`} />
        <div className="print-summary grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="عدد الشيكات" value={number(snapshot.summary.checks_count)} /><Metric label="غير مستحقة" value={number(snapshot.summary.future)} /><Metric label="مستحقة اليوم" value={number(snapshot.summary.due_today)} /><Metric label="متأخرة" value={number(snapshot.summary.overdue)} /></div>
        <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-xl border p-4"><h3 className="mb-2 font-black text-brand">حسب الموقع</h3>{snapshot.by_location.map((row) => <p key={row.location} className="border-b py-1 text-sm">{locations[row.location] ?? row.location}: <b>{number(row.count)}</b></p>)}{!snapshot.by_location.length && <p>لا توجد شيكات.</p>}</div><div className="rounded-xl border p-4"><h3 className="mb-2 font-black text-brand">المبالغ حسب العملة والاتجاه</h3>{snapshot.by_currency.map((row) => <p key={`${row.currency.currency_id}-${row.direction}`} className="border-b py-1 text-sm">{row.currency.code} · {directionLabel(row.direction)}: <b>{money(row.original_amount, row.currency.code)}</b> · {number(row.count)} شيك</p>)}{!snapshot.by_currency.length && <p>لا توجد شيكات.</p>}</div></div>
        <p className="text-xs text-stone-600">لا تُجمع مبالغ العملات المختلفة. تصنيف الاستحقاق تقويمي لكل المواقع، بما فيها الحالات المنتهية؛ اختر الموقع لعرض شيكات قابلة للمتابعة.</p>
        <div className="print-active hidden overflow-x-auto md:block"><table className="w-full min-w-[1050px] text-sm"><thead><tr className="bg-stone-100">{['الشيك', 'الاتجاه / الحساب', 'البنك', 'الاستحقاق', 'المبلغ', 'الموقع الحالي', 'تصنيف النظام / الاستحقاق', 'المرجع'].map((label) => <th key={label} className="border p-2 text-right">{label}</th>)}</tr></thead><tbody>{snapshot.items.map((row) => <tr key={row.managed_check_id}><td className="border p-2"><b>{row.number}</b><small className="block">#{row.managed_check_id}</small></td><td className="border p-2">{directionLabel(row.direction)} · {row.account.name}</td><td className="border p-2">{row.current_bank_account?.name ?? row.bank_name ?? '—'}</td><td className="border p-2">{row.due_date}</td><td className="border p-2">{money(row.original_amount, row.currency.code)}</td><td className="border p-2">{locations[row.location] ?? row.location}</td><td className="border p-2">{row.classified_collected ? 'مصنّف كمحصّل' : 'غير مصنّف كمحصّل'}<small className="block">{dueLabels[row.due_status]}</small></td><td className="border p-2">دفعة #{row.payment_id}<Link className="block font-bold text-gold-dark" to={checkLink(row.managed_check_id)}>عرض الشيك</Link></td></tr>)}</tbody></table></div>
        <div className="report-mobile-cards space-y-2 md:hidden print:hidden">{snapshot.items.map((row) => <div key={row.managed_check_id} className="rounded-xl border p-3 text-sm"><div className="flex justify-between gap-2"><b>{row.number} · {directionLabel(row.direction)}</b><b>{money(row.original_amount, row.currency.code)}</b></div><p>{row.account.name} · {locations[row.location] ?? row.location} · {dueLabels[row.due_status]}</p><p>{row.classified_collected ? 'مصنّف كمحصّل' : 'غير مصنّف كمحصّل'} · دفعة #{row.payment_id}</p><p>{row.due_date} · {row.current_bank_account?.name ?? row.bank_name ?? '—'}</p><Link className="font-bold text-gold-dark" to={checkLink(row.managed_check_id)}>عرض الشيك</Link></div>)}</div>
        {!snapshot.items.length && <p className="p-4 text-stone-500">لا توجد شيكات مطابقة.</p>}
      </article>}
      {snapshot && <Pager value={snapshot.pagination} onPage={(page) => setSnapshotQuery({ ...snapshotQuery, page })} />}
    </section>
    <section className="space-y-4 border-t pt-6"><div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-xl font-black text-brand">حركات الشيكات</h2><p className="text-sm text-stone-600">كل حدث بتاريخ عمليته، بما في ذلك الحدث الأصلي والتراجع عنه. الرقم والبنك الظاهران بيانات الشيك الحالية.</p></div>{movements && <button className="btn-outline" onClick={() => print(movementsPrint.current, 'حركات الشيكات')}>طباعة الصفحة الحالية / PDF</button>}</div>
      <form onSubmit={applyMovements} className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <RepDateInput label="من تاريخ الحركة" value={movementDraft.from} onChange={(from) => setMovementDraft({ ...movementDraft, from })} max={movementDraft.to || undefined} />
        <RepDateInput label="إلى تاريخ الحركة" value={movementDraft.to} onChange={(to) => setMovementDraft({ ...movementDraft, to })} min={movementDraft.from || undefined} />
        <Select label="الحركة" value={movementDraft.action} onChange={(action) => setMovementDraft({ ...movementDraft, action })} options={[{ value: '', label: 'كل الحركات' }, ...(movements?.available_actions ?? []).map((action) => ({ value: action, label: actions[action] ?? action }))]} />
        <Field label="رقم الشيك أو المرجع"><input className="rep-control" value={movementDraft.search} onChange={(e) => setMovementDraft({ ...movementDraft, search: e.target.value })} /></Field>
        {directionSelect(movementDraft.direction, (direction) => setMovementDraft({ ...movementDraft, direction }))}
        {currencySelect(movementDraft.currency, (currency) => setMovementDraft({ ...movementDraft, currency }))}
        {accountSelect(movementDraft.account, (account) => setMovementDraft({ ...movementDraft, account }))}
        <Select label="البنك المرتبط بالحركة" value={movementDraft.bank} onChange={(bank) => setMovementDraft({ ...movementDraft, bank })} options={[{ value: '', label: 'كل البنوك' }, ...banks.map((row) => ({ value: String(row.account_id), label: row.name }))]} />
        <Field label="رقم المنفذ"><input type="number" min="1" className="rep-control" value={movementDraft.actor} onChange={(e) => setMovementDraft({ ...movementDraft, actor: e.target.value })} /></Field>
        <div className="flex items-end gap-2"><button className="btn-primary min-h-11">تطبيق</button><button type="button" className="btn-outline min-h-11" onClick={() => { setMovementDraft(blankMovement); setMovementQuery({ page: 1, limit: 20 }); }}>إعادة ضبط</button></div>
      </form>
      {movementError && <p role="alert" className="rep-error">{movementError}</p>}{movementLoading && <p className="rounded-xl border bg-white p-4">جارٍ تحميل الحركات…</p>}
      {movements && <article ref={movementsPrint} className="print-document space-y-3 rounded-2xl border bg-white p-4 sm:p-6">
        <PrintHeader company={null} title="حركات الشيكات" subtitle={`صفحة ${movements.pagination.page} من ${movements.pagination.total_pages || 1} · تاريخ العملية`} />
        <div className="print-active hidden overflow-x-auto md:block"><table className="w-full min-w-[1100px] text-sm"><thead><tr className="bg-stone-100">{['التاريخ', 'الشيك الحالي', 'الحركة', 'من ← إلى', 'الحساب / البنك', 'المبلغ', 'المنفذ', 'المرجع / التراجع'].map((label) => <th key={label} className="border p-2 text-right">{label}</th>)}</tr></thead><tbody>{movements.items.map((row) => <tr key={row.check_event_id}><td className="border p-2">{row.operation_date}</td><td className="border p-2">{row.number_current}<small className="block">{directionLabel(row.direction)} · #{row.managed_check_id}</small></td><td className="border p-2"><b>{actions[row.action] ?? row.action}</b>{row.cancelled_at && <small className="block text-red-700">عُكست الحركة</small>}</td><td className="border p-2">{row.from_location ? locations[row.from_location] ?? row.from_location : 'بداية'} ← {locations[row.to_location] ?? row.to_location}</td><td className="border p-2">{row.account.name}<small className="block">{row.bank_account?.name ?? row.party_account?.name ?? row.bank_name_current ?? '—'}</small></td><td className="border p-2">{money(row.original_amount, row.currency.code)}</td><td className="border p-2">{row.actor?.name ?? 'غير متاح'}</td><td className="border p-2">حدث #{row.check_event_id} · دفعة #{row.payment_id}{row.cancels_event_id && <small className="block">يعكس الحدث #{row.cancels_event_id}</small>}{row.reversed_by_event_id && <small className="block">عُكس بالحدث #{row.reversed_by_event_id}</small>}{row.notes && <small className="block">{row.notes}</small>}{row.cancel_reason && <small className="block">السبب: {row.cancel_reason}</small>}<Link className="block font-bold text-gold-dark" to={checkLink(row.managed_check_id)}>عرض الشيك</Link></td></tr>)}</tbody></table></div>
        <div className="report-mobile-cards space-y-2 md:hidden print:hidden">{movements.items.map((row) => <div key={row.check_event_id} className="rounded-xl border p-3 text-sm"><div className="flex justify-between gap-2"><b>{actions[row.action] ?? row.action}</b><b>{money(row.original_amount, row.currency.code)}</b></div><p>{row.operation_date} · {row.number_current} · {directionLabel(row.direction)}</p><p>{row.from_location ? locations[row.from_location] ?? row.from_location : 'بداية'} ← {locations[row.to_location] ?? row.to_location}</p><p>{row.account.name} · {row.bank_account?.name ?? row.party_account?.name ?? row.bank_name_current ?? '—'}</p><p>حدث #{row.check_event_id} · دفعة #{row.payment_id} · المنفذ: {row.actor?.name ?? 'غير متاح'}</p>{row.cancelled_at && <p className="text-red-700">عُكست الحركة</p>}{row.cancels_event_id && <p>يعكس الحدث #{row.cancels_event_id}</p>}{row.reversed_by_event_id && <p>عُكس بالحدث #{row.reversed_by_event_id}</p>}{row.notes && <p>{row.notes}</p>}{row.cancel_reason && <p>السبب: {row.cancel_reason}</p>}<Link className="font-bold text-gold-dark" to={checkLink(row.managed_check_id)}>عرض الشيك</Link></div>)}</div>
        {!movements.items.length && <p className="p-4 text-stone-500">لا توجد حركات مطابقة.</p>}
      </article>}
      {movements && <Pager value={movements.pagination} onPage={(page) => setMovementQuery({ ...movementQuery, page })} />}
    </section>
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="rep-label">{label}</span>{children}</label>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-stone-50 p-4"><span className="text-xs text-stone-600">{label}</span><b className="mt-2 block text-xl text-brand">{value}</b></div>;
}
function Pager({ value, onPage }: { value: { page: number; total_pages: number; total: number }; onPage: (page: number) => void }) {
  if (value.total_pages <= 1) return null;
  return <div className="flex items-center justify-center gap-3"><button className="btn-outline" disabled={value.page <= 1} onClick={() => onPage(value.page - 1)}>السابق</button><span>صفحة {value.page} من {value.total_pages} · {number(value.total)} سجل</span><button className="btn-outline" disabled={value.page >= value.total_pages} onClick={() => onPage(value.page + 1)}>التالي</button></div>;
}

