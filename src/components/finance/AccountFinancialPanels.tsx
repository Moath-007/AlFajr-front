import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useEffect, useRef, useState } from 'react';
import {
  accountsService,
  type AccountDiscountInput,
  type AccountFinancialDocument,
  type OpeningBalanceInput,
  type PaginationResponseDto,
} from '@/api';
import { AccountFinancialFields } from './AccountFinancialFields';
import Modal from '@/components/ui/Modal';
import {
  apiMessages,
  formatMoney,
  formatOrderDate,
} from '@/components/rep/repOrderUtils';
import { FinancialConfirmation, Pager } from './accountUi';
import { businessToday, financialDirectionLabels as directionLabels } from './accountUiUtils';
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
            if (!date) { setError('اختر تاريخ المستند.'); return; }
            setConfirm(true);
          }}
        >
          <AccountFinancialFields kind={kind} amount={amount} direction={direction} date={date} notes={notes} busy={busy}
            onAmount={setAmount} onDirection={setDirection} onDate={setDate} onNotes={setNotes} />
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
  onFailureRefresh,
  onSuccess,
  accountId,
  accountLabel,
  document,
  admin,
  onChanged,
}: {
  accountId: number;
  accountLabel?: string;
  onSuccess?: (message:string)=>void;
  onFailureRefresh?: ()=>void;
  document: AccountFinancialDocument | null;
  admin: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cancelling = useRef(false);
  const [notice, setNotice] = useState('');
  async function cancelDocument() {
    if (cancelling.current) return;
    cancelling.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await accountsService.cancelOpening(accountId);
      const message='تم حذف الرصيد الافتتاحي وعكس أثره المالي؛ بقي المستند محفوظاً في السجل.';
      setNotice(message);
      onSuccess?.(message);
      setCancel(false);
      onChanged();
    } catch (e) {
      setError(apiMessages(e).join('، '));
      onFailureRefresh?.();
    } finally {
      cancelling.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="rounded-2xl border bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-brand">الرصيد الافتتاحي</h2>
        {admin && (!document || document.status === 'Completed') && (
          <div className="flex flex-wrap gap-1 text-sm">
            <button className="btn-ghost min-h-11 text-brand" onClick={() => setEditing(true)}>
              {document ? 'تعديل' : 'إضافة'}
            </button>
            {document && (
              <button className="btn-ghost min-h-11 text-red-700 hover:bg-red-50" onClick={() => {setError('');setCancel(true);}}>
                حذف الرصيد الافتتاحي
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
      {notice && <p role="status" className="text-emerald-700">{notice}</p>}
      {editing && (
        <FinancialDocumentEditor
          accountId={accountId}
          kind="Opening"
          document={document}
          onClose={() => setEditing(false)}
          onSaved={onChanged}
        />
      )}
      <ConfirmDialog open={cancel} confirmDisabled={document?.status === 'Cancelled'} loading={busy} title="تأكيد حذف الرصيد الافتتاحي" message="هل أنت متأكد من حذف الرصيد الافتتاحي لهذا الحساب؟" confirmLabel="تأكيد الحذف" cancelLabel="إلغاء"
        details={<>{accountLabel && <p className="font-bold">{accountLabel}</p>}<p>سيُلغى المستند ويُعكس أثره المالي مع الاحتفاظ بالسجل.</p>{error && <p role="alert" className="rep-error">{error}</p>}</>}
        onClose={() => setCancel(false)} onConfirm={() => void cancelDocument()} />
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
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
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
                      className="btn-ghost min-h-11 text-brand"
                      onClick={() => setEditor({ document: d })}
                    >
                      تعديل
                    </button>
                    <button
                      className="btn-ghost min-h-11 text-red-700 hover:bg-red-50"
                      onClick={() => setAction({ document: d, kind: 'cancel' })}
                    >
                      إلغاء
                    </button>
                  </>
                )}
                <button
                  className="btn-ghost min-h-11 text-red-700 hover:bg-red-50"
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
