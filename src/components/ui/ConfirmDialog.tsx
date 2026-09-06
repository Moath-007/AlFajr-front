import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <p className="pt-2 text-sm text-stone-600 leading-relaxed">{message}</p>
      </div>
      <div className="mt-6 flex gap-3">
        <button onClick={onConfirm} className="btn-danger flex-1">
          {confirmLabel}
        </button>
        <button onClick={onClose} className="btn-outline flex-1">
          {cancelLabel}
        </button>
      </div>
    </Modal>
  );
}
