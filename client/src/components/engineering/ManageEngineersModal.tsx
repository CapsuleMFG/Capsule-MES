import { useState } from 'react';
import { useEngineers, useCreateEngineer, useUpdateEngineer, useDeleteEngineer } from '../../hooks/useEngineers';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Plus, PencilSimple, Trash, Check, X } from '@phosphor-icons/react';
import type { Engineer } from '../../types';

interface ManageEngineersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManageEngineersModal({ isOpen, onClose }: ManageEngineersModalProps) {
  const { data: engineers, isLoading } = useEngineers();
  const createMutation = useCreateEngineer();
  const deleteMutation = useDeleteEngineer();
  const toast = useToast();

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await createMutation.mutateAsync({ name: newName.trim(), email: newEmail.trim() || undefined });
      toast.success(`Engineer "${newName.trim()}" added`);
      setNewName('');
      setNewEmail('');
    } catch {
      toast.error('Failed to add engineer');
    }
  };

  const startEdit = (eng: Engineer) => {
    setEditingId(eng.id);
    setEditName(eng.name);
    setEditEmail(eng.email || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditEmail('');
  };

  const handleDelete = async (eng: Engineer) => {
    if (!confirm(`Delete engineer "${eng.name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(eng.id);
      toast.success(`Engineer "${eng.name}" deleted`);
    } catch {
      toast.error('Failed to delete engineer');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Engineers" maxWidth="md">
      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Add new engineer */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Engineer name"
                className="w-full bg-white text-gray-900 border border-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Email (optional)"
                className="w-full bg-white text-gray-900 border border-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAdd}
              disabled={!newName.trim() || createMutation.isPending}
              className="!px-3 !py-2"
            >
              <Plus size={16} />
            </Button>
          </div>

          {/* Engineers list */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] overflow-hidden">
            {engineers && engineers.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {engineers.map((eng) => (
                  <EngineerRow
                    key={eng.id}
                    engineer={eng}
                    isEditing={editingId === eng.id}
                    editName={editName}
                    editEmail={editEmail}
                    onEditNameChange={setEditName}
                    onEditEmailChange={setEditEmail}
                    onStartEdit={() => startEdit(eng)}
                    onCancelEdit={cancelEdit}
                    onDelete={() => handleDelete(eng)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-gray-400">
                No engineers added yet
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function EngineerRow({
  engineer,
  isEditing,
  editName,
  editEmail,
  onEditNameChange,
  onEditEmailChange,
  onStartEdit,
  onCancelEdit,
  onDelete,
}: {
  engineer: Engineer;
  isEditing: boolean;
  editName: string;
  editEmail: string;
  onEditNameChange: (v: string) => void;
  onEditEmailChange: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const updateMutation = useUpdateEngineer(engineer.id);
  const toast = useToast();

  const handleSave = async () => {
    if (!editName.trim()) return;
    try {
      await updateMutation.mutateAsync({
        name: editName.trim(),
        email: editEmail.trim() || undefined,
      });
      toast.success(`Engineer updated`);
      onCancelEdit();
    } catch {
      toast.error('Failed to update engineer');
    }
  };

  const handleToggleActive = async () => {
    try {
      await updateMutation.mutateAsync({ active: !engineer.active });
      toast.success(`Engineer ${engineer.active ? 'deactivated' : 'activated'}`);
    } catch {
      toast.error('Failed to update engineer');
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 px-4 py-3">
        <input
          type="text"
          value={editName}
          onChange={(e) => onEditNameChange(e.target.value)}
          className="flex-1 bg-white text-gray-900 border border-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <input
          type="email"
          value={editEmail}
          onChange={(e) => onEditEmailChange(e.target.value)}
          placeholder="Email"
          className="flex-1 bg-white text-gray-900 border border-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button
          onClick={handleSave}
          disabled={!editName.trim() || updateMutation.isPending}
          className="p-1.5 text-emerald-500 hover:bg-gray-50 rounded transition-colors disabled:opacity-50"
        >
          <Check size={16} />
        </button>
        <button
          onClick={onCancelEdit}
          className="p-1.5 text-gray-400 hover:bg-gray-50 rounded transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${engineer.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
            {engineer.name}
          </span>
          {!engineer.active && (
            <span className="text-[10px] px-1.5 py-px rounded bg-gray-100 text-gray-400">Inactive</span>
          )}
        </div>
        {engineer.email && (
          <span className="text-xs text-gray-400">{engineer.email}</span>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleToggleActive}
          className={`px-2 py-1 text-[10px] rounded font-medium transition-colors ${
            engineer.active
              ? 'text-amber-600 hover:bg-gray-50'
              : 'text-emerald-600 hover:bg-gray-50'
          }`}
        >
          {engineer.active ? 'Deactivate' : 'Activate'}
        </button>
        <button
          onClick={onStartEdit}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
        >
          <PencilSimple size={14} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded transition-colors"
        >
          <Trash size={14} />
        </button>
      </div>
    </div>
  );
}
