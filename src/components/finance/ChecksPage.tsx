import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { checksService, currenciesService, ledgerService, type CurrencyDto, type IncomingCheckMovementAction, type IncomingCheckMovementDto, type LedgerAccount, type ManagedCheck, type ManagedCheckEditDto, type ManagedCheckEvent, type ManagedCheckLocation, type ManagedChecksQuery, type ManagedChecksResponse } from '@/api';
import { ApiError } from '@/api/errors';
import { apiMessages, formatOrderDate, formatOrderDateTime } from '@/components/rep/repOrderUtils';
import { RepDateInput, RepSelect } from '@/components/rep/RepFormControls';
import AccountPicker from './AccountPicker';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const locationLabels: Record<ManagedCheckLocation, string> = {
  TREASURY: 'الخزنة',
  BANK: 'البنك',
  COLLECTION: 'برسم التحصيل',
  ENDORSED_PARTY: 'مجيّر لطرف',
  SOURCE_PARTY: 'لدى المصدر',
  CASHED: 'مصروف نقدًا',
  CANCELLED: 'ملغى',
  ISSUED: 'صادر',
  CLEARED: 'صُرف من البنك',
  RETURNED_OUTGOING: 'شيك صادر راجع',
};
const locations = Object.entries(locationLabels) as Array<[ManagedCheckLocation, string]>;
const number = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed.toLocaleString('ar-EG-u-nu-latn', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : value;
};
const date = (value: string) => formatOrderDate(value.slice(0, 10));
const movementLabels: Record<IncomingCheckMovementAction, string> = {
  DEPOSITED: 'إيداع في البنك',
  SENT_TO_COLLECTION: 'إرسال للتحصيل',
  RETURNED_FROM_BANK: 'إرجاع من البنك إلى الخزنة',
  ENDORSED: 'تجيير لطرف',
  ENDORSEMENT_RETURNED: 'إرجاع من الطرف إلى الخزنة',
  RETURNED_TO_SOURCE: 'إرجاع إلى مصدر الشيك',
  RETRIEVED_FROM_SOURCE: 'استرداد من المصدر إلى الخزنة',
  CASHED: 'صرف الشيك نقدًا',
};
const eventLabels: Record<string, string> = {
  ...movementLabels,
  RECEIVED: 'استلام الشيك',
  OUTGOING_ISSUED: 'إصدار شيك صادر',
  OUTGOING_CLEARED: 'تأكيد صرف الشيك الصادر',
  OUTGOING_RETURNED: 'إرجاع الشيك الصادر',
  PAYMENT_CANCELLED: 'إلغاء الدفعة المرتبطة بالشيك',
  DETAILS_EDITED: 'تعديل بيانات الشيك',
  MOVEMENT_CANCELLED: 'التراجع عن حركة',
};
const undoableActions = new Set<string>([...Object.keys(movementLabels), 'OUTGOING_CLEARED', 'OUTGOING_RETURNED', 'PAYMENT_CANCELLED']);
const latestBusinessEvent = (check: ManagedCheck) => [...check.events]
  .sort((left, right) => right.check_event_id - left.check_event_id)
  .find((item) => !item.cancelled_at && !['DETAILS_EDITED', 'MOVEMENT_CANCELLED'].includes(item.action));
const undoableEvent = (check: ManagedCheck): ManagedCheckEvent | null => {
  const event = latestBusinessEvent(check);
  return event && undoableActions.has(event.action) && !event.cancels_event_id && event.to_location === check.location ? event : null;
};
type OutgoingAction = 'clear' | 'return';
type CheckReview = { kind: 'movement' | 'undo' | 'outgoing'; title: string; message: string; details: string[]; destructive: boolean };
const availableOutgoingActions = (check: ManagedCheck): OutgoingAction[] => {
  if (check.direction !== 'Outgoing') return [];
  if (check.location === 'ISSUED') return ['clear', 'return'];
  if (check.location === 'CLEARED') return ['return'];
  return [];
};
const outgoingLabels: Record<OutgoingAction, string> = { clear: 'تأكيد صرف الشيك الصادر', return: 'إرجاع الشيك الصادر' };
const availableMovements = (check: ManagedCheck): IncomingCheckMovementAction[] => {
  if (check.direction !== 'Incoming') return [];
  if (check.location === 'TREASURY') return ['DEPOSITED', 'SENT_TO_COLLECTION', 'ENDORSED', 'RETURNED_TO_SOURCE', 'CASHED'];
  if ((check.location === 'BANK' || check.location === 'COLLECTION') && check.current_bank_account_id) return ['RETURNED_FROM_BANK'];
  if (check.location === 'ENDORSED_PARTY' && check.current_party_account_id) return ['ENDORSEMENT_RETURNED'];
  if (check.location === 'SOURCE_PARTY') return ['RETRIEVED_FROM_SOURCE'];
  return [];
};
const lastBusinessDate = (check: ManagedCheck) => latestBusinessEvent(check)?.operation_date.slice(0, 10);
const businessToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hebron', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
};
const firstValidOperationDate = (check: ManagedCheck, action?: IncomingCheckMovementAction) =>
  [businessToday(), lastBusinessDate(check) ?? '', action === 'DEPOSITED' ? check.due_date.slice(0, 10) : ''].sort().at(-1)!;
const bankIdentifiers = (check: ManagedCheck) => {
  const received = check.events.find((event) => ['RECEIVED', 'OUTGOING_ISSUED'].includes(event.action));
  const initial = received?.details && typeof received.details === 'object' && !Array.isArray(received.details)
    ? received.details as Record<string, unknown> : {};
  const edits = [...check.events].reverse().filter((event) => event.action === 'DETAILS_EDITED' && event.details && typeof event.details === 'object' && !Array.isArray(event.details))
    .map((event) => event.details as Record<string, unknown>);
  const value = (key: string) => {
    const updated = edits.find((details) => Object.prototype.hasOwnProperty.call(details, key));
    const raw = updated ? updated[key] : initial[key];
    return typeof raw === 'string' && raw.trim() ? raw : '—';
  };
  return { bankNumber: value('bank_number'), branchNumber: value('branch_number'), accountNumber: value('account_number') };
};

