import { useState } from 'react';
import { useClients, useDeleteClient } from '../hooks/useClients';
import { useToast } from '../contexts/ToastContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import AddClientModal from '../components/clients/AddClientModal';
import EditClientModal from '../components/clients/EditClientModal';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import type { Client } from '../types';

export default function Clients() {
  const { data: clients, isLoading, error } = useClients();
  const deleteClientMutation = useDeleteClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.contactName?.toLowerCase().includes(search.toLowerCase()) ||
    client.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (client: Client) => {
    if (window.confirm(`Are you sure you want to delete "${client.name}"? This action cannot be undone.`)) {
      try {
        await deleteClientMutation.mutateAsync(client.id);
        toast.success(`Client "${client.name}" deleted successfully!`);
      } catch (error: any) {
        if (error.response?.data?.jobsCount) {
          toast.error(`Cannot delete client. ${error.response.data.jobsCount} associated job(s) exist.`);
        } else {
          toast.error('Failed to delete client. Please try again.');
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-8">
        Error loading clients. Please try again.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Clients</h1>
        <Button
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Search by name, contact, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Clients Table */}
      <Card>
        {filteredClients && filteredClients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Company Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Contact Person</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Phone</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Address</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id} className="border-b border-gray-800 hover:bg-rivian-hover transition-colors">
                    <td className="py-3 px-4 text-white font-medium">{client.name}</td>
                    <td className="py-3 px-4 text-gray-300">{client.contactName || '-'}</td>
                    <td className="py-3 px-4 text-gray-300">{client.email || '-'}</td>
                    <td className="py-3 px-4 text-gray-300">{client.phone || '-'}</td>
                    <td className="py-3 px-4 text-gray-300 max-w-xs truncate">{client.address || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingClient(client)}
                          className="text-rivian-accent hover:text-blue-400 transition-colors"
                          title="Edit client"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(client)}
                          className="text-red-500 hover:text-red-400 transition-colors"
                          title="Delete client"
                          disabled={deleteClientMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No clients found</p>
            <p className="text-sm mt-2">
              {search ? 'Try adjusting your search' : 'Click "Add Client" to get started'}
            </p>
          </div>
        )}
      </Card>

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Edit Client Modal */}
      {editingClient && (
        <EditClientModal
          isOpen={!!editingClient}
          onClose={() => setEditingClient(null)}
          client={editingClient}
        />
      )}
    </div>
  );
}
