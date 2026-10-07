import {
  returnsService,
  type AccountIdentityOption,
  type PurchaseReturnDto,
  type SalesReturnDto,
} from "@/api";
import { useAuth } from "@/auth";
import { RepDateInput, RepSelect } from "@/components/rep/RepFormControls";
import { apiMessages } from "@/components/rep/repOrderUtils";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import { formatMoney } from "@/utils/money";
import { Ban, History, Pencil, Plus, RotateCcw, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import AccountReturnLauncher from "./AccountReturnLauncher";
import CheckFiltersPopover from './CheckFiltersPopover';
import { ReturnItems, ReturnNotes } from './ReturnDetailsSections';
import ReturnHistory from "./ReturnHistory";
import ReturnsList from './ReturnsList';
import "./ReturnsOperationsPage.css";
import SalesReturnEditor from "./SalesReturnEditor";
import { useReturnsList } from './useReturnsList';

type Action = "cancel" | "restore" | "delete";
export default function ReturnsOperationsPage() {
  const { type, setType, searchText, setSearchText, rows, total, pages, search, setSearch, account, setAccount, status, setStatus, from, setFrom, to, setTo, page, setPage, error, setError, loading, purchaseRows, load } = useReturnsList()

  const { user } = useAuth();
  const [sourceParams] = useSearchParams();
  const sourceId = Number(sourceParams.get("return"));

  const [advanced, setAdvanced] = useState(false);
  const advancedTrigger = useRef<HTMLButtonElement>(null);
  const closeAdvanced = useCallback(() => { setAdvanced(false); advancedTrigger.current?.focus(); }, []);
  const [createOpen, setCreateOpen] = useState(false);
  const [purchaseSelected, setPurchaseSelected] =
    useState<PurchaseReturnDto | null>(null);

  const [accounts, setAccounts] = useState<AccountIdentityOption[]>([]);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [selected, setSelected] = useState<SalesReturnDto | null>(null);
  const [editor, setEditor] = useState(false);
  const [editing, setEditing] = useState<SalesReturnDto | null>(null);

  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  const [purchaseEditing, setPurchaseEditing] =
    useState<PurchaseReturnDto | null>(null);
  const [purchaseAction, setPurchaseAction] = useState<"cancel" | "restore">(
    "cancel",
  );
  const [purchaseCancel, setPurchaseCancel] = useState<number | null>(null);
  const [purchaseDelete, setPurchaseDelete] = useState<number | null>(null);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const c = new AbortController();
    returnsService.accounts(c.signal)
      .then((a) => {
        if (!c.signal.aborted) {
          setAccounts(a);
        }
      })
      .catch((e) => {
        if (!c.signal.aborted)
          setError(apiMessages(e, "تعذر تحميل الحسابات.").join("، "));
      });
    return () => c.abort();
  }, [setError]);
  useEffect(() => {
    if (!sourceId) return;
    const c = new AbortController();
    returnsService
      .details(sourceId, c.signal)
      .then(result => { if (!c.signal.aborted) setSelected(result); })
      .catch((e) => {
        if (!c.signal.aborted)
          setError(apiMessages(e, "تعذر فتح المردود.").join("، "));
      });
    return () => c.abort();
  }, [sourceId, setError]);
  const details = async (id: number) => {
    try {
      setSelected(await returnsService.details(id));
      setNote("");
    } catch (e) {
      setError(apiMessages(e, "تعذر فتح المردود.").join("، "));
    }
  };
  const mutate = async () => {
    if (!selected || !action || saving) return;
    setSaving(true);
    try {
      if (action === "delete") {
        await returnsService.permanentDelete(selected.customer_return_id);
        setSelected(null);
      } else {
        if (action === "cancel")
          await returnsService.cancel(
            selected.customer_return_id,
            note || undefined,
          );
        else
          await returnsService.restore(
            selected.customer_return_id,
            note || undefined,
          );
        await details(selected.customer_return_id);
      }
      setAction(null);
      await load();
    } catch (e) {
      setError(apiMessages(e, "تعذر تنفيذ العملية.").join("، "));
      setAction(null);
    } finally {
      setSaving(false);
    }
  };
  const openReturn = (row: SalesReturnDto | PurchaseReturnDto) => {
    if (type === 'sales') void details(row.customer_return_id);
    else void returnsService.purchaseDetails(row.customer_return_id).then(setPurchaseSelected)
      .catch(reason => setError(apiMessages(reason, 'تعذر فتح المردود.').join('، ')));
  };
  const pageCount = pages;
  return (
    <div dir="rtl" className={`returns-page space-y-3 ${!selected && pages > 1 ? "returns-has-pagination" : ""}`}>
      {!selected && <header className="returns-header">
        <div className="min-w-0">
          <p className="text-xs font-black text-gold-dark">إدارة المردودات</p>
          <h1 className="text-2xl font-black leading-tight text-brand sm:text-3xl">المردودات</h1>
          <p className="mt-1 text-sm text-stone-500">متابعة مردودات المبيعات والمشتريات.</p>
        </div>
        <button
          type="button"
          className="btn-primary returns-create"
          onClick={() => {
            setCreateOpen(true);
          }}
          disabled={!accounts.length}
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
          إنشاء مردود
        </button>
      </header>}
      {error && (
        <p role="alert" className="rep-error">
          {error}
          <button className="btn-ghost ml-2" onClick={() => void load()}>
            إعادة المحاولة
          </button>
        </p>
      )}
      {selected ? (
        <section className="return-details space-y-4 rounded-2xl border bg-white p-4">
          <header className="return-detail-heading">
            <div className="return-detail-identity"><h2>{selected.return_number}</h2><span>مردود مبيعات</span><span className={"return-badge " + (selected.status === "Cancelled" ? "return-cancelled" : "")}>{selected.status === "Completed" ? "مكتمل" : "ملغى"}</span></div>
            <button type="button" className="btn-ghost return-detail-back" onClick={() => { setSelected(null); setHistoryOpen(false); }}>العودة للقائمة</button>
          </header>
          <div className="return-meta">
            <div>
              <span>النوع والحالة</span>
              <b>مردود مبيعات</b>{" "}
              <span
                className={
                  "return-badge " +
                  (selected.status === "Cancelled" ? "return-cancelled" : "")
                }
              >
                {selected.status === "Completed" ? "مكتمل" : "ملغى"}
              </span>
            </div>
            <div>
              <span>الحساب العام</span>
              <b>{selected.account.name}</b>
            </div>
            <div>
              <span>التاريخ</span>
              <b>{selected.return_date.slice(0, 10)}</b>
            </div>
            <div>
              <span>الإجمالي · {selected.items.length} بند</span>
              <b className="text-xl text-brand">
                {formatMoney(selected.total_amount)}
              </b>
            </div>
          </div>
          <div className="return-detail-main-actions">
            {selected.status === "Completed" ? <button type="button" className="btn-primary" onClick={() => { setEditing(selected); setEditor(true); }}><Pencil size={17} />تعديل</button> : <button type="button" className="btn-primary" onClick={() => setAction("restore")}><RotateCcw size={17} />استعادة المردود</button>}
            <button type="button" className="btn-outline" onClick={() => setHistoryOpen(true)}><History size={17} />الحركات <span className="return-badge">{selected.history?.length ?? 0}</span></button>
          </div>
          <ReturnNotes notes={selected.notes} />
          <ReturnItems items={selected.items} />
          <div className="return-detail-destructive" aria-label="إجراءات المردود الحساسة">
            {selected.status === "Completed" ? <button type="button" className="btn-outline return-detail-cancel" onClick={() => setAction("cancel")}><Ban size={17} />إلغاء المردود</button> : <button type="button" className="btn-ghost return-detail-delete" onClick={() => setAction("delete")}><Trash2 size={17} />حذف نهائي</button>}
          </div>
          <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title={`حركات المردود ${selected.return_number}`} size="lg" mobileFullscreen><div dir="rtl"><ReturnHistory history={selected.history ?? []} /></div></Modal>
        </section>
      ) : (
        <>
          <div className="return-tabs" role="tablist" aria-label="نوع المردود">
            <button
              role="tab"
              aria-selected={type === "sales"}
              onClick={() => {
                setType("sales");
                setPage(1);
              }}
            >
              مردود مبيعات
            </button>
            <button
              role="tab"
              aria-selected={type === "purchase"}
              onClick={() => {
                setType("purchase");
                setPage(1);
              }}
            >
              مردود مشتريات
            </button>
          </div>
          <div className="return-filters">
            <label>
              <span className="rep-label">البحث</span>
              <input
                type="search"
                className="rep-control"
                placeholder="رقم المردود أو الحساب"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </label>
            <RepSelect
              label="الحالة"
              value={status}
              onChange={(v) => {
                setStatus(v as typeof status);
                setPage(1);
              }}
              options={[
                { value: "", label: "كل الحالات" },
                { value: "Completed", label: "مكتمل" },
                { value: "Cancelled", label: "ملغى" },
              ]}
            />
            <button ref={advancedTrigger} type="button" className="btn-outline return-filter-trigger" aria-haspopup="dialog" aria-expanded={advanced} onClick={() => setAdvanced(open => !open)}><SlidersHorizontal className="h-4 w-4" />
              فلاتر إضافية
              {account || from || to
                ? " (" + (Number(!!account) + Number(!!from || !!to)) + ")"
                : ""}
            </button>
          </div>
          <div className="return-chips">
            {searchText && (
              <button
                onClick={() => {
                  setSearchText("");
                  setSearch("");
                  setPage(1);
                }}
              >
                {searchText} ×
              </button>
            )}
            {status && (
              <button
                onClick={() => {
                  setStatus("");
                  setPage(1);
                }}
              >
                {status === "Completed" ? "مكتمل" : "ملغى"} ×
              </button>
            )}
            {account > 0 && (
              <button
                onClick={() => {
                  setAccount(0);
                  setPage(1);
                }}
              >
                {accounts.find((a) => a.account_id === account)?.name} ×
              </button>
            )}
            {(from || to) && (
              <button
                onClick={() => {
                  setFrom("");
                  setTo("");
                  setPage(1);
                }}
              >
                {from || "البداية"} — {to || "الآن"} ×
              </button>
            )}
            {(searchText || status || account || from || to) && (
              <button
                onClick={() => {
                  setSearchText("");
                  setSearch("");
                  setStatus("");
                  setAccount(0);
                  setFrom("");
                  setTo("");
                  setPage(1);
                }}
              >
                مسح الكل
              </button>
            )}
          </div>
          <p className="text-sm text-stone-500" role="status">
            {loading ? "جارٍ تحميل المردودات…" : total + " مردود"}
          </p>
          {!loading &&
            !error &&
            (type === "sales" ? rows.length : purchaseRows.length) === 0 && (
              <div className="returns-state">
                <h3>
                  {search || account || status || from || to
                    ? "لا توجد نتائج مطابقة"
                    : "لا توجد مردودات بعد"}
                </h3>
                <p>أنشئ مردودًا أو جرّب تغيير الفلاتر.</p>
              </div>
            )}
          {!loading &&
            !error &&
            (type === "sales" ? rows.length : purchaseRows.length) > 0 && (
              <ReturnsList type={type} rows={rows} purchaseRows={purchaseRows} onOpen={openReturn} />
            )}
          {pageCount > 1 &&
            createPortal(
              <nav aria-label="صفحات المردودات" className="return-pagination">
                <div>
                  <button
                    className="btn-ghost"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    السابق
                  </button>
                  <span aria-current="page">
                    {page} / {pageCount}
                  </span>
                  <button
                    className="btn-ghost"
                    disabled={page >= pageCount || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    التالي
                  </button>
                </div>
              </nav>,
              window.document.body,
            )}
        </>
      )}
      <CheckFiltersPopover open={advanced} onClose={closeAdvanced} trigger={advancedTrigger} footer={<button type="button" className="btn-ghost" onClick={() => { setAccount(0); setFrom(''); setTo(''); setPage(1); }}>مسح الفلاتر</button>}>
        <div dir="rtl" className="space-y-4">
          <RepSelect
            floating
            label="الحساب"
            value={String(account)}
            onChange={(v) => {
              setAccount(Number(v));
              setPage(1);
            }}
            options={[
              { value: "0", label: "كل الحسابات" },
              ...accounts.map((a) => ({
                value: String(a.account_id),
                label: a.name,
              })),
            ]}
          />
          <RepDateInput
            label="من تاريخ"
            value={from}
            onChange={(v) => {
              setFrom(v);
              setPage(1);
            }}
          />
          <RepDateInput
            label="إلى تاريخ"
            min={from || undefined}
            value={to}
            onChange={(v) => {
              setTo(v);
              setPage(1);
            }}
          />
          <p className="text-xs text-stone-500">الفلاتر تُطبّق تلقائيًا.</p>
        </div>
      </CheckFiltersPopover>
      <Modal
        open={createOpen}
        className="return-choice-modal"
        title="إنشاء مردود"
        onClose={() => setCreateOpen(false)}
      >
        <div dir="rtl" className="grid gap-3">
          <button
            className="return-type-choice"
            onClick={() => {
              setEditing(null);
              setEditor(true);
              setCreateOpen(false);
            }}
          >
            مردود مبيعات<span>أصناف تُعاد إلينا من الحساب العام.</span>
          </button>
          {user?.role === "Admin" && (
            <button
              className="return-type-choice"
              onClick={() => {
                setPurchaseEditing(null);
                setPurchaseOpen(true);
                setCreateOpen(false);
              }}
            >
              مردود مشتريات<span>أصناف نُعيدها إلى الحساب العام.</span>
            </button>
          )}
        </div>
      </Modal>
      {purchaseSelected && (
        <Modal
          open
          title={"مردود مشتريات #" + purchaseSelected.customer_return_id}
          size="return"
          mobileFullscreen
          className="return-purchase-details"
          onClose={() => setPurchaseSelected(null)}
        >
          <div dir="rtl" className="return-details return-purchase-body space-y-3">
            <header className="return-detail-heading"><div className="return-detail-identity"><h2>#{purchaseSelected.customer_return_id}</h2><span>مردود مشتريات</span><span className={"return-badge " + (purchaseSelected.cancelled_at ? "return-cancelled" : "")}>{purchaseSelected.cancelled_at ? "ملغى" : "مكتمل"}</span></div></header>
            <div className="return-meta">
              <div><span>النوع والحالة</span><b>مردود مشتريات</b><span className={"return-badge " + (purchaseSelected.cancelled_at ? "return-cancelled" : "")}>{purchaseSelected.cancelled_at ? "ملغى" : "مكتمل"}</span></div>
              <div><span>الحساب العام</span><b>{purchaseSelected.account?.name ?? "—"}</b></div>
              <div><span>التاريخ</span><b>{purchaseSelected.return_date.slice(0, 10)}</b></div>
              <div><span>الإجمالي · {purchaseSelected.items.length} بند</span><b className="text-xl text-brand">{formatMoney(purchaseSelected.total_amount)}</b></div>
            </div>
            {user?.role === "Admin" && <div className="return-detail-main-actions">
              {!purchaseSelected.cancelled_at ? <button type="button" className="btn-primary" onClick={() => { setPurchaseEditing(purchaseSelected); setPurchaseOpen(true); }}><Pencil size={17} />تعديل</button> : <button type="button" className="btn-primary" onClick={() => { setPurchaseAction("restore"); setPurchaseCancel(purchaseSelected.customer_return_id); }}><RotateCcw size={17} />استعادة المردود</button>}
            </div>}
            <ReturnNotes notes={purchaseSelected.notes} />
            <ReturnItems items={purchaseSelected.items} />
            {user?.role === "Admin" && <div className="return-detail-destructive" aria-label="إجراءات المردود الحساسة">
              {!purchaseSelected.cancelled_at && <button type="button" className="btn-outline return-detail-cancel" onClick={() => { setPurchaseAction("cancel"); setPurchaseCancel(purchaseSelected.customer_return_id); }}><Ban size={17} />إلغاء المردود</button>}
              {purchaseSelected.status === "Cancelled" && !!purchaseSelected.cancelled_at && <button type="button" className="btn-ghost return-detail-delete" onClick={() => setPurchaseDelete(purchaseSelected.customer_return_id)}><Trash2 size={17} />حذف نهائي</button>}
            </div>}
          </div>
        </Modal>
      )}
      {editor && (
        <SalesReturnEditor
          key={editing?.customer_return_id ?? "new"}
          document={editing}
          accounts={accounts}
          onClose={() => setEditor(false)}
          onSaved={(id) => {
            setEditor(false);
            void load();
            void details(id);
          }}
        />
      )}
      <ConfirmDialog
        open={!!action}
        onClose={() => setAction(null)}
        onConfirm={() => void mutate()}
        loading={saving}
        severity={action === "restore" ? "normal" : "destructive"}
        details={
          action !== "delete" ? (
            <label dir="rtl" className="block">
              <span className="rep-label">ملاحظة (اختيارية)</span>
              <input
                className="rep-control"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          ) : undefined
        }
        title="تأكيد العملية"
        message={`تأكيد ${action === "cancel" ? "إلغاء" : action === "restore" ? "استعادة" : "الحذف النهائي لـ"} ${selected?.return_number ?? ""} وآثاره المالية والمخزنية؟`}
      />
      <AccountReturnLauncher
        open={purchaseOpen}
        document={purchaseEditing}
        onClose={() => setPurchaseOpen(false)}
        onSaved={(id) => {
          setPurchaseOpen(false);
          setPurchaseEditing(null);
          void load();
          void returnsService
            .purchaseDetails(id)
            .then(setPurchaseSelected)
            .catch((e) =>
              setError(apiMessages(e, "تعذر تحديث المردود.").join("، ")),
            );
        }}
      />
      <ConfirmDialog
        open={purchaseCancel !== null}
        onClose={() => setPurchaseCancel(null)}
        onConfirm={() => {
          if (purchaseCancel !== null && !saving) {
            setSaving(true);
            void (
              purchaseAction === "cancel"
                ? returnsService.cancelPurchase(purchaseCancel)
                : returnsService.restorePurchase(purchaseCancel)
            )
              .then((r) => {
                setPurchaseCancel(null);
                setPurchaseSelected(r);
                return load();
              })
              .catch((e) => {
                setPurchaseCancel(null);
                setError(
                  apiMessages(
                    e,
                    purchaseAction === "cancel"
                      ? "تعذر إلغاء مردود الشراء."
                      : "تعذر استعادة مردود الشراء.",
                  ).join("، "),
                );
              })
              .finally(() => setSaving(false));
          }
        }}
        loading={saving}
        severity={purchaseAction === "cancel" ? "destructive" : "normal"}
        title={
          purchaseAction === "cancel"
            ? "إلغاء مردود المشتريات"
            : "استعادة مردود المشتريات"
        }
        message={
          purchaseAction === "cancel"
            ? "تأكيد عكس أثر مردود الشراء المالي والمخزني؟"
            : "تأكيد إعادة أثر مردود الشراء المالي والمخزني؟"
        }
      />
      <ConfirmDialog
        open={purchaseDelete !== null}
        onClose={() => setPurchaseDelete(null)}
        loading={saving}
        severity="destructive"
        title="حذف مردود المشتريات نهائيًا؟"
        confirmLabel="حذف نهائي"
        message="سيُحذف هذا المردود الملغى نهائيًا ولا يمكن التراجع. تم عكس المخزون والمحاسبة عند الإلغاء؛ الحذف لا ينشئ أي حركة جديدة."
        details={
          <p dir="rtl" className="text-sm text-stone-500">
            مردود #{purchaseDelete} · {purchaseSelected?.account?.name}
          </p>
        }
        onConfirm={() => {
          if (purchaseDelete === null || saving) return;
          setSaving(true);
          void returnsService
            .permanentDeletePurchase(purchaseDelete)
            .then((r) => {
              setPurchaseDelete(null);
              setPurchaseSelected(null);
              setSuccess(r.message);
              return load();
            })
            .catch((e) => {
              setPurchaseDelete(null);
              setError(apiMessages(e, "تعذر حذف مردود المشتريات.").join("، "));
            })
            .finally(() => setSaving(false));
        }}
      />
      <Modal
        open={!!success}
        title="تم الحذف"
        size="sm"
        onClose={() => setSuccess("")}
        footer={
          <button className="btn-primary w-full" onClick={() => setSuccess("")}>
            حسنًا
          </button>
        }
      >
        <p dir="rtl" role="status" className="text-center font-bold text-brand">
          {success}
        </p>
      </Modal>
    </div>
  );
}
