import { useEffect, useState } from 'react';
import {
  accountsService,
  type AccountDiscountInput,
  type AccountFinancialDocument,
  type OpeningBalanceInput,
  type PaginationResponseDto,
} from '@/api';
import Modal from '@/components/ui/Modal';
import {
  apiMessages,
  formatMoney,
  formatOrderDate,
} from '@/components/rep/repOrderUtils';
import { FinancialConfirmation, Pager } from './accountUi';
import { businessToday } from './accountUiUtils';
const directionLabels = {
  Debit: 'مستحق لنا على الحساب (مدين)',
  Credit: 'مستحق للحساب علينا (دائن)',
  ReduceReceivable: 'تخفيض ما يدين به الحساب لنا',
  ReducePayable: 'تخفيض ما ندين به للحساب',
};
export function DocumentSummary({
  document,
}: {
  document: AccountFinancialDocument;
}) {
  return (
    <div className="space-y-1 text-sm">
      <p>
        <b>{formatMoney(document.amount)}</b> ·{' '}
        {directionLabels[document.direction]}
      </p>
      <p className="text-stone-500">
        {formatOrderDate(document.business_date)} ·{' '}
        <span
          className={
            document.status === 'Completed'
              ? 'text-emerald-700'
              : 'text-red-700'
          }
        >
          {document.status === 'Completed' ? 'فعال' : 'ملغى'}
        </span>
      </p>
      {document.notes && (
        <p className="whitespace-pre-wrap text-stone-500">{document.notes}</p>
      )}
    </div>
  );
}
export function FinancialDocumentEditor({
  accountId,
  kind,
  document,
  onClose,
  onSaved,
}: {
  accountId: number;
  kind: 'Opening' | 'Discount';
  document: AccountFinancialDocument | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(document?.amount ?? '');
  const [direction, setDirection] = useState<
    AccountFinancialDocument['direction']
  >(document?.direction ?? (kind === 'Opening' ? 'Debit' : 'ReduceReceivable'));
  const [date, setDate] = useState(document?.business_date ?? businessToday());
  const [notes, setNotes] = useState(document?.notes ?? '');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    setBusy(true);
    setError('');
    try {
      if (kind === 'Opening') {
        const input: OpeningBalanceInput = {
          amount: Number(amount),
          direction: direction as OpeningBalanceInput['direction'],
          business_date: date,
          notes,
        };
        if (document) await accountsService.editOpening(accountId, input);
        else await accountsService.createOpening(accountId, input);
      } else {
        const input: AccountDiscountInput = {
          amount: Number(amount),
          direction: direction as AccountDiscountInput['direction'],
          business_date: date,
          notes,
        };
        if (document)
          await accountsService.editDiscount(document.document_id, input);
        else await accountsService.createDiscount(accountId, input);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(apiMessages(e).join('، '));
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }
  const label = kind === 'Opening' ? 'الرصيد الافتتاحي' : 'خصم على الحساب';
  return (
    <>
      <Modal
        open
        title={`${document ? 'تعديل' : 'إضافة'} ${label}`}
        onClose={busy ? () => undefined : onClose}
        size="sm"
      >
        <form
          dir="rtl"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setConfirm(true);
          }}
        >
          <label className="block">
            المبلغ (₪)
            <input
              required
              type="number"
              min={kind === 'Opening' ? 0 : 0.01}
              step="0.01"
              className="rep-control"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="block">
            الاتجاه
            <select
              className="rep-control"
              aria-label="الاتجاه"
              value={direction}
              onChange={(e) =>
                setDirection(
                  e.target.value as AccountFinancialDocument['direction'],
                )
              }
            >
              {(kind === 'Opening'
                ? (['Debit', 'Credit'] as const)
                : (['ReduceReceivable', 'ReducePayable'] as const)
              ).map((d) => (
                <option key={d} value={d}>
                  {directionLabels[d]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            تاريخ المستند
            <input
              required
              type="date"
              className="rep-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="block">
            السبب / ملاحظات
            <textarea
              rows={3}
              className="rep-control"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="rep-error">
              {error}
            </p>
          )}
          <button className="btn-primary w-full" disabled={busy}>
            مراجعة وحفظ
          </button>
        </form>
      </Modal>
      <FinancialConfirmation
        action={
          confirm
            ? `${document ? 'تعديل' : 'تسجيل'} ${label} بقيمة ${formatMoney(amount)}، ${directionLabels[direction]} بتاريخ ${formatOrderDate(date)}؟`
            : null
        }
        busy={busy}
        onClose={() => setConfirm(false)}
        onConfirm={() => void save()}
      />
    </>
  );
}
export function OpeningPanel({
  accountId,
  document,
  admin,
  onChanged,
}: {
  accountId: number;
  document: AccountFinancialDocument | null;
  admin: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function cancelDocument() {
    setBusy(true);
    try {
      await accountsService.cancelOpening(accountId);
      setCancel(false);
      onChanged();
    } catch (e) {
      setError(apiMessages(e).join('، '));
      setCancel(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-2xl border bg-white p-5">
      <div className="mb-3 flex justify-between gap-3">
        <h2 className="font-bold text-brand">الرصيد الافتتاحي</h2>
        {admin && (!document || document.status === 'Completed') && (
          <div className="flex gap-3 text-sm">
            <button className="text-brand" onClick={() => setEditing(true)}>
              {document ? 'تعديل' : 'إضافة'}
            </button>
            {document && (
              <button className="text-red-700" onClick={() => setCancel(true)}>
                إلغاء المستند
              </button>
            )}
          </div>
        )}
      </div>
      {document ? (
        <DocumentSummary document={document} />
      ) : (
        <p className="text-sm text-stone-500">لم يُسجل رصيد افتتاحي.</p>
      )}
      {error && (
        <p role="alert" className="rep-error">
          {error}
        </p>
      )}
      {editing && (
        <FinancialDocumentEditor
          accountId={accountId}
          kind="Opening"
          document={document}
          onClose={() => setEditing(false)}
          onSaved={onChanged}
        />
      )}
      <FinancialConfirmation
        action={
          cancel
            ? 'إلغاء الرصيد الافتتاحي وعكس أثره المالي؟ يبقى المستند محفوظًا ولا يمكن استعادته.'
            : null
        }
        busy={busy}
        onClose={() => setCancel(false)}
        onConfirm={() => void cancelDocument()}
      />
    </section>
  );
}
export function DiscountPanel({
  accountId,
  onChanged,
}: {
  accountId: number;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<AccountFinancialDocument[]>([]);
  const [pagination, setPagination] = useState<PaginationResponseDto | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<{
    document: AccountFinancialDocument | null;
  } | null>(null);
  const [action, setAction] = useState<{
    document: AccountFinancialDocument;
    kind: 'cancel' | 'delete';
  } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError('');
    accountsService
      .discounts(accountId, { page, limit: 10 }, c.signal)
      .then((r) => {
        setItems(r.items);
        setPagination(r.pagination);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(apiMessages(e).join('، '));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [accountId, page, revision]);
  function changed() {
    setRevision((v) => v + 1);
    onChanged();
  }
  async function mutate() {
    if (!action) return;
    setBusy(true);
    try {
      if (action.kind === 'cancel')
        await accountsService.cancelDiscount(action.document.document_id);
      else await accountsService.deleteDiscount(action.document.document_id);
      setAction(null);
      changed();
    } catch (e) {
      setError(apiMessages(e).join('، '));
      setAction(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-2xl border bg-white p-5">
      <header className="mb-4 flex justify-between gap-3">
        <h2 className="font-bold text-brand">خصومات على الحساب</h2>
        <button
          className="btn-outline"
          onClick={() => setEditor({ document: null })}
        >
          خصم جديد
        </button>
      </header>
      {error && (
        <p role="alert" className="rep-error">
          {error}
        </p>
      )}
      {loading ? (
        <p className="text-stone-500" role="status">
          جارٍ التحميل…
        </p>
      ) : items.length ? (
        <div className="space-y-3">
          {items.map((d) => (
            <div
              key={d.document_id}
              className="flex flex-wrap justify-between gap-3 border-b pb-3"
            >
              <div>
                <p className="mb-1 text-xs text-stone-400">
                  خصم #{d.document_id}
                </p>
                <DocumentSummary document={d} />
              </div>
              <div className="flex items-start gap-3 text-sm">
                {d.status === 'Completed' && (
                  <>
                    <button
                      className="text-brand"
                      onClick={() => setEditor({ document: d })}
                    >
                      تعديل
                    </button>
                    <button
                      className="text-red-700"
                      onClick={() => setAction({ document: d, kind: 'cancel' })}
                    >
                      إلغاء
                    </button>
                  </>
                )}
                <button
                  className="text-red-700"
                  onClick={() => setAction({ document: d, kind: 'delete' })}
                >
                  حذف نهائي
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-stone-500">لا توجد خصومات على الحساب.</p>
      )}
      {pagination && (
        <Pager
          page={page}
          pages={pagination.total_pages}
          total={pagination.total}
          onPage={setPage}
        />
      )}
      <FinancialConfirmation
        action={
          action
            ? `${action.kind === 'cancel' ? 'إلغاء' : 'حذف نهائي'} خصم #${action.document.document_id}؟ ${action.document.status === 'Completed' ? 'سيتم عكس أثره المالي.' : ''}`
            : null
        }
        busy={busy}
        onClose={() => setAction(null)}
        onConfirm={() => void mutate()}
      />
      {editor && (
        <FinancialDocumentEditor
          accountId={accountId}
          kind="Discount"
          document={editor.document}
          onClose={() => setEditor(null)}
          onSaved={changed}
        />
      )}
    </section>
  );
}
