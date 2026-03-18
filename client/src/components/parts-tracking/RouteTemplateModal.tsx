import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import type { RouteTemplate } from '../../../../shared/types';

interface RouteTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string }) => void;
  isPending: boolean;
  template?: RouteTemplate | null;
}

export default function RouteTemplateModal({ isOpen, onClose, onSubmit, isPending, template }: RouteTemplateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [template, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={template ? 'Edit Route Template' : 'New Route Template'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Template Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-blue-500"
            placeholder="e.g., Sheet Metal Route"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-blue-500"
            rows={3}
            placeholder="Describe this route template..."
          />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isPending || !name.trim()} className="btn-primary disabled:opacity-50">
            {isPending ? 'Saving...' : template ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
