import { useState, useEffect } from 'react';
import { useUpdateJob } from '../../hooks/useJobs';
import { useClients } from '../../hooks/useClients';
import { useEngineers } from '../../hooks/useEngineers';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import type { Job, JobStatus, UpdateWorkflowStageRequest } from '../../types';
import * as jobsService from '../../services/jobs.service';

interface EditJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
}

export default function EditJobModal({ isOpen, onClose, job }: EditJobModalProps) {
  const { data: clients, isLoading: loadingClients } = useClients();
  const { data: engineers } = useEngineers(true);
  const updateJobMutation = useUpdateJob(job.id);
  const toast = useToast();

  // Find current engineer from Engineering stage assignee
  const engineeringStage = job.workflowProgress?.find((p) => p.stageName === 'Engineering');
  const currentEngineerId = engineers?.find((e) => e.name === engineeringStage?.assignee)?.id?.toString() || '';

  const [formData, setFormData] = useState({
    clientId: job.clientId.toString(),
    engineerId: currentEngineerId,
    description: job.description,
    status: job.status as JobStatus,
    targetStartDate: job.targetStartDate || '',
    targetEndDate: job.targetEndDate || '',
    startDate: job.startDate ? job.startDate.split(' ')[0] : '',
    completedDate: job.completedDate || '',
    notes: job.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form when job or engineers changes
  useEffect(() => {
    const engStage = job.workflowProgress?.find((p) => p.stageName === 'Engineering');
    const engId = engineers?.find((e) => e.name === engStage?.assignee)?.id?.toString() || '';
    setFormData({
      clientId: job.clientId.toString(),
      engineerId: engId,
      description: job.description,
      status: job.status,
      targetStartDate: job.targetStartDate || '',
      targetEndDate: job.targetEndDate || '',
      startDate: job.startDate ? job.startDate.split(' ')[0] : '',
      completedDate: job.completedDate || '',
      notes: job.notes || '',
    });
  }, [job, engineers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};

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
      await updateJobMutation.mutateAsync({
        clientId: parseInt(formData.clientId),
        description: formData.description,
        status: formData.status,
        targetStartDate: formData.targetStartDate || undefined,
        targetEndDate: formData.targetEndDate || undefined,
        startDate: formData.startDate || undefined,
        completedDate: formData.completedDate || undefined,
        notes: formData.notes || undefined,
      });

      // Update Engineering stage assignee if engineer changed
      const engStage = job.workflowProgress?.find((p) => p.stageName === 'Engineering');
      if (engStage) {
        const selectedEngineer = engineers?.find((e) => e.id.toString() === formData.engineerId);
        const newAssignee = selectedEngineer?.name || '';
        if (newAssignee !== (engStage.assignee || '')) {
          await jobsService.updateWorkflowStage(job.id, engStage.stageId, {
            status: engStage.status,
            assignee: newAssignee,
          });
        }
      }

      setErrors({});
      toast.success(`Job ${job.jobNumber} updated successfully!`);
      onClose();
    } catch (error) {
      console.error('Failed to update job:', error);
      toast.error('Failed to update job. Please try again.');
      setErrors({ submit: 'Failed to update job. Please try again.' });
    }
  };

  const handleClose = () => {
    if (!updateJobMutation.isPending) {
      setErrors({});
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Job" maxWidth="lg">
      {loadingClients ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded text-red-500 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Job Number - Read Only */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Job Number
            </label>
            <div className="w-full bg-gray-800 text-gray-400 border border-gray-700 rounded px-3 py-2">
              {job.jobNumber}
            </div>
          </div>

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

          <Select
            label="Status *"
            options={[
              { value: 'Active', label: 'Active' },
              { value: 'On Hold', label: 'On Hold' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Cancelled', label: 'Cancelled' },
            ]}
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as JobStatus })}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Actual Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />

            <Input
              label="Actual Completed Date"
              type="date"
              value={formData.completedDate}
              onChange={(e) => setFormData({ ...formData, completedDate: e.target.value })}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              className="w-full bg-rivian-soft-black text-white border border-gray-700 rounded px-3 py-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-rivian-accent"
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
              disabled={updateJobMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={updateJobMutation.isPending}
              className="flex items-center gap-2"
            >
              {updateJobMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  Updating...
                </>
              ) : (
                'Update Job'
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
