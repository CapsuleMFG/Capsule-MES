import { CheckCircle, XCircle, WarningCircle, Info, X } from '@phosphor-icons/react';
import { useToast } from '../../contexts/ToastContext';

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={20} className="text-emerald-500" />;
      case 'error':   return <XCircle size={20} className="text-red-500" />;
      case 'warning': return <WarningCircle size={20} className="text-amber-500" />;
      case 'info':    return <Info size={20} className="text-blue-500" />;
      default:        return null;
    }
  };

  const getLeftBorder = (type: string) => {
    switch (type) {
      case 'success': return 'border-l-4 border-emerald-500';
      case 'error':   return 'border-l-4 border-red-500';
      case 'warning': return 'border-l-4 border-amber-500';
      case 'info':    return 'border-l-4 border-blue-500';
      default:        return 'border-l-4 border-gray-200';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-xl
            bg-white shadow-lg ring-1 ring-black/[0.05]
            min-w-[320px] max-w-md
            animate-slideInRight
            ${getLeftBorder(toast.type)}
          `}
        >
          {getIcon(toast.type)}
          <p className="flex-1 text-sm font-medium text-gray-900">
            {toast.message}
          </p>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
