import { useState } from 'react';
import { useCreateJob } from '../../hooks/useJobs';
import { useClients } from '../../hooks/useClients';
import { useEngineers } from '../../hooks/useEngineers';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

interface QuickAddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickAddJobModal({ isOpen, onClose }: QuickAddJobModalProps) {
  const { data: clients, isLoading: loadingClients } = useClients();
  const { data: engineers } = useEngineers(true);
  const createJobMutation = useCreateJob();
  const toast = useToast();

  const [formData, setFormData] = useState({
    jobNumber: '',
    clientId: '',
    engineerId: '',
    description: '',
    targetStartDate: '',
    targetEndDate: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!formData.jobNumber.trim()) {
      newErrors.jobNumber = 'Job number is required';
    }
    if (!formData.clientId) {
      newErrors.clientId = 'Client is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const result = await createJobMutation.mutateAsync({
        jobNumber: formData.jobNumber.trim(),
        clientId: parseInt(formData.clientId),
        description: formData.description,
        targetStartDate: formData.targetStartDate || undefined,
        targetEndDate: formData.targetEndDate || undefined,
        notes: formData.notes || undefined,
        engineerId: formData.engineerId ? parseInt(formData.engineerId) : undefined,
      });

      setFormData({
        jobNumber: '',
        clientId: '',
        engineerId: '',
        description: '',
        targetStartDate: '',
        targetEndDate: '',
        notes: '',
      });
      setErrors({});
      toast.success(`Job ${result.jobNumber} created successfully!`);
      onClose();
    } catch (error: any) {
      console.error('Failed to create job:', error);
      const msg = error.response?.data?.error || 'Failed to create job. Please try again.';
      toast.error(msg);
      setErrors({ submit: msg });
    }
  };

  const handleClose = () => {
    if (!createJobMutation.isPending) {
      setFormData({
        jobNumber: '',
        clientId: '',
        engineerId: '',
        description: '',
        targetStartDate: '',
        targetEndDate: '',
        notes: '',
      });
      setErrors({});
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Job" maxWidth="lg">
      {loadingClients ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Job Number *"
              placeholder="e.g. JOB-001"
              value={formData.jobNumber}
              onChange={(e) => setFormData({ ...formData, jobNumber: e.target.value })}
              error={errors.jobNumber}
            />

            <Select
              label="Client *"
              options={[
                { value: '', label: 'Select a client...' },
                ...(clients || []).map((client) => ({
                  value: client.id,
                  label: client.name,
                })),
              ]}
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              error={errors.clientId}
            />
          </div>

          <Select
            label="Engineer"
            options={[
              { value: '', label: 'Unassigned' },
              ...(engineers || []).map((eng) => ({
                value: eng.id,
                label: eng.name,
              })),
            ]}
            value={formData.engineerId}
            onChange={(e) => setFormData({ ...formData, engineerId: e.target.value })}
          />

          <Input
            label="Description *"
            placeholder="Enter job description..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            error={errors.description}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Target Start Date"
              type="date"
              value={formData.targetStartDate}
              onChange={(e) => setFormData({ ...formData, targetStartDate: e.target.value })}
            />

            <Input
              label="Target End Date"
              type="date"
              value={formData.targetEndDate}
              onChange={(e) => setFormData({ ...formData, targetEndDate: e.target.value })}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              className="w-full bg-white text-gray-900 border border-gray-200 rounded-lg px-3 py-2 min-h-[100px] focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-sm"
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={createJobMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createJobMutation.isPending}
              className="flex items-center gap-2"
            >
              {createJobMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  Creating...
                </>
              ) : (
                'Create Job'
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
