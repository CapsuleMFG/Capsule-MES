import { useState } from 'react';
import Modal from '../ui/Modal';

interface KioskFlagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  jobNumber: string;
}

const REASONS = [
  'Blocked — Material',
  'Blocked — Machine Issue',
  'Blocked — Quality Hold',
  'Blocked — Other',
];

export default function KioskFlagModal({ isOpen, onClose, onSubmit, jobNumber }: KioskFlagModalProps) {
  const [selected, setSelected] = useState('');
  const [customNote, setCustomNote] = useState('');

  const handleSubmit = () => {
    const reason = selected === 'Blocked — Other' && customNote
      ? `Other: ${customNote}`
      : selected;
    if (reason) {
      onSubmit(reason);
      setSelected('');
      setCustomNote('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Flag Issue — ${jobNumber}`}>
      <div className="space-y-3">
        {REASONS.map((reason) => (
          <button
            key={reason}
            onClick={() => setSelected(reason)}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${
              selected === reason
                ? 'bg-gray-900 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {reason}
          </button>
        ))}

        {selected === 'Blocked — Other' && (
          <textarea
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Describe the issue..."
            className="w-full px-3 py-2 text-sm rounded-xl"
            rows={3}
          />
        )}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!selected}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-[10px] flex-1 disabled:opacity-50"
          >
            Flag Issue
          </button>
        </div>
      </div>
    </Modal>
  );
}
