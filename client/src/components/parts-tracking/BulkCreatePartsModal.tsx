import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useRouteTemplates } from '../../hooks/usePartsTracking';
import type { BomItem, IdentificationType } from '../../../../shared/types';

interface BulkCreatePartsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    bomItemId?: number;
    quantity: number;
    routeTemplateId?: number;
    identificationType?: IdentificationType;
    trackingIdPrefix?: string;
    partNumber?: string;
    description?: string;
  }) => void;
  isPending: boolean;
  jobId: number;
  bomItems?: BomItem[];
}

export default function BulkCreatePartsModal({ isOpen, onClose, onSubmit, isPending, jobId, bomItems = [] }: BulkCreatePartsModalProps) {
  const { data: templates } = useRouteTemplates();
  const [bomItemId, setBomItemId] = useState<string>('');
  const [quantity, setQuantity] = useState('1');
  const [routeTemplateId, setRouteTemplateId] = useState<string>('');
  const [identificationType, setIdentificationType] = useState<IdentificationType>('Other');
  const [trackingIdPrefix, setTrackingIdPrefix] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [description, setDescription] = useState('');

  // Pre-fill from selected BOM item
  useEffect(() => {
    if (bomItemId) {
      const item = bomItems.find(b => b.id === Number(bomItemId));
      if (item) {
        setQuantity(String(item.quantity));
        setPartNumber(item.partNumber || '');
        setDescription(item.description || '');
      }
    }
  }, [bomItemId, bomItems]);

  useEffect(() => {
    if (!isOpen) {
      setBomItemId('');
      setQuantity('1');
      setRouteTemplateId('');
      setIdentificationType('Other');
      setTrackingIdPrefix('');
      setPartNumber('');
      setDescription('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      bomItemId: bomItemId ? Number(bomItemId) : undefined,
      quantity: Number(quantity),
      routeTemplateId: routeTemplateId ? Number(routeTemplateId) : undefined,
      identificationType,
      trackingIdPrefix: trackingIdPrefix || undefined,
      partNumber: partNumber || undefined,
      description: description || undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Create Tracked Parts" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {bomItems.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">BOM Item (optional)</label>
            <select
              value={bomItemId}
              onChange={(e) => setBomItemId(e.target.value)}
              className="w-full bg-rivian-black border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-rivian-accent"
            >
              <option value="">-- Select BOM item --</option>
              {bomItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.partNumber} - {item.description || 'No description'} (qty: {item.quantity})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Quantity *</label>
            <input
              type="number"
              min="1"
              max="1000"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-rivian-black border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-rivian-accent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Route Template</label>
            <select
              value={routeTemplateId}
              onChange={(e) => setRouteTemplateId(e.target.value)}
              className="w-full bg-rivian-black border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-rivian-accent"
            >
              <option value="">-- No route --</option>
              {templates?.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.stepCount} steps)</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">ID Type</label>
            <select
              value={identificationType}
              onChange={(e) => setIdentificationType(e.target.value as IdentificationType)}
              className="w-full bg-rivian-black border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-rivian-accent"
            >
              <option value="QR">QR Code</option>
              <option value="Engraved">Engraved</option>
              <option value="Sticker">Sticker</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tracking ID Prefix</label>
            <input
              type="text"
              value={trackingIdPrefix}
              onChange={(e) => setTrackingIdPrefix(e.target.value)}
              className="w-full bg-rivian-black border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-rivian-accent"
              placeholder="e.g., BRK-001 → BRK-001-001, BRK-001-002..."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Part Number</label>
            <input
              type="text"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              className="w-full bg-rivian-black border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-rivian-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-rivian-black border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-rivian-accent"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-300 hover:text-white transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isPending || Number(quantity) < 1} className="btn-primary disabled:opacity-50">
            {isPending ? 'Creating...' : `Create ${quantity} Part${Number(quantity) !== 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
