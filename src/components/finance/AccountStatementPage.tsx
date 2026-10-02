import { useEffect, useRef, useState } from 'react';
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
import { currentMonth, movementLabels } from './accountUiUtils';
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
  const article = useRef<HTMLElement>(null);
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
    if (!article.current) return;
    setPrinting(true);
    try {
      await printA4Element({
        element: article.current,
        title: `كشف حساب ${data?.account.name ?? ''}`,
        orientation: 'landscape',
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
            كشف الحساب الشامل
          </h1>
        </div>
        <button
          disabled={loading || !data || printing}
          className="btn-primary"
          onClick={() => void print()}
        >
          {printing ? 'جارٍ تجهيز الطباعة…' : 'طباعة الصفحة / حفظ PDF'}
        </button>
      </header>
      <section className="flex flex-wrap gap-3 rounded-xl border bg-white p-4">
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
        <label className="text-xs text-stone-500">
          نوع الحركة
          <select
            className="rep-control"
            aria-label="نوع الحركة"
              value={type}
            onChange={(e) => filter('movement_type', e.target.value)}
          >
            <option value="">كل الحركات</option>
            {Object.entries(movementLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
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
              ref={article}
              className="print-document space-y-5 rounded-2xl bg-white p-4 sm:p-6"
            >
              <PrintHeader
                company={company}
                title="كشف الحساب الشامل"
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
                    label: 'نوع الحركة',
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
                    الرصيد الحالي الإجمالي · مستقل عن الفترة
                  </p>
                  <Balance
                    value={data.current_balance}
                    kind={data.account.kind}
                  />
                </div>
              </div>
              <div className="print-summary grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ['الرصيد المرحّل قبل الفترة', data.opening_balance],
                  ['رصيد نهاية الفترة (كل الحركات)', data.closing_balance],
                  ['مدين النتائج المطابقة', data.totals.debit],
                  ['دائن النتائج المطابقة', data.totals.credit],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border p-3">
                    <p className="text-xs text-stone-500">{label}</p>
                    <b className="mt-1 block text-right" dir="ltr">
                      {formatMoney(value)}
                    </b>
                  </div>
                ))}
              </div>
              <p className="text-xs leading-6 text-stone-500">
                الأحدث أولًا. الرصيد بعد الحركة محسوب حسب التاريخ، ويشمل جميع
                الأنواع قبل تطبيق فلتر النوع. المدين يزيد رصيد الحساب والدائن
                ينقصه.
              </p>
              <MovementTable entries={data.entries} base={base} admin={admin} />
              <footer className="flex flex-wrap justify-between gap-3 border-t pt-3 text-xs text-stone-500">
                <span>
                  الصفحة {page} من {Math.max(1, data.pagination.total_pages)} ·
                  المعروض {data.entries.length} من {data.pagination.total} حركة
                </span>
                <span>
                  صافي النتائج المطابقة {formatMoney(data.totals.net)} · الطباعة
                  لهذه الصفحة فقط
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
