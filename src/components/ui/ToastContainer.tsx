import { useUIStore } from '../../stores/uiStore';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import clsx from 'clsx';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const colors = {
  success: 'border-green-500 bg-green-500/10',
  error: 'border-red-500 bg-red-500/10',
  info: 'border-brand-500 bg-brand-500/10',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={clsx(
              'toast-enter flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg min-w-[300px]',
              colors[toast.type]
            )}
          >
            <Icon size={18} className="flex-shrink-0" />
            <span className="text-sm text-gray-200 flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-500 hover:text-gray-300"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
