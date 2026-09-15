import { AlertTriangle, CircleHelp, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import Modal from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  severity?: "normal" | "destructive";
  details?: ReactNode;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  loading = false,
  severity = "destructive",
  details,
}: ConfirmDialogProps) {
  const destructive = severity === "destructive";
  const Icon = destructive ? AlertTriangle : CircleHelp;

  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onClose}
      title={title}
      size="sm"
    >
      <div dir="rtl" className="flex gap-4 text-right">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${destructive ? "bg-red-100" : "bg-brand-50"}`}
        >
          <Icon
            className={`h-6 w-6 ${destructive ? "text-red-600" : "text-brand"}`}
          />
        </div>
        <p className="pt-2 text-sm text-stone-600 leading-relaxed">{message}</p>
      </div>
      {details && (
        <div
          dir="rtl"
          className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600"
        >
          {details}
        </div>
      )}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          disabled={loading}
          onClick={onConfirm}
          className={`${destructive ? "btn-danger" : "btn-primary"} flex-1 disabled:cursor-wait disabled:opacity-60`}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> جاري التنفيذ…
            </span>
          ) : (
            confirmLabel
          )}
        </button>
        <button
          disabled={loading}
          onClick={onClose}
          className="btn-outline flex-1 disabled:opacity-50"
        >
          {cancelLabel}
        </button>
      </div>
    </Modal>
  );
}
