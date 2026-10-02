import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  accountsService,
  type AccountFinancialDetail,
  type EffectiveAccountStatement,
  type AccountMovementType,
} from '@/api';
import { useAuth } from '@/auth/useAuth';
import {
  apiMessages,
  formatMoney,
  formatOrderDate,
} from '@/components/rep/repOrderUtils';
import { AccountIdentityEditor, Balance, MovementTable } from './accountUi';
import {
  accountKindLabels,
  currentMonth,
  movementLabels,
} from './accountUiUtils';
import { OpeningPanel, DiscountPanel } from './AccountFinancialPanels';
export default function AccountDetailsPage() {
  const { id } = useParams();
  const accountId = Number(id);
  const { user } = useAuth();
  const admin = user?.role === 'Admin';
  const base = admin ? '/owner' : '/rep';
  const [params, setParams] = useSearchParams();
  const defaults = currentMonth();
  const from = params.get('from') ?? defaults.from,
    to = params.get('to') ?? defaults.to;
  const [data, setData] = useState<AccountFinancialDetail | null>(null);
  const [movements, setMovements] = useState<EffectiveAccountStatement | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState(false);
  function filter(key: string, value: string) {
    if (!value) return;
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.set(key, value);
      return n;
    });
  }
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError('');
    setMovements(null);
    Promise.all([
      accountsService.financialDetail(
        accountId,
        { from: from || undefined, to: to || undefined },
        c.signal,
      ),
      accountsService.statement(
        accountId,
        { from: from || undefined, to: to || undefined, page: 1, limit: 10 },
        c.signal,
      ),
    ])
      .then(([d, m]) => {
        setData(d);
        setMovements(m);
      })
      .catch((e) => {
        if (!c.signal.aborted) {
          setData(null);
          setError(
            apiMessages(
              e,
              'تعذر الوصول إلى تفاصيل الحساب. البيانات المالية للصناديق والبنوك متاحة للمدير فقط.',
            ).join('، '),
          );
        }
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [accountId, from, to, revision]);
  const changed = () => setRevision((v) => v + 1);
  return (
    <div dir="rtl" className="space-y-5 p-4 sm:p-6">
      <Link className="text-sm text-stone-500" to={`${base}/accounts`}>
        ← الحسابات
      </Link>
      {error && (
        <p role="alert" className="rep-error">
          {error}
        </p>
      )}
      {loading ? (
        <p className="p-8 text-center" role="status">
          جارٍ تحميل الحساب…
        </p>
      ) : (
        data && (
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-stone-500">
                  {data.account.account_number} ·{' '}
                  {accountKindLabels[data.account.kind]}
                </p>
                <h1 className="mt-1 text-2xl font-bold text-brand">
                  {data.account.name}
                </h1>
                {data.account.phone && (
                  <p className="mt-2 text-sm">{data.account.phone}</p>
                )}
                {data.account.notes && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-stone-500">
                    {data.account.notes}
                  </p>
                )}
                <p className="mt-2 text-xs text-stone-400">
                  تاريخ الإنشاء {formatOrderDate(data.account.created_at)}
                </p>
              </div>
              <button className="btn-outline" onClick={() => setEditing(true)}>
                تعديل البيانات
              </button>
            </header>
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border bg-white p-5">
                <p className="mb-3 text-sm text-stone-500">
                  الرصيد الحالي الإجمالي
                </p>
                <Balance
                  value={data.current_balance}
                  kind={data.account.kind}
                />
                <Link
                  className="mt-4 inline-block text-sm text-brand underline"
                  to={`${base}/accounts/${accountId}/statement?from=${from}&to=${to}`}
                >
                  الكشف الشامل ←
                </Link>
              </section>
              <OpeningPanel
                accountId={accountId}
                document={data.opening_balance}
                admin={admin}
                onChanged={changed}
              />
            </div>
            <section className="rounded-2xl border bg-white p-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-bold text-brand">ملخص الفترة</h2>
                <div className="flex flex-wrap gap-3">
                  <label className="text-xs text-stone-500">
                    من
                    <input
                      type="date"
                      className="rep-control"
                      value={from}
                      onChange={(e) => filter('from', e.target.value)}
                    />
                  </label>
                  <label className="text-xs text-stone-500">
                    إلى
                    <input
                      type="date"
                      className="rep-control"
                      value={to}
                      onChange={(e) => filter('to', e.target.value)}
                    />
                  </label>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['إجمالي المدين', data.period_summary.debit],
                  ['إجمالي الدائن', data.period_summary.credit],
                  ['صافي أثر الفترة', data.period_summary.net],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-stone-50 p-3">
                    <p className="text-xs text-stone-500">{label}</p>
                    <b dir="ltr" className="mt-1 block text-right">
                      {formatMoney(value)}
                    </b>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {data.period_summary.categories.map((c) => (
                  <Link
                    key={c.type}
                    className="rounded-xl border p-3 hover:bg-stone-50"
                    to={`${base}/accounts/${accountId}/statement?from=${from}&to=${to}&movement_type=${c.type}`}
                  >
                    <p className="text-sm font-bold">
                      {movementLabels[c.type as AccountMovementType] ?? c.type}{' '}
                      · {c.movement_count}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      مدين {formatMoney(c.debit)} · دائن {formatMoney(c.credit)}
                    </p>
                  </Link>
                ))}
              </div>
              {!data.period_summary.movement_count && (
                <p className="mt-4 text-sm text-stone-500">
                  لا توجد حركات في هذه الفترة.
                </p>
              )}
            </section>
            {data.account.kind === 'General' && (
              <>
                <nav
                  className="flex flex-wrap gap-2"
                  aria-label="عمليات الحساب"
                >
                  {(
                    [
                      'Sale',
                      'Purchase',
                      'SalesReturn',
                      'PurchaseReturn',
                      'Receipt',
                      'Disbursement',
                      'CheckMovement',
                      'AccountDiscount',
                    ] as const
                  ).map((type) => (
                    <Link
                      key={type}
                      className="btn-outline text-sm"
                      to={`${base}/accounts/${accountId}/statement?from=${from}&to=${to}&movement_type=${type}`}
                    >
                      {movementLabels[type]}
                    </Link>
                  ))}
                </nav>
                <DiscountPanel accountId={accountId} onChanged={changed} />
              </>
            )}
            {movements && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-brand">أحدث حركات الفترة</h2>
                  <Link
                    className="text-sm text-brand underline"
                    to={`${base}/accounts/${accountId}/statement?from=${from}&to=${to}`}
                  >
                    عرض الكشف الكامل
                  </Link>
                </div>
                <MovementTable
                  entries={movements.entries}
                  base={base}
                  admin={admin}
                />
              </section>
            )}
            {editing && (
              <AccountIdentityEditor
                account={data.account}
                admin={admin}
                onClose={() => setEditing(false)}
                onSaved={changed}
              />
            )}
          </>
        )
      )}
    </div>
  );
}
