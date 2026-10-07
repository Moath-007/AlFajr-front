import Select from '@/components/ui/Select';
import { renderToStaticMarkup } from 'react-dom/server';
import AccountStatementPrint from './AccountStatementPrint';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  accountsService,
  companyProfileService,
  type CompanyProfileDataDto,
  type EffectiveAccountStatement,
  type AccountMovementType,
} from '@/api';
import { useAuth } from '@/auth/useAuth';
import {
  apiMessages,
  formatMoney,
  formatOrderDate,
} from '@/components/rep/repOrderUtils';
import PrintHeader from '@/components/printing/PrintHeader';
import { printA4Element } from '@/utils/printDocument';
import { Balance, MovementTable, Pager } from './accountUi';
import { currentMonth, movementLabels, statementAmount, accountAmountColor } from './accountUiUtils';
export default function AccountStatementPage() {
  const { id } = useParams();
  const accountId = Number(id);
  const { user } = useAuth();
  const admin = user?.role === 'Admin',
    base = admin ? '/owner' : '/rep';
  const [params, setParams] = useSearchParams();
  const defaults = currentMonth();
  const from = params.get('from') ?? defaults.from,
    to = params.get('to') ?? defaults.to;
  const type = params.get('movement_type') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [data, setData] = useState<EffectiveAccountStatement | null>(null);
  const [company, setCompany] = useState<CompanyProfileDataDto | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [printing, setPrinting] = useState(false);
  function filter(key: string, value: string) {
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.set(key, value);
      if (key !== 'page') n.set('page', '1');
      return n;
    });
  }
  useEffect(() => {
    const c = new AbortController();
    companyProfileService
      .get(c.signal)
      .then((r) => setCompany(r.company))
      .catch(() => undefined);
    return () => c.abort();
  }, []);
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError('');
    setData(null);
    accountsService
      .statement(
        accountId,
        {
          from: from || undefined,
          to: to || undefined,
          movement_type: type ? (type as AccountMovementType) : undefined,
          page,
          limit: 20,
        },
        c.signal,
      )
      .then(setData)
      .catch((e) => {
        if (!c.signal.aborted)
          setError(
            apiMessages(
              e,
              'تعذر الوصول إلى كشف الحساب. البيانات المالية للصناديق والبنوك متاحة للمدير فقط.',
            ).join('، '),
          );
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [accountId, from, to, type, page]);
  async function print() {
    if (!data || printing) return;
    setPrinting(true);
    try {
      const query = { from: from || undefined, to: to || undefined, movement_type: type ? type as AccountMovementType : undefined, limit: 100 };
      const first = await accountsService.statement(accountId, { ...query, page: 1 });
      const entries = [...first.entries];
      for (let next = 2; next <= first.pagination.total_pages; next++) {
        const result = await accountsService.statement(accountId, { ...query, page: next });
        if (result.pagination.total !== first.pagination.total) throw new Error('تغيّرت الحركات أثناء تجهيز الطباعة. أعد المحاولة.');
        entries.push(...result.entries);
      }
      if (entries.length !== first.pagination.total || new Set(entries.map(entry => entry.movement_id)).size !== entries.length) throw new Error('تعذر تجهيز جميع الحركات. أعد المحاولة.');
      const element = document.createElement('article');
      element.innerHTML = renderToStaticMarkup(<AccountStatementPrint data={{ ...first, entries }} company={company} from={from} to={to} type={type} />);
      await printA4Element({
        element,
        title: `كشف حساب ${data?.account.name ?? ''}`,
        orientation: 'portrait',
      });
    } catch (e) {
      setError(apiMessages(e, 'تعذر فتح الطباعة').join('، '));
    } finally {
      setPrinting(false);
    }
  }
  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            className="text-sm text-stone-500"
            to={`${base}/accounts/${accountId}`}
          >
            ← تفاصيل الحساب
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-brand">
            كشف الحساب
          </h1>
        </div>
        <button
          disabled={loading || !data || printing}
          className="btn-primary"
          onClick={() => void print()}
        >
          {printing ? 'جارٍ تجهيز الطباعة…' : 'طباعة الكشف كاملًا / حفظ PDF'}
        </button>
      </header>
      <section className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
        <label className="text-xs text-stone-500">
          من
          <input
            className="rep-control"
            type="date"
            value={from}
            onChange={(e) => filter('from', e.target.value)}
          />
        </label>
        <label className="text-xs text-stone-500">
          إلى
          <input
            className="rep-control"
            type="date"
            value={to}
            onChange={(e) => filter('to', e.target.value)}
          />
        </label>
        <Select
          label="عرض حركات"
          className="w-full sm:w-64"
          value={type}
          onChange={(value) => filter('movement_type', value)}
          options={[{ value: '', label: 'كل الحركات' }, ...Object.entries(movementLabels).map(([value, label]) => ({ value, label }))]}
        />
      </section>
      {error && (
        <p role="alert" className="rep-error">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="p-8 text-center">
          جارٍ تحميل الكشف…
        </p>
      ) : (
        data && (
          <>
            <article
              className="print-document space-y-5 rounded-2xl bg-white p-4 sm:p-6"
            >
              <PrintHeader
                company={company}
                title="كشف الحساب"
                subtitle={`${data.account.account_number} · ${data.account.name}`}
                filters={[
                  {
                    label: 'من',
                    value: from ? formatOrderDate(from) : 'بداية السجل',
                  },
                  {
                    label: 'إلى',
                    value: to ? formatOrderDate(to) : 'كل التواريخ',
                  },
                  {
                    label: 'عرض حركات',
                    value: type
                      ? (movementLabels[type as AccountMovementType] ?? type)
                      : 'كل الحركات',
                  },
                  {
                    label: 'نطاق الطباعة',
                    value: `الصفحة ${page} من ${Math.max(1, data.pagination.total_pages)} · ${data.entries.length} من ${data.pagination.total} حركة`,
                  },
                ]}
              />
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-brand">
                    {data.account.name}
                  </h2>
                  <p className="text-sm text-stone-500">
                    {data.account.account_number}
                    {data.account.phone ? ` · ${data.account.phone}` : ''}
                  </p>
                  <p className="mt-2 text-xs text-stone-500">
                    الفترة: {from ? formatOrderDate(from) : 'بداية السجل'} —{' '}
                    {to ? formatOrderDate(to) : 'كل التواريخ'} ·{' '}
                    {type
                      ? (movementLabels[type as AccountMovementType] ?? type)
                      : 'كل الحركات'}
                  </p>
                </div>
                <div>
                  <p className="mb-2 text-xs text-stone-500">
                    رصيد الحساب الآن
                  </p>
                  <Balance
                    value={data.current_balance}
                    kind={data.account.kind}
                  />
                </div>
              </div>
              <div className="print-summary grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ['الرصيد قبل بداية الفترة', data.opening_balance],
                  ['الرصيد في نهاية الفترة', data.closing_balance],
                  ['مجموع المدين', data.totals.debit],
                  ['مجموع الدائن', data.totals.credit],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border p-3">
                    <p className="text-xs text-stone-500">{label}</p>
                    <b className={'mt-1 block text-right ' + accountAmountColor(value, label === 'مجموع المدين' ? 'debit' : label === 'مجموع الدائن' ? 'credit' : 'balance')} dir="rtl">
                      <bdi dir="ltr">{label.includes('الرصيد') ? statementAmount(value, 'balance') : formatMoney(value)}</bdi>
                    </b>
                  </div>
                ))}
              </div>
              <p className="text-xs leading-6 text-stone-500">
                الحركات مرتبة من الأحدث إلى الأقدم. المدين يزيد رصيد الحساب، والدائن يقلله.
                الرصيد بعد كل حركة يشمل كل أنواع الحركات حتى تاريخها، حتى عند اختيار نوع محدد.
              </p>
              <MovementTable entries={data.entries} base={base} admin={admin} />
              <footer className="flex flex-wrap justify-between gap-3 border-t pt-3 text-xs text-stone-500">
                <span>
                  الصفحة {page} من {Math.max(1, data.pagination.total_pages)} ·
                  المعروض {data.entries.length} من {data.pagination.total} حركة
                </span>

              </footer>
            </article>
            <Pager
              page={page}
              pages={data.pagination.total_pages}
              total={data.pagination.total}
              onPage={(p) => filter('page', String(p))}
            />
          </>
        )
      )}
    </div>
  );
}
