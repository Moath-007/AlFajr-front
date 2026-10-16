import Select from '@/components/ui/Select';
import { renderToStaticMarkup } from 'react-dom/server';
import { createPortal } from 'react-dom';
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
} from '@/components/rep/repOrderUtils';
import { RepDateInput } from '@/components/rep/RepFormControls';
import './AccountStatementPage.css';
import { printA4Element } from '@/utils/printDocument';
import { MovementTable, Pager } from './accountUi';
import { currentMonth, movementLabels, balanceLabel, accountAmountColor } from './accountUiUtils';
export default function AccountStatementPage({accountId: suppliedId, embedded = false}:{accountId?:number;embedded?:boolean} = {}) {
  const { id } = useParams();
  const accountId = suppliedId ?? Number(id);
  const { user } = useAuth();
  const admin = user?.role === 'Admin',
    base = admin ? '/owner' : '/rep';
  const [params, setParams] = useSearchParams();
  const defaults = currentMonth();
  const from = params.get('from') ?? defaults.from,
    to = params.get('to') ?? defaults.to;
  const type = params.get('movement_type') ?? '';
  const search = params.get('search') ?? '';
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
          search: search || undefined,
          page,
          limit: 10,
        },
        c.signal,
      )
      .then(result => { if (!c.signal.aborted) setData(result); })
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
  }, [accountId, from, to, type, search, page]);
  async function print() {
    if (!data || printing) return;
    setPrinting(true);
    try {
      const query = { from: from || undefined, to: to || undefined, movement_type: type ? type as AccountMovementType : undefined, search: search || undefined, limit: 100 };
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
  const balance = (value: string) => <span className={'statement-signed-balance ' + (Number(value) === 0 ? 'text-stone-400' : 'text-stone-700')}><bdi dir="ltr" className="inline-flex items-baseline gap-1">{Number(value) < 0 && <span className="text-[1.3em] font-black leading-none">−</span>}{formatMoney(Math.abs(Number(value)))}</bdi><span className="text-xs font-semibold">{balanceLabel(value)}</span></span>;
  return <div className="account-statement-page" dir="rtl">
    <header className="statement-header"><div>{!embedded && <Link className="statement-back" to={`${base}/accounts/${accountId}`}>تفاصيل الحساب</Link>}{embedded ? <h2>حركات الصندوق وكشفه</h2> : <h1>كشف الحساب</h1>}</div><button disabled={loading || !data || printing} className="btn-outline min-h-11" onClick={() => void print()}>{printing ? 'جارٍ تجهيز الطباعة…' : 'طباعة الكشف كاملًا / PDF'}</button></header>

    {data && <section className="statement-overview" aria-label="ملخص الحساب">
      <div className="statement-identity"><div><h2>{data.account.name}</h2><p><bdi dir="ltr">{data.account.account_number}</bdi>{data.account.group && <span>{data.account.group.name}</span>}{data.account.phone && <bdi dir="ltr">{data.account.phone}</bdi>}</p></div><div className="statement-current"><span>رصيد الحساب الآن</span>{balance(data.current_balance)}</div></div>
      <dl className="statement-summary">
        <div><dt>قبل بداية الفترة</dt><dd>{balance(data.opening_balance)}</dd></div>
        <div><dt>نهاية الفترة</dt><dd>{balance(data.closing_balance)}</dd></div>
        <div><dt>مجموع مدين الفترة</dt><dd><bdi dir="ltr" className={accountAmountColor(data.period_summary.debit, 'debit')}>{formatMoney(data.period_summary.debit)}</bdi></dd></div>
        <div><dt>مجموع دائن الفترة</dt><dd><bdi dir="ltr" className={accountAmountColor(data.period_summary.credit, 'credit')}>{formatMoney(data.period_summary.credit)}</bdi></dd></div>
      </dl>
    </section>}

    <section className="statement-filters" aria-label="تصفية حركات الحساب">
      <label><span className="rep-label">البحث في الحركات</span><input type="search" className="rep-control" value={search} onChange={e => filter('search', e.target.value)} placeholder="رقم المستند أو الوصف" /></label>
      <RepDateInput label="من تاريخ" value={from} max={to || undefined} onChange={value => filter('from', value)} />
      <RepDateInput label="إلى تاريخ" value={to} min={from || undefined} onChange={value => filter('to', value)} />
      <Select label="نوع الحركة" value={type} onChange={value => filter('movement_type', value)} options={[{ value: '', label: 'كل الحركات' }, ...Object.entries(movementLabels).map(([value, label]) => ({ value, label }))]} />
    </section>
    {error && <p role="alert" className="rep-error">{error}</p>}
    {loading ? <p role="status" className="p-6 text-center text-stone-500">جارٍ تحميل الكشف…</p> : data && <>
      <div className="statement-table-heading"><span>{data.pagination.total} حركة مطابقة · من الأحدث إلى الأقدم</span><details><summary>كيف تقرأ الكشف؟</summary><p>المدين يزيد رصيد الحساب، والدائن يقلله. الرصيد بعد كل حركة يشمل كل أنواع الحركات حتى تاريخها، حتى عند اختيار نوع محدد. مجاميع المدين والدائن تخص الفترة كاملة؛ البحث ونوع الحركة يخصان الصفوف المطابقة فقط. تُعرض الافتتاحيات والمسامحات والمرتجعات بحالتها الفعالة؛ بقية الحركات تشمل الأصل والتصحيحات والإلغاء.</p></details></div>
      <MovementTable kind={data.account.kind} entries={data.entries} base={base} admin={admin} />
      <div className="statement-results">
        {(search || type) && <p className="text-xs text-stone-500">مجاميع النتائج المطابقة: مدين <bdi dir="ltr">{formatMoney(data.totals.debit)}</bdi> · دائن <bdi dir="ltr">{formatMoney(data.totals.credit)}</bdi></p>}
        {createPortal(<div className="statement-floating-pagination" dir="rtl"><Pager floating page={page} pages={data.pagination.total_pages} total={data.pagination.total} onPage={value => filter('page', String(value))} /></div>, document.body)}
      </div>
    </>}
  </div>;
}
