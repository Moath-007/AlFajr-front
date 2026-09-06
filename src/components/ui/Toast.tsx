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
    <div className="fixed bottom-4 left-4 z-[60] flex flex-col gap-2 animate-slide-in">
      {notifications.map((n) => {
        const Icon = iconMap[n.type];
        return (
          <div
            key={n.id}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-white shadow-lg ${styleMap[n.type]} min-w-[280px] max-w-md`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="text-sm font-bold flex-1">{n.message}</span>
            <button onClick={() => onDismiss(n.id)} className="shrink-0 opacity-80 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
