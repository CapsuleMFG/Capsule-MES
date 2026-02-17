import { useToast } from '../../contexts/ToastContext';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'error':
        return <XCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/20 border-green-500 text-green-500';
      case 'error':
        return 'bg-red-500/20 border-red-500 text-red-500';
      case 'warning':
        return 'bg-yellow-500/20 border-yellow-500 text-yellow-500';
      case 'info':
        return 'bg-blue-500/20 border-blue-500 text-blue-500';
      default:
        return '';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-lg border-2 shadow-lg
            backdrop-blur-sm min-w-[320px] max-w-md
            animate-in slide-in-from-right duration-300
            ${getStyles(toast.type)}
          `}
        >
          <div className="flex-shrink-0">
            {getIcon(toast.type)}
          </div>
          <p className="flex-1 text-sm font-medium text-white">
            {toast.message}
          </p>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
