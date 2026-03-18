import { useState } from 'react';
import { useCreateClient } from '../../hooks/useClients';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddClientModal({ isOpen, onClose }: AddClientModalProps) {
  const createClientMutation = useCreateClient();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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
      await createClientMutation.mutateAsync({
        name: formData.name,
        contactName: formData.contactName || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
      });

      // Reset form and close modal
      setFormData({
        name: '',
        contactName: '',
        email: '',
        phone: '',
        address: '',
      });
      setErrors({});
      toast.success(`Client "${formData.name}" added successfully!`);
      onClose();
    } catch (error) {
      console.error('Failed to create client:', error);
      toast.error('Failed to create client. Please try again.');
      setErrors({ submit: 'Failed to create client. Please try again.' });
    }
  };

  const handleClose = () => {
    if (!createClientMutation.isPending) {
      setFormData({
        name: '',
        contactName: '',
        email: '',
        phone: '',
        address: '',
      });
      setErrors({});
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Client" maxWidth="lg">
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
            disabled={createClientMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={createClientMutation.isPending}
            className="flex items-center gap-2"
          >
            {createClientMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" />
                Adding...
              </>
            ) : (
              'Add Client'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
