import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  accountsService,
  type AccountIdentity,
  type AccountIdentityList,
  type UserAccountKind,
} from '@/api';
import { useAuth } from '@/auth/useAuth';
import { apiMessages, formatOrderDate } from '@/components/rep/repOrderUtils';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { AccountIdentityEditor, Pager } from './accountUi';
import { accountKindLabels } from './accountUiUtils';
export default function AccountsPage() {
  const { user } = useAuth();
  const admin = user?.role === 'Admin';
  const base = admin ? '/owner' : '/rep';
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const type = (params.get('type') ?? 'All') as 'All' | UserAccountKind;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [data, setData] = useState<AccountIdentityList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<{
    account: AccountIdentity | null;
  } | null>(null);
  const [deleting, setDeleting] = useState<AccountIdentity | null>(null);
  const [busy, setBusy] = useState(false);
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
    setLoading(true);
    setError('');
    accountsService
      .list({ search, type, page, limit: 20 }, c.signal)
      .then(setData)
      .catch((e) => {
        if (!c.signal.aborted)
          setError(apiMessages(e, 'تعذر تحميل الحسابات').join('، '));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [search, type, page, revision]);
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await accountsService.remove(deleting.account_id);
      setDeleting(null);
      setRevision((v) => v + 1);
    } catch (e) {
      setError(apiMessages(e).join('، '));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div dir="rtl" className="space-y-5 p-4 sm:p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand">الحسابات</h1>
          <p className="mt-1 text-sm text-stone-500">
            الحسابات العامة والصناديق والبنوك
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setEditor({ account: null })}
        >
          حساب جديد
        </button>
      </header>
      <div className="flex flex-wrap gap-3">
        <input
          className="rep-control flex-1 min-w-48"
          aria-label="بحث الحسابات"
          placeholder="رقم الحساب أو الاسم أو الهاتف"
          value={search}
          onChange={(e) => filter('search', e.target.value)}
        />
        <select
          aria-label="نوع الحساب"
          className="rep-control sm:w-44"
          value={type}
          onChange={(e) => filter('type', e.target.value)}
        >
          <option value="All">كل الأنواع</option>
          {Object.entries(accountKindLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p role="alert" className="rep-error">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="p-8 text-center text-stone-500">
          جارٍ تحميل الحسابات…
        </p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data?.items.map((a) => (
              <section
                key={a.account_id}
                className="rounded-2xl border border-stone-200 bg-white p-4"
              >
                <div className="flex justify-between gap-3">
                  <span dir="ltr" className="font-mono text-xs text-stone-500">
                    {a.account_number}
                  </span>
                  <span className="rounded-full bg-stone-100 px-2 py-1 text-xs">
                    {accountKindLabels[a.kind]}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-bold text-brand">
                  {admin || a.kind === 'General' ? (
                    <Link to={`${base}/accounts/${a.account_id}`}>
                      {a.name}
                    </Link>
                  ) : (
                    a.name
                  )}
                </h2>
                {a.kind === 'General' && a.phone && (
                  <p
                    dir="ltr"
                    className="mt-1 text-right text-sm text-stone-500"
                  >
                    {a.phone}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                  <span className="text-xs text-stone-400">
                    أُنشئ {formatOrderDate(a.created_at)}
                  </span>
                  {(admin || a.kind === 'General') && (
                    <div className="flex gap-3 text-sm">
                      <button
                        className="text-brand"
                        onClick={() => setEditor({ account: a })}
                      >
                        تعديل
                      </button>
                      {admin && (
                        <button
                          className="text-red-700"
                          onClick={() => setDeleting(a)}
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {!admin && a.kind !== 'General' && (
                  <p className="mt-2 text-xs text-stone-400">
                    بيانات الحساب فقط
                  </p>
                )}
              </section>
            ))}
          </div>
          {data?.items.length === 0 && (
            <p className="p-8 text-center text-stone-500">
              لا توجد حسابات مطابقة.
            </p>
          )}
          {data && (
            <Pager
              page={page}
              pages={data.pagination.total_pages}
              total={data.pagination.total}
              onPage={(p) => filter('page', String(p))}
            />
          )}
        </>
      )}
      {editor && (
        <AccountIdentityEditor
          account={editor.account}
          admin={admin}
          onClose={() => setEditor(null)}
          onSaved={() => setRevision((v) => v + 1)}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        severity="normal"
        title="حذف الحساب"
        message={`هل تريد حذف ${deleting?.name ?? ''}؟ الحذف متاح فقط للحساب الذي ليس له أي تاريخ مالي أو حركة مرتبطة.`}
        loading={busy}
        onClose={() => setDeleting(null)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