export default function ChecksPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isDetailPage = id !== undefined;
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState<ManagedChecksQuery>({ page: 1, limit: 20 });
  const [response, setResponse] = useState<ManagedChecksResponse | null>(null);
  const [currencies, setCurrencies] = useState<CurrencyDto[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [accountsError, setAccountsError] = useState('');
  const [currencyError, setCurrencyError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const value = Number(id);
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  });
  const [selected, setSelected] = useState<ManagedCheck | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editNumber, setEditNumber] = useState('');
  const [editBankNumber, setEditBankNumber] = useState('');
  const [editBranchNumber, setEditBranchNumber] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCurrencyId, setEditCurrencyId] = useState('');
  const [editRate, setEditRate] = useState('');
  const [editSourceId, setEditSourceId] = useState<number | null>(null);
  const [editBankId, setEditBankId] = useState<number | null>(null);
  const [editReceivedDate, setEditReceivedDate] = useState('');
  const [editPaymentNotes, setEditPaymentNotes] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editFeedback, setEditFeedback] = useState('');
  const [movementAction, setMovementAction] = useState<IncomingCheckMovementAction | null>(null);
  const [movementDate, setMovementDate] = useState('');
  const [movementBankId, setMovementBankId] = useState<number | null>(null);
  const [movementCashId, setMovementCashId] = useState<number | null>(null);
  const [movementPartyId, setMovementPartyId] = useState<number | null>(null);
  const [movementNotes, setMovementNotes] = useState('');
  const [movementSaving, setMovementSaving] = useState(false);
  const [movementError, setMovementError] = useState('');
  const movementInFlight = useRef(false);
  const [undoEventId, setUndoEventId] = useState<number | null>(null);
  const [undoDate, setUndoDate] = useState('');
  const [undoReason, setUndoReason] = useState('');
  const [undoSaving, setUndoSaving] = useState(false);
  const [undoError, setUndoError] = useState('');
  const undoInFlight = useRef(false);
  const [outgoingAction, setOutgoingAction] = useState<OutgoingAction | null>(null);
  const [outgoingDate, setOutgoingDate] = useState('');
  const [review, setReview] = useState<CheckReview | null>(null);
  const [outgoingSaving, setOutgoingSaving] = useState(false);
  const [outgoingError, setOutgoingError] = useState('');
  const outgoingInFlight = useRef(false);

  useEffect(() => {
    const value = Number(id);
    setSelectedId(Number.isSafeInteger(value) && value > 0 ? value : null);
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const search = searchInput.trim() || undefined;
      setQuery((current) => current.search === search ? current : { ...current, search, page: 1 });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (isDetailPage) return;
    const controller = new AbortController();
    setLoading(true);
    setResponse(null);
    setError('');
    checksService.list(query, controller.signal).then(setResponse).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(apiMessages(reason, 'تعذر تحميل الشيكات.').join('، '));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, revision, isDetailPage]);

  useEffect(() => {
    const controller = new AbortController();
    currenciesService.list(controller.signal).then((result) => {
      setCurrencies(Array.isArray(result) ? result : result.items ?? result.currencies ?? []);
      setCurrencyError('');
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setCurrencyError(apiMessages(reason, 'تعذر تحميل العملات للفلترة.').join('، '));
    });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    const controller = new AbortController();
    ledgerService.accounts(controller.signal).then((result) => {
      setAccounts(result);
      setAccountsError('');
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setAccountsError(apiMessages(reason, 'تعذر تحميل الحسابات البنكية والجهات.').join('، '));
    });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    if (selectedId === null) { setSelected(null); setDetailsError(''); return; }
    const controller = new AbortController();
    setSelected(null);
    setDetailsLoading(true);
    setDetailsError('');
    checksService.details(selectedId, controller.signal).then(setSelected).catch((reason: unknown) => {
      if (!controller.signal.aborted) setDetailsError(apiMessages(reason, 'تعذر تحميل تفاصيل الشيك.').join('، '));
    }).finally(() => { if (!controller.signal.aborted) setDetailsLoading(false); });
    return () => controller.abort();
  }, [selectedId, revision]);

  const resetSelection = () => { setSelectedId(null); setSelected(null); setEditing(false); setEditError(''); setEditFeedback(''); setMovementAction(null); setMovementError(''); setUndoEventId(null); setUndoError(''); setOutgoingAction(null); setOutgoingError(''); };
  const startEdit = (check: ManagedCheck) => {
    setMovementAction(null);
    setUndoEventId(null);
    setOutgoingAction(null);
    setEditNumber(check.number);
    const identifiers = bankIdentifiers(check);
    setEditBankNumber(identifiers.bankNumber === '—' ? '' : identifiers.bankNumber);
    setEditBranchNumber(identifiers.branchNumber === '—' ? '' : identifiers.branchNumber);
    setEditAccountNumber(identifiers.accountNumber === '—' ? '' : identifiers.accountNumber);
    setEditAmount(check.original_amount);
    setEditCurrencyId(String(check.currency_id));
    setEditRate(check.exchange_rate);
    setEditSourceId(check.source_account_id);
    setEditBankId(check.current_bank_account_id);
    setEditReceivedDate(check.received_date.slice(0, 10));
    setEditPaymentNotes(check.payments.notes ?? '');
    setEditDueDate(check.due_date.slice(0, 10));
    setEditNote('');
    setEditError('');
    setEditFeedback('');
    setEditing(true);
  };
  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || editSaving) return;
    const number = editNumber.trim();
    if (!number) { setEditError('رقم الشيك مطلوب.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editDueDate)) { setEditError('اختر تاريخ استحقاق صالحًا.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editReceivedDate)) { setEditError('اختر تاريخ استلام صالحًا.'); return; }
    if (!/^\d+(?:\.\d{1,2})?$/.test(editAmount) || Number(editAmount) <= 0) { setEditError('أدخل مبلغًا صالحًا.'); return; }
    if (!/^\d+(?:\.\d{1,6})?$/.test(editRate) || Number(editRate) <= 0) { setEditError('أدخل سعر صرف صالحًا.'); return; }
    if (!editCurrencyId || !editSourceId || selected.direction === 'Outgoing' && !editBankId) { setEditError('اختر العملة والحساب المرتبط والبنك للشيك الصادر.'); return; }
    const input: ManagedCheckEditDto = {
      number,
      bank_number: editBankNumber.trim(),
      branch_number: editBranchNumber.trim(),
      account_number: editAccountNumber.trim(),
      amount: editAmount,
      currency_id: Number(editCurrencyId),
      exchange_rate: editRate,
      source_account_id: editSourceId,
      ...(selected.direction === 'Outgoing' && editBankId ? { bank_account_id: editBankId } : {}),
      received_date: editReceivedDate,
      payment_notes: editPaymentNotes.trim(),
      due_date: editDueDate,
      ...(editNote.trim() ? { notes: editNote.trim() } : {}),
    };
    setEditSaving(true);
    setEditError('');
    setEditFeedback('');
    try {
      await checksService.edit(selected.managed_check_id, input);
      setEditing(false);
      setSelected(null);
      setEditFeedback('حُفظت بيانات الشيك.');
      setRevision((value) => value + 1);
    } catch (reason) {
      const messages = reason instanceof ApiError ? reason.messages : [];
      const moved = messages.some((message) => message.includes('تغيّر موقع الشيك'));
      const missing = reason instanceof ApiError && reason.status === 404;
      if (moved || missing) {
        setEditing(false);
        setSelected(null);
        setEditFeedback(missing ? 'الشيك غير موجود. تم تحديث القائمة.' : 'تغيّر موقع الشيك؛ يجب أن يكون في الخزنة لتعديل بياناته. تم تحديث العرض.');
        if (missing) navigate('/owner/checks');
        setRevision((value) => value + 1);
      } else if (reason instanceof ApiError && reason.status === 403) {
        setEditError('ليس لديك صلاحية تعديل الشيك.');
      } else if (messages.some((message) => message.includes('تاريخ العملية غير صالح'))) {
        setEditError('تاريخ الاستحقاق غير صالح.');
      } else {
        setEditError(apiMessages(reason, 'تعذر حفظ بيانات الشيك.').join('، '));
      }
    } finally {
      setEditSaving(false);
    }
  };
  const amountLabel = (check: ManagedCheck) => number(check.original_amount) + ' ' +
    (check.payments.currencies?.code ?? currencies.find((item) => item.currency_id === check.currency_id)?.code ?? ('عملة #' + check.currency_id));
  const sourceLabel = (check: ManagedCheck) => check.source_account.name;
  const openMovement = (action: IncomingCheckMovementAction) => {
    if (!selected || !availableMovements(selected).includes(action)) return;
    setEditing(false);
    setUndoEventId(null);
    setOutgoingAction(null);
    setMovementAction(action);
    setMovementDate(firstValidOperationDate(selected, action));
    setMovementBankId(null);
    setMovementCashId(null);
    setMovementPartyId(null);
    setMovementNotes('');
    setMovementError('');
    setEditFeedback('');
  };
  const saveMovement = async (event?: FormEvent<HTMLFormElement>, confirmed = false) => {
    event?.preventDefault();
    if (!selected || !movementAction || movementInFlight.current || !availableMovements(selected).includes(movementAction)) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(movementDate)) { setMovementError('اختر تاريخ عملية صالحًا.'); return; }
    const lastDate = lastBusinessDate(selected);
    if (lastDate && movementDate < lastDate) { setMovementError('تاريخ العملية يسبق آخر حركة فعالة للشيك. اختر التاريخ نفسه أو تاريخًا لاحقًا.'); return; }
    if (movementAction === 'DEPOSITED' && movementDate < selected.due_date.slice(0, 10)) {
      setMovementError('لا يمكن إيداع الشيك قبل تاريخ استحقاقه. يمكنك إرساله للتحصيل.'); return;
    }
    const needsBank = movementAction === 'DEPOSITED' || movementAction === 'SENT_TO_COLLECTION';
    const needsCash = movementAction === 'CASHED';
    const needsParty = movementAction === 'ENDORSED';
    const bank = accounts.find((item) => item.account_id === movementBankId && item.kind === 'Bank');
    const cash = accounts.find((item) => item.account_id === movementCashId && item.kind === 'Cash');
    const party = accounts.find((item) => item.account_id === movementPartyId && ['General', 'Party'].includes(item.kind) && !item.is_system && item.account_id !== selected.source_account_id);
    if (needsBank && !bank) { setMovementError('اختر الحساب البنكي.'); return; }
    if (needsCash && !cash) { setMovementError('اختر الصندوق النقدي الذي ستدخل إليه قيمة الشيك.'); return; }
    if (needsParty && !party) { setMovementError('اختر حساب طرف موجودًا يختلف عن مصدر الشيك.'); return; }
    const destination = movementAction === 'DEPOSITED' ? 'البنك ' + bank?.name
      : movementAction === 'SENT_TO_COLLECTION' ? 'التحصيل عبر البنك ' + bank?.name
      : movementAction === 'ENDORSED' ? 'الطرف ' + (party?.customer_name ?? party?.name)
      : movementAction === 'RETURNED_TO_SOURCE' ? 'مصدر الشيك ' + sourceLabel(selected)
      : movementAction === 'CASHED' ? 'الصندوق ' + cash?.name
      : 'الخزنة';
    if (!confirmed) {
      setReview({
        kind: 'movement', title: movementLabels[movementAction],
        message: movementAction === 'RETURNED_TO_SOURCE'
          ? 'سيعود الشيك إلى مصدره ويُحدّث رصيد الحساب المرتبط به.'
          : movementAction === 'RETURNED_FROM_BANK'
            ? 'سيعود الشيك من البنك إلى «شيكات بحوزتنا».'
            : 'راجع بيانات الحركة قبل اعتمادها.',
        details: [`الشيك: #${selected.number} · ${amountLabel(selected)}`, `تاريخ العملية: ${date(movementDate)}`, `الوجهة: ${destination}`],
        destructive: movementAction === 'RETURNED_TO_SOURCE',
      });
      return;
    }
    setReview(null);
    const input: IncomingCheckMovementDto = {
      operation_date: movementDate,
      ...(needsBank ? { bank_account_id: bank!.account_id } : {}),
      ...(needsCash ? { cash_account_id: cash!.account_id } : {}),
      ...(needsParty ? { party_account_id: party!.account_id } : {}),
      ...(movementNotes.trim() ? { notes: movementNotes.trim() } : {}),
    };
    movementInFlight.current = true;
    setMovementSaving(true);
    setMovementError('');
    try {
      await checksService.moveIncoming(selected.managed_check_id, movementAction, input);
      setMovementAction(null);
      setSelected(null);
      setEditFeedback('اكتملت حركة الشيك، وتم تحديث القائمة والتفاصيل.');
      setRevision((value) => value + 1);
    } catch (reason) {
      const messages = reason instanceof ApiError ? reason.messages : [];
      const stale = messages.some((message) => /أعد الشيك إلى الخزنة|الشيك ليس لدى بنك|الشيك ليس مجيرًا|الشيك ليس لدى المصدر|هذه العملية تخص الشيكات الواردة فقط/.test(message));
      const missing = reason instanceof ApiError && reason.status === 404;
      if (stale || missing) {
        setMovementAction(null);
        setSelected(null);
        setEditFeedback(missing ? 'الشيك غير موجود. تم تحديث القائمة.' : 'تغيّر موقع الشيك أو حالته. تم تحديث القائمة والتفاصيل.');
        if (missing) navigate('/owner/checks');
        setRevision((value) => value + 1);
      } else if (reason instanceof ApiError && reason.status === 409) {
        setMovementError('تعارضت هذه المحاولة مع عملية سابقة. ' + apiMessages(reason, 'راجع الشيك ثم حاول مرة أخرى.').join('، '));
      } else if (reason instanceof ApiError && reason.status === 403) {
        setMovementError('ليس لديك صلاحية تنفيذ حركة الشيك.');
      } else {
        setMovementError(apiMessages(reason, 'تعذر تنفيذ حركة الشيك.').join('، '));
      }
    } finally {
      movementInFlight.current = false;
      setMovementSaving(false);
    }
  };
  const openUndo = (event: ManagedCheckEvent) => {
    if (!selected || undoableEvent(selected)?.check_event_id !== event.check_event_id) return;
    setEditing(false);
    setMovementAction(null);
    setOutgoingAction(null);
    setUndoEventId(event.check_event_id);
    setUndoDate('');
    setUndoReason('');
    setUndoError('');
    setEditFeedback('');
  };
  const saveUndo = async (event?: FormEvent<HTMLFormElement>, confirmed = false) => {
    event?.preventDefault();
    if (!selected || undoEventId === null || undoInFlight.current) return;
    const movement = undoableEvent(selected);
    if (!movement || movement.check_event_id !== undoEventId) { setUndoError('تغيّرت آخر حركة للشيك. حدّث التفاصيل ثم حاول مرة أخرى.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(undoDate)) { setUndoError('اختر تاريخ عملية صالحًا.'); return; }
    if (lastBusinessDate(selected) && undoDate < lastBusinessDate(selected)!) { setUndoError('تاريخ التراجع يسبق آخر حركة فعالة للشيك.'); return; }
    if (!confirmed) {
      setReview({ kind: 'undo', title: 'التراجع عن حركة الشيك',
        message: 'سيُعكس أثر آخر حركة ويعود الشيك إلى حالته السابقة.',
        details: [`الشيك: #${selected.number} · ${amountLabel(selected)}`, `الحركة: ${eventLabels[movement.action] ?? movement.action}`, `تاريخ التراجع: ${date(undoDate)}`],
        destructive: true });
      return;
    }
    setReview(null);
    undoInFlight.current = true;
    setUndoSaving(true);
    setUndoError('');
    try {
      await checksService.undo(selected.managed_check_id, movement.check_event_id, { operation_date: undoDate, ...(undoReason.trim() ? { reason: undoReason.trim() } : {}) });
      setUndoEventId(null);
      setSelected(null);
      setEditFeedback('تم التراجع عن آخر حركة. حُدّثت حالة الشيك وسجل الأحداث من النظام.');
      setRevision((value) => value + 1);
    } catch (reason) {
      if (reason instanceof ApiError && [400, 404, 409].includes(reason.status)) {
        setUndoEventId(null);
        setSelected(null);
        setEditFeedback('تعذّر التراجع؛ ربما تغيّرت آخر حركة أو حالة الشيك. تم تحديث البيانات. ' + apiMessages(reason, 'راجع سجل الأحداث.').join('، '));
        setRevision((value) => value + 1);
      } else if (reason instanceof ApiError && reason.status === 403) {
        setUndoError('ليس لديك صلاحية التراجع عن حركة الشيك.');
      } else {
        setUndoError(apiMessages(reason, 'تعذر التراجع عن حركة الشيك.').join('، '));
      }
    } finally {
      undoInFlight.current = false;
      setUndoSaving(false);
    }
  };
  const openOutgoing = (action: OutgoingAction) => {
    if (!selected || !availableOutgoingActions(selected).includes(action)) return;
    setEditing(false);
    setMovementAction(null);
    setUndoEventId(null);
    setOutgoingAction(action);
    setOutgoingDate(firstValidOperationDate(selected));
    setOutgoingError('');
    setEditFeedback('');
  };
  const saveOutgoing = async (event?: FormEvent<HTMLFormElement>, confirmed = false) => {
    event?.preventDefault();
    if (!selected || !outgoingAction || outgoingInFlight.current || !availableOutgoingActions(selected).includes(outgoingAction)) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(outgoingDate)) { setOutgoingError('اختر تاريخ عملية صالحًا.'); return; }
    if (lastBusinessDate(selected) && outgoingDate < lastBusinessDate(selected)!) { setOutgoingError('تاريخ العملية يسبق آخر حركة فعالة للشيك.'); return; }
    if (!confirmed) {
      setReview({ kind: 'outgoing', title: outgoingLabels[outgoingAction],
        message: outgoingAction === 'return'
          ? 'سيُعاد الشيك الصادر ويُعكس أثر الدفعة المرتبطة به.'
          : 'سيُسجّل أن الشيك الصادر صُرف من البنك.',
        details: [`الشيك: #${selected.number} · ${amountLabel(selected)}`, `تاريخ العملية: ${date(outgoingDate)}`],
        destructive: outgoingAction === 'return' });
      return;
    }
    setReview(null);
    outgoingInFlight.current = true;
    setOutgoingSaving(true);
    setOutgoingError('');
    try {
      const input = { operation_date: outgoingDate };
      if (outgoingAction === 'clear') await checksService.clearOutgoing(selected.managed_check_id, input);
      else await checksService.returnOutgoing(selected.managed_check_id, input);
      setOutgoingAction(null);
      setSelected(null);
      setEditFeedback('اكتملت حركة الشيك الصادر. حُدّثت القائمة والتفاصيل وسجل الأحداث من النظام.');
      setRevision((value) => value + 1);
    } catch (reason) {
      if (reason instanceof ApiError && [400, 404, 409].includes(reason.status)) {
        setOutgoingAction(null);
        setSelected(null);
        setEditFeedback('تعذّر تنفيذ الحركة؛ ربما تغيّرت حالة الشيك. تم تحديث البيانات. ' + apiMessages(reason, 'راجع تفاصيل الشيك.').join('، '));
        setRevision((value) => value + 1);
      } else if (reason instanceof ApiError && reason.status === 403) {
        setOutgoingError('ليس لديك صلاحية إدارة الشيك الصادر.');
      } else {
        setOutgoingError(apiMessages(reason, 'تعذر تنفيذ حركة الشيك الصادر.').join('، '));
      }
    } finally {
      outgoingInFlight.current = false;
      setOutgoingSaving(false);
    }
  };
  const changePage = (page: number) => { resetSelection(); setQuery((current) => ({ ...current, page })); };
  const pagination = response?.pagination;

  return <div className="space-y-5" dir="rtl">
    {!isDetailPage && <>
    <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-4">
      <div><p className="text-xs font-black text-gold-dark">عرض الشيكات</p><h1 className="text-3xl font-black text-brand">الشيكات المُدارة</h1><p className="text-sm text-stone-500">القائمة والموقع والاستحقاق كما يعيدها النظام. <Link className="text-gold-dark underline" to="/owner/treasury">عرض الخزنة</Link></p></div>
      <button type="button" className="btn-outline" onClick={() => { setEditing(false); setMovementAction(null); setUndoEventId(null); setOutgoingAction(null); setRevision((value) => value + 1); }} disabled={loading || editSaving || movementSaving || undoSaving || outgoingSaving}>تحديث</button>
    </header>

    <section className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="فلاتر الشيكات">
      <label className="block"><span className="rep-label">بحث برقم الشيك أو اسم الحساب</span><input className="rep-control" value={searchInput} onChange={(event) => { setSearchInput(event.target.value); resetSelection(); }} /></label>
      <RepSelect label="الموقع" value={query.location ?? ''} onChange={(value) => { resetSelection(); setQuery((current) => ({ ...current, location: value as ManagedCheckLocation || undefined, page: 1 })); }} options={[{ value: '', label: 'كل المواقع' }, ...locations.map(([value, label]) => ({ value, label }))]} />
      <RepSelect label="الاستحقاق" value={query.due_status ?? ''} onChange={(value) => { resetSelection(); setQuery((current) => ({ ...current, due_status: value as 'Due' | 'NotDue' || undefined, page: 1 })); }} options={[{ value: '', label: 'الكل' }, { value: 'Due', label: 'مستحق' }, { value: 'NotDue', label: 'غير مستحق' }]} />
      <RepSelect label="العملة" value={String(query.currency_id ?? '')} onChange={(value) => { resetSelection(); setQuery((current) => ({ ...current, currency_id: value ? Number(value) : undefined, page: 1 })); }} disabled={!!currencyError} options={[{ value: '', label: 'كل العملات' }, ...currencies.map((currency) => ({ value: String(currency.currency_id), label: `${currency.name} (${currency.code})` }))]} />
      <RepDateInput label="الاستحقاق من" value={query.due_from ?? ''} onChange={(value) => { resetSelection(); setQuery((current) => ({ ...current, due_from: value || undefined, page: 1 })); }} max={query.due_to} />
      <RepDateInput label="الاستحقاق إلى" value={query.due_to ?? ''} onChange={(value) => { resetSelection(); setQuery((current) => ({ ...current, due_to: value || undefined, page: 1 })); }} min={query.due_from} />
    </section>
    {currencyError && <p className="text-sm text-amber-800">{currencyError} <button className="underline" onClick={() => setRevision((value) => value + 1)}>إعادة المحاولة</button></p>}
    {accountsError && <p className="text-sm text-amber-800">{accountsError} <button className="underline" onClick={() => setRevision((value) => value + 1)}>إعادة المحاولة</button></p>}
    {error && <div className="rep-error" role="alert">{error} <button className="underline" onClick={() => setRevision((value) => value + 1)}>إعادة المحاولة</button></div>}
    {editFeedback && <div className="rounded-xl border bg-white p-3 text-sm text-brand" role="status">{editFeedback}</div>}
    {loading && <p className="rounded-xl border bg-white p-6 text-stone-500">جارٍ تحميل الشيكات…</p>}
    {!loading && response && <>
      <p className="text-sm text-stone-500">{pagination?.total ?? 0} شيك · صفحة {pagination?.page ?? 1} من {pagination?.total_pages || 1}</p>
      {response.items.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{response.items.map((check) => <Link key={check.managed_check_id} to={`/owner/checks/${check.managed_check_id}`} className="min-w-0 rounded-2xl border bg-white p-4 text-right transition hover:border-gold-dark hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-dark">
        <div className="flex flex-wrap items-start justify-between gap-2"><b className="break-words text-brand">شيك #{check.number}</b><span className="text-xs">{check.direction === 'Incoming' ? 'وارد' : 'صادر'}</span></div>
        <p className="mt-1 break-words text-sm">{sourceLabel(check)}</p>
        <p className="mt-2 break-words text-lg font-black">{amountLabel(check)}</p>
        <p className="text-xs text-stone-500">{locationLabels[check.location] ?? check.location} · {check.due_status === 'Due' ? 'مستحق' : 'غير مستحق'} · {date(check.due_date)}</p>
      </Link>)}</div> : <p className="rounded-xl border bg-white p-6 text-center text-stone-500">لا توجد شيكات مطابقة.</p>}
      {pagination && pagination.total_pages > 1 && <nav aria-label="صفحات الشيكات" className="flex flex-wrap items-center justify-center gap-3"><button type="button" className="btn-outline" disabled={loading || pagination.page <= 1} onClick={() => changePage(pagination.page - 1)}>السابق</button><span className="text-sm font-bold">{pagination.page} / {pagination.total_pages}</span><button type="button" className="btn-outline" disabled={loading || pagination.page >= pagination.total_pages} onClick={() => changePage(pagination.page + 1)}>التالي</button></nav>}
    </>}
    </>}
    {isDetailPage && <nav className="text-sm text-stone-500"><Link to="/owner/checks" className="font-bold text-brand hover:underline">الشيكات المُدارة</Link><span className="mx-2">/</span>تفاصيل الشيك</nav>}
    {isDetailPage && selectedId === null && <div className="rep-error" role="alert">رقم الشيك غير صالح. <Link to="/owner/checks" className="underline">العودة إلى الشيكات</Link></div>}
    {isDetailPage && selectedId !== null && <section id="check-details" className="mx-auto max-w-6xl space-y-5 rounded-2xl border bg-white p-4 sm:p-6" aria-label="تفاصيل الشيك">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4"><div><p className="text-xs font-bold text-gold-dark">الشيكات المُدارة</p><div className="mt-1 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-black text-brand">{selected ? `شيك #${selected.number}` : 'تفاصيل الشيك'}</h1>{selected && <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand">{selected.direction === 'Incoming' ? 'وارد' : 'صادر'}</span>}</div></div><div className="flex flex-wrap gap-2">{selected && !editing && !movementAction && undoEventId === null && !outgoingAction && <button type="button" className="btn-outline" onClick={() => startEdit(selected)}>تعديل البيانات</button>}<button type="button" className="btn-outline" onClick={() => navigate('/owner/checks')} disabled={editSaving || movementSaving || undoSaving || outgoingSaving}>العودة للشيكات</button></div></div>
      {editFeedback && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800" role="status">{editFeedback}</div>}
      {detailsLoading && <p>جارٍ تحميل التفاصيل…</p>}
      {detailsError && <div className="rep-error" role="alert">{detailsError}</div>}
      {selected && <>
        {!editing && <>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200 lg:grid-cols-4">
          {([['رقم الشيك', selected.number], ['رقم البنك', bankIdentifiers(selected).bankNumber], ['رقم الفرع', bankIdentifiers(selected).branchNumber], ['رقم الحساب', bankIdentifiers(selected).accountNumber]] as const).map(([label, value]) => <div key={label} className="min-w-0 bg-white px-4 py-3"><p className="text-xs font-bold text-stone-500">{label}</p><p className="mt-1 break-all text-base font-black text-brand" dir="ltr">{value}</p></div>)}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-stone-100 py-3 text-sm">
          <span className="text-stone-500">المبلغ <b className="mr-1 text-base text-brand">{amountLabel(selected)}</b></span>
          <span className="text-stone-500">الحساب <b className="mr-1 text-brand">{sourceLabel(selected)}</b></span>
          <span className="text-stone-500">الموقع <b className="mr-1 text-brand">{locationLabels[selected.location] ?? selected.location}</b></span>
          <span className="text-stone-500">الاستحقاق <b className="mr-1 text-brand">{date(selected.due_date)}</b></span>
          {selected.current_bank_account_id && <span className="text-stone-500">{selected.direction === 'Outgoing' ? 'البنك المسحوب عليه' : 'البنك الحالي'} <b className="mr-1 text-brand">{accounts.find((account) => account.account_id === selected.current_bank_account_id)?.name ?? `حساب #${selected.current_bank_account_id}`}</b></span>}
          {(Number(selected.exchange_rate) !== 1 || Number(selected.base_amount) !== Number(selected.original_amount)) && <span className="text-stone-500">بالعملة الأساسية <b className="mr-1 text-brand">{number(selected.base_amount)}</b><span className="mr-1 text-xs">(سعر الصرف {selected.exchange_rate})</span></span>}
        </div>
        {selected.payments.notes && <p className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600">ملاحظة السند: <span className="font-bold text-brand">{selected.payments.notes}</span></p>}
        </>}
        {availableMovements(selected).length > 0 && !editing && undoEventId === null && !outgoingAction && <div className="space-y-3 border-t pt-4">
          <h3 className="font-black text-brand">حركات الشيك الوارد</h3>
          <div className="flex flex-wrap gap-2">{availableMovements(selected).map((action) => <button type="button" key={action} className="btn-outline min-h-10 px-4 text-sm" disabled={movementSaving} onClick={() => openMovement(action)}>{movementLabels[action]}</button>)}</div>
          {movementAction && <form className="max-w-3xl space-y-3 rounded-xl border border-gold-dark/40 bg-amber-50/50 p-4" onSubmit={(event) => void saveMovement(event)}>
            <h4 className="font-black text-brand">{movementLabels[movementAction]}</h4>
            <p className="text-sm text-stone-600">{movementAction === 'CASHED' ? 'ستنتقل قيمة الشيك من «شيكات بحوزتنا» إلى الصندوق النقدي الذي تختاره.' : 'ستُسجّل الحركة المالية عند التأكيد، ويمكنك مراجعتها في سجل الشيك وكشف الحساب.'}</p>
            {(movementAction === 'DEPOSITED' || movementAction === 'SENT_TO_COLLECTION') && <>
              <AccountPicker accounts={accounts.filter((item) => item.kind === 'Bank')} kinds={['Bank']} label="الحساب البنكي" value={movementBankId} onChange={setMovementBankId} disabled={movementSaving || !!accountsError} />
              {movementAction === 'DEPOSITED' && <p className="text-xs text-stone-600">الإيداع المباشر متاح من يوم استحقاق الشيك. قبل ذلك يمكن الإرسال للتحصيل.</p>}
              {movementAction === 'SENT_TO_COLLECTION' && <p className="text-xs text-stone-600">سيُنشئ النظام حساب التحصيل المرتبط بالبنك عند الحاجة؛ اختر البنك فقط.</p>}
            </>}
            {movementAction === 'ENDORSED' && <AccountPicker accounts={accounts.filter((item) => ['General', 'Party'].includes(item.kind) && !item.is_system && item.account_id !== selected.source_account_id)} kinds={['General', 'Party']} label="الطرف المستفيد" value={movementPartyId} onChange={setMovementPartyId} disabled={movementSaving || !!accountsError} />}
            {movementAction === 'CASHED' && <AccountPicker accounts={accounts.filter((item) => item.kind === 'Cash')} kinds={['Cash']} label="الصندوق النقدي" value={movementCashId} onChange={setMovementCashId} disabled={movementSaving || !!accountsError} />}
            {movementAction === 'RETURNED_TO_SOURCE' && <p className="text-sm text-stone-600">المصدر المسجل: <b>{sourceLabel(selected)}</b></p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <RepDateInput label="تاريخ العملية" value={movementDate} min={movementAction === 'DEPOSITED' && selected.due_date.slice(0, 10) > (lastBusinessDate(selected) ?? '') ? selected.due_date.slice(0, 10) : lastBusinessDate(selected)} onChange={setMovementDate} disabled={movementSaving} />
              <label className="block"><span className="rep-label">ملاحظة (اختيارية)</span><input className="rep-control" value={movementNotes} onChange={(event) => setMovementNotes(event.target.value)} disabled={movementSaving} /></label>
            </div>
            {movementError && <p className="rep-error" role="alert">{movementError}</p>}
            <div className="flex flex-wrap gap-2"><button type="submit" className="btn-primary" disabled={movementSaving || !!accountsError && ['DEPOSITED', 'SENT_TO_COLLECTION', 'ENDORSED', 'CASHED'].includes(movementAction)}>{movementSaving ? 'جارٍ التنفيذ…' : 'مراجعة وتأكيد'}</button><button type="button" className="btn-outline" disabled={movementSaving} onClick={() => { setMovementAction(null); setMovementError(''); }}>إلغاء</button></div>
          </form>}
        </div>}
        {availableOutgoingActions(selected).length > 0 && !editing && !movementAction && undoEventId === null && <div className="space-y-3 border-t pt-4">
          <h3 className="font-black text-brand">حركات الشيك الصادر</h3>
          <div className="flex flex-wrap gap-2">{availableOutgoingActions(selected).map((action) => <button type="button" key={action} className="btn-outline" disabled={outgoingSaving} onClick={() => openOutgoing(action)}>{outgoingLabels[action]}</button>)}</div>
          {outgoingAction && <form className="space-y-3 rounded-xl border border-gold-dark/40 bg-amber-50/50 p-4" onSubmit={(event) => void saveOutgoing(event)}>
            <h4 className="font-black text-brand">{outgoingLabels[outgoingAction]}</h4>
            <p className="text-xs text-stone-600">{outgoingAction === 'clear' ? 'سيؤكد النظام صرف الشيك الصادر، ويمكن التراجع عن هذه الحركة لاحقًا إذا بقيت آخر حركة فعالة.' : 'سيعيد النظام أثر الدفعة المرتبطة بالشيك وفق قواعده، ويمكن التراجع إذا بقيت هذه آخر حركة فعالة.'}</p>
            <RepDateInput label="تاريخ العملية" min={lastBusinessDate(selected)} value={outgoingDate} onChange={setOutgoingDate} disabled={outgoingSaving} />
            {outgoingError && <p className="rep-error" role="alert">{outgoingError}</p>}
            <div className="flex flex-wrap gap-2"><button type="submit" className="btn-primary" disabled={outgoingSaving}>{outgoingSaving ? 'جارٍ التنفيذ…' : 'مراجعة وتأكيد'}</button><button type="button" className="btn-outline" disabled={outgoingSaving} onClick={() => { setOutgoingAction(null); setOutgoingError(''); }}>إلغاء</button></div>
          </form>}
        </div>}
        {editing && <form className="mx-auto max-w-5xl space-y-5 rounded-2xl border border-stone-200 bg-stone-50/70 p-4 sm:p-6" onSubmit={(event) => void saveEdit(event)}>
          <div className="border-b border-stone-200 pb-4">
            <h2 className="text-xl font-black text-brand">تعديل بيانات الشيك</h2>
            <p className="mt-1 text-sm text-stone-500">عدّل البيانات ثم راجع المبلغ والحساب قبل الحفظ.</p>
          </div>

          <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5" aria-label="البيانات الأساسية">
            <div><h3 className="font-black text-brand">البيانات الأساسية</h3><p className="text-xs text-stone-500">رقم الشيك وقيمته</p></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block"><span className="rep-label">رقم الشيك</span><input className="rep-control" dir="ltr" value={editNumber} onChange={(event) => setEditNumber(event.target.value)} required disabled={editSaving} /></label>
              <label className="block"><span className="rep-label">المبلغ</span><input className="rep-control" dir="ltr" inputMode="decimal" value={editAmount} onChange={(event) => setEditAmount(event.target.value)} required disabled={editSaving} /></label>
              <RepSelect label="العملة" value={editCurrencyId} onChange={setEditCurrencyId} disabled={editSaving || !!currencyError} options={[{ value: '', label: 'اختر العملة' }, ...currencies.map((currency) => ({ value: String(currency.currency_id), label: `${currency.name} (${currency.code})` }))]} />
              <label className="block"><span className="rep-label">سعر الصرف</span><input className="rep-control" dir="ltr" inputMode="decimal" value={editRate} onChange={(event) => setEditRate(event.target.value)} required disabled={editSaving} /></label>
            </div>
            {Number(editAmount) > 0 && Number(editRate) > 0 && <div className="rounded-lg bg-brand/5 px-4 py-3 text-sm text-brand">القيمة بالعملة الأساسية <b className="mr-2 text-base">{number((Number(editAmount) * Number(editRate)).toFixed(2))}</b></div>}
          </section>

          <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5" aria-label="الحساب والتواريخ">
            <h3 className="font-black text-brand">الحساب والتواريخ</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <AccountPicker accounts={accounts.filter((account) => ['General', 'Party'].includes(account.kind) && !account.is_system)} kinds={['General', 'Party']} label="الحساب المرتبط" value={editSourceId} onChange={setEditSourceId} disabled={editSaving || !!accountsError} />
              {selected.direction === 'Outgoing' && <AccountPicker accounts={accounts.filter((account) => account.kind === 'Bank')} kinds={['Bank']} label="البنك المسحوب عليه" value={editBankId} onChange={setEditBankId} disabled={editSaving || !!accountsError} />}
              <RepDateInput label="تاريخ الاستلام/الإصدار" value={editReceivedDate} onChange={setEditReceivedDate} disabled={editSaving} />
              <RepDateInput label="تاريخ الاستحقاق" value={editDueDate} onChange={setEditDueDate} disabled={editSaving} />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5" aria-label="الأرقام على الشيك">
            <h3 className="font-black text-brand">الأرقام على الشيك</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block"><span className="rep-label">رقم البنك</span><input className="rep-control" dir="ltr" inputMode="numeric" value={editBankNumber} onChange={(event) => setEditBankNumber(event.target.value)} disabled={editSaving} /></label>
              <label className="block"><span className="rep-label">رقم الفرع</span><input className="rep-control" dir="ltr" inputMode="numeric" value={editBranchNumber} onChange={(event) => setEditBranchNumber(event.target.value)} disabled={editSaving} /></label>
              <label className="block"><span className="rep-label">رقم الحساب</span><input className="rep-control" dir="ltr" inputMode="numeric" value={editAccountNumber} onChange={(event) => setEditAccountNumber(event.target.value)} disabled={editSaving} /></label>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5" aria-label="الملاحظات">
            <h3 className="font-black text-brand">الملاحظات</h3>
            <label className="block"><span className="rep-label">ملاحظة السند</span><textarea className="rep-control min-h-20" value={editPaymentNotes} onChange={(event) => setEditPaymentNotes(event.target.value)} disabled={editSaving} /></label>
            <label className="block"><span className="rep-label">سبب التعديل (اختياري)</span><input className="rep-control" value={editNote} onChange={(event) => setEditNote(event.target.value)} disabled={editSaving} /></label>
          </section>

          {editError && <p className="rep-error" role="alert">{editError}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4">
            <p className="text-xs text-stone-500">يحفظ النظام التعديل في سجل الشيك ويصحح القيود المالية عند الحاجة.</p>
            <div className="flex gap-2"><button type="button" className="btn-outline" disabled={editSaving} onClick={() => { setEditing(false); setEditError(''); }}>إلغاء</button><button type="submit" className="btn-primary" disabled={editSaving}>{editSaving ? 'جارٍ الحفظ…' : 'حفظ التعديل'}</button></div>
          </div>
        </form>}
        {!editing && <div><h3 className="mb-2 font-black text-brand">سجل الأحداث</h3>{selected.events.length ? <ol className="space-y-2 border-r-2 border-gold-dark pr-4">{selected.events.map((event) => <li key={event.check_event_id} className="rounded-xl bg-stone-50 p-3 text-sm"><b>{eventLabels[event.action] ?? event.action}</b><p className="text-stone-600">{event.from_location ? (locationLabels[event.from_location as ManagedCheckLocation] ?? event.from_location) : 'بداية'} ← {locationLabels[event.to_location as ManagedCheckLocation] ?? event.to_location}</p><p className="text-xs text-stone-500">تاريخ الحركة: {date(event.operation_date)} · التسجيل: {formatOrderDateTime(event.created_at)} · المنفذ #{event.created_by ?? 'غير مسجل'}</p>{event.notes && <p className="text-xs text-stone-600">{event.notes}</p>}{event.cancelled_at && <p className="text-xs text-red-700">أُلغيت الحركة{event.cancel_reason ? `: ${event.cancel_reason}` : ''}</p>}{event.cancels_event_id && <p className="text-xs text-stone-600">تراجع عن الحدث #{event.cancels_event_id}</p>}{undoableEvent(selected)?.check_event_id === event.check_event_id && !movementAction && !outgoingAction && <button type="button" className="btn-outline mt-2" disabled={undoSaving} onClick={() => openUndo(event)}>تراجع عن آخر حركة</button>}</li>)}</ol> : <p className="text-sm text-stone-500">لا توجد أحداث مسجلة.</p>}</div>}
        {undoEventId !== null && !editing && !movementAction && !outgoingAction && <form className="space-y-3 rounded-xl border border-gold-dark/40 bg-amber-50/50 p-4" onSubmit={(event) => void saveUndo(event)}>
          <h3 className="font-black text-brand">التراجع عن آخر حركة</h3>
          <p className="text-xs text-stone-600">سيعكس النظام آثار الحركة ويحتفظ بها في السجل مع حدث التراجع.</p>
          <div className="grid gap-3 sm:grid-cols-2"><RepDateInput label="تاريخ التراجع" min={lastBusinessDate(selected)} value={undoDate} onChange={setUndoDate} disabled={undoSaving} /><label className="block"><span className="rep-label">سبب التراجع (اختياري)</span><input className="rep-control" value={undoReason} onChange={(event) => setUndoReason(event.target.value)} disabled={undoSaving} /></label></div>
          {undoError && <p className="rep-error" role="alert">{undoError}</p>}
          <div className="flex flex-wrap gap-2"><button type="submit" className="btn-primary" disabled={undoSaving}>{undoSaving ? 'جارٍ التراجع…' : 'مراجعة وتأكيد'}</button><button type="button" className="btn-outline" disabled={undoSaving} onClick={() => { setUndoEventId(null); setUndoError(''); }}>إلغاء</button></div>
        </form>}
      </>}
    </section>}
    <ConfirmDialog
      open={review !== null}
      onClose={() => setReview(null)}
      onConfirm={() => {
        if (review?.kind === 'movement') void saveMovement(undefined, true);
        else if (review?.kind === 'undo') void saveUndo(undefined, true);
        else if (review?.kind === 'outgoing') void saveOutgoing(undefined, true);
      }}
      title={review?.title ?? ''}
      message={review?.message ?? ''}
      details={<div className="space-y-1">{review?.details.map((line) => <p key={line}>{line}</p>)}</div>}
      severity={review?.destructive ? 'destructive' : 'normal'}
      confirmLabel={review?.kind === 'undo' ? 'تأكيد التراجع' : review?.destructive ? 'تأكيد الإرجاع' : 'اعتماد الحركة'}
      loading={movementSaving || undoSaving || outgoingSaving}
    />
  </div>;
}
