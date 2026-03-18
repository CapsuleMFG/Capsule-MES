import { useState, useEffect } from 'react';
import { useUpdateClient } from '../../hooks/useClients';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import type { Client } from '../../types';

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
}

export default function EditClientModal({ isOpen, onClose, client }: EditClientModalProps) {
  const updateClientMutation = useUpdateClient(client.id);
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: client.name,
    contactName: client.contactName || '',
    email: client.email || '',
    phone: client.phone || '',
    address: client.address || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form when client changes
  useEffect(() => {
    setFormData({
      name: client.name,
      contactName: client.contactName || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
    });
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Company name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await updateClientMutation.mutateAsync({
        name: formData.name,
        contactName: formData.contactName || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
      });

      setErrors({});
      toast.success(`Client "${formData.name}" updated successfully!`);
      onClose();
    } catch (error) {
      console.error('Failed to update client:', error);
      toast.error('Failed to update client. Please try again.');
      setErrors({ submit: 'Failed to update client. Please try again.' });
    }
  };

  const handleClose = () => {
    if (!updateClientMutation.isPending) {
      setErrors({});
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Client" maxWidth="lg">
      <form onSubmit={handleSubmit}>
        {errors.submit && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
            {errors.submit}
          </div>
        )}

        <Input
          label="Company Name *"
          placeholder="e.g., Lennar Homes"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          error={errors.name}
        />

        <Input
          label="Contact Person"
          placeholder="e.g., John Smith"
          value={formData.contactName}
          onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="e.g., contact@company.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <Input
            label="Phone"
            type="tel"
            placeholder="e.g., 555-0123"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Address
          </label>
          <textarea
            className="w-full bg-white text-gray-900 border border-gray-100 rounded px-3 py-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Full address..."
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={updateClientMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={updateClientMutation.isPending}
            className="flex items-center gap-2"
          >
            {updateClientMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" />
                Updating...
              </>
            ) : (
              'Update Client'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
