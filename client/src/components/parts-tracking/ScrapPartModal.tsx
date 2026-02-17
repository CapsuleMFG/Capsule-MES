import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { TrackedPart } from '../../../../shared/types';

interface ScrapPartModalProps {
  isOpen: boolean;
  onClose: () => void;
  part: TrackedPart | null;
  onSubmit: (scrapReason: string) => void;
  isPending: boolean;
}

export default function ScrapPartModal({ isOpen, onClose, part, onSubmit, isPending }: ScrapPartModalProps) {
  const [scrapReason, setScrapReason] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setScrapReason('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapReason.trim()) return;
    onSubmit(scrapReason.trim());
  };

  if (!part) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scrap Part">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Part info */}
        <div className="bg-rivian-soft-black rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Tracking ID</span>
            <span className="text-white font-mono">{part.trackingId || `#${part.id}`}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Part Number</span>
            <span className="text-white">{part.partNumber || '-'}</span>
          </div>
          {part.currentStationName && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Current Station</span>
              <span className="text-white">{part.currentStationName}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Status</span>
            <span className="text-white">{part.status}</span>
          </div>
        </div>

        {/* Scrap Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Scrap Reason <span className="text-red-400">*</span>
          </label>
          <textarea
            value={scrapReason}
            onChange={(e) => setScrapReason(e.target.value)}
            placeholder="Why is this part being scrapped?"
            rows={3}
            className="w-full bg-rivian-soft-black border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rivian-accent"
            required
            autoFocus
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            type="submit"
            disabled={isPending || !scrapReason.trim()}
          >
            {isPending ? 'Scrapping...' : 'Scrap Part'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
