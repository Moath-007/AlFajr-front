import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import type { Notification } from '@/store/useStore';

interface ToastProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const styleMap = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-brand',
};

export default function Toast({ notifications, onDismiss }: ToastProps) {
  return (
    <div aria-live="polite" aria-atomic="false" className="fixed bottom-4 left-4 right-4 z-[60] flex flex-col items-start gap-2 animate-slide-in sm:right-auto sm:max-w-md">
      {notifications.map((n) => {
        const Icon = iconMap[n.type];
        return (
          <div
            key={n.id}
            className={`flex w-full min-w-0 items-center gap-3 rounded-xl px-4 py-3 text-white shadow-lg ${styleMap[n.type]} sm:min-w-[280px] sm:max-w-md`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="min-w-0 flex-1 break-words text-sm font-bold">{n.message}</span>
            <button type="button" aria-label="إغلاق الإشعار" onClick={() => onDismiss(n.id)} className="shrink-0 opacity-80 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
