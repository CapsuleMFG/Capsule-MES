import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash, CaretDown, CaretRight } from '@phosphor-icons/react';
import { useToast } from '../contexts/ToastContext';
import {
  useRouteTemplates,
  useRouteTemplate,
  useCreateRouteTemplate,
  useDeleteRouteTemplate,
  useAddRouteStep,
  useUpdateRouteStep,
  useDeleteRouteStep,
  useReorderRouteSteps,
} from '../hooks/usePartsTracking';
import RouteTemplateModal from '../components/parts-tracking/RouteTemplateModal';
import RouteStepEditor from '../components/parts-tracking/RouteStepEditor';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { RouteTemplate, Machine } from '../../../shared/types';
import api from '../services/api';

export default function RouteTemplates() {
  const toast = useToast();
  const { data: templates, isLoading } = useRouteTemplates();
  const createMutation = useCreateRouteTemplate();
  const deleteMutation = useDeleteRouteTemplate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RouteTemplate | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Fetch machines for step editor
  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ['machines'],
    queryFn: async () => {
      const res = await api.get<Machine[]>('/machines?active=true');
      return res.data;
    },
  });

  const handleCreate = async (data: { name: string; description: string }) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success(`Route template "${data.name}" created!`);
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create template');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete route template "${name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(`Route template "${name}" deleted`);
      if (expandedId === id) setExpandedId(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete template');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Route Templates</h1>
          <p className="text-gray-400 mt-1">Define reusable manufacturing routes for parts tracking</p>
        </div>
        <button onClick={() => { setEditingTemplate(null); setIsModalOpen(true); }} className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-3 py-1.5 rounded-[10px] active:scale-[0.98] transition-all flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {templates?.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-12 text-center">
          <p className="text-gray-400 mb-4">No route templates yet. Create one to define a manufacturing route.</p>
          <button onClick={() => setIsModalOpen(true)} className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-3 py-1.5 rounded-[10px] active:scale-[0.98] transition-all">
            Create First Template
          </button>
        </div>
      )}

      <div className="space-y-3">
        {templates?.map((template) => (
          <TemplateRow
            key={template.id}
            template={template}
            machines={machines}
            isExpanded={expandedId === template.id}
            onToggle={() => setExpandedId(expandedId === template.id ? null : template.id)}
            onEdit={() => { setEditingTemplate(template); setIsModalOpen(true); }}
            onDelete={() => handleDelete(template.id, template.name)}
          />
        ))}
      </div>

      <RouteTemplateModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTemplate(null); }}
        onSubmit={handleCreate}
        isPending={createMutation.isPending}
        template={editingTemplate}
      />
    </div>
  );
}

function TemplateRow({
  template,
  machines,
  isExpanded,
  onToggle,
  onEdit: _onEdit,
  onDelete,
}: {
  template: RouteTemplate;
  machines: Machine[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const toast = useToast();
  const { data: fullTemplate } = useRouteTemplate(isExpanded ? template.id : 0);
  const addStepMutation = useAddRouteStep(template.id);
  const updateStepMutation = useUpdateRouteStep(template.id);
  const deleteStepMutation = useDeleteRouteStep(template.id);
  const reorderMutation = useReorderRouteSteps(template.id);

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02]">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors rounded-2xl"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? <CaretDown className="w-5 h-5 text-gray-400" /> : <CaretRight className="w-5 h-5 text-gray-400" />}
          <div>
            <h3 className="text-gray-900 font-medium">{template.name}</h3>
            {template.description && <p className="text-sm text-gray-400">{template.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{template.stepCount || 0} steps</span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-red-400 hover:text-red-500 transition-colors"
          >
            <Trash className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isExpanded && fullTemplate && (
        <div className="border-t border-gray-100 p-4">
          <RouteStepEditor
            steps={fullTemplate.steps || []}
            machines={machines}
            onAddStep={(data) => {
              addStepMutation.mutate(
                { stepOrder: (fullTemplate.steps?.length || 0) + 1, stationName: data.stationName, machineId: data.machineId, estimatedMinutes: data.estimatedMinutes, notes: data.notes },
                {
                  onSuccess: () => toast.success('Step added'),
                  onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to add step'),
                }
              );
            }}
            onUpdateStep={(stepId, data) => {
              updateStepMutation.mutate(
                { stepId, data },
                {
                  onSuccess: () => toast.success('Step updated'),
                  onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to update step'),
                }
              );
            }}
            onDeleteStep={(stepId) => {
              deleteStepMutation.mutate(stepId, {
                onSuccess: () => toast.success('Step removed'),
                onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to remove step'),
              });
            }}
            onReorder={(stepIds) => {
              reorderMutation.mutate(stepIds, {
                onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to reorder'),
              });
            }}
            isAdding={addStepMutation.isPending}
          />
        </div>
      )}
    </div>
  );
}
