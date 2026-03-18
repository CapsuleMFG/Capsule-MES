import { Dialog } from '@headlessui/react';
import { X } from '@phosphor-icons/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl';
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'md' }: ModalProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <Dialog.Panel
          className={`${maxWidthClasses[maxWidth]} w-full bg-white rounded-2xl shadow-xl my-8 max-h-[calc(100vh-4rem)] flex flex-col animate-modalIn`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <Dialog.Title className="text-sm font-semibold text-gray-900">
              {title}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5 overflow-y-auto flex-1">
            {children}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
