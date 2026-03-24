import { useState } from 'react';
import { useProfiles, useCreateUser, useUpdateProfile } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import type { Profile, CreateUserRequest, UpdateProfileRequest, UserRole } from '../../../shared/types';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'supply_chain', label: 'Supply Chain' },
  { value: 'operator', label: 'Operator' },
];

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface AddUserModalProps {
  onClose: () => void;
}

function AddUserModal({ onClose }: AddUserModalProps) {
  const { mutateAsync: createUser, isPending } = useCreateUser();
  const toast = useToast();
  const [form, setForm] = useState<CreateUserRequest>({ email: '', password: '', name: '', role: 'operator', pin: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const payload: CreateUserRequest = { ...form };
      if (!payload.pin) delete payload.pin;
      await createUser(payload);
      toast.success(`User ${form.name} created successfully`);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create user';
      setError(msg);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Add User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-3">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2 ring-1 ring-gray-200 rounded-[10px] text-sm text-gray-900 focus:ring-2 focus:ring-gray-900 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full px-3 py-2 ring-1 ring-gray-200 rounded-[10px] text-sm text-gray-900 focus:ring-2 focus:ring-gray-900 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 ring-1 ring-gray-200 rounded-[10px] text-sm text-gray-900 focus:ring-2 focus:ring-gray-900 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
              className="w-full px-3 py-2 ring-1 ring-gray-200 rounded-[10px] text-sm text-gray-900 focus:ring-2 focus:ring-gray-900 outline-none bg-white">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kiosk PIN <span className="text-gray-400 font-normal">(optional, operators only)</span></label>
            <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={form.pin || ''} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))}
              placeholder="4–6 digits"
              className="w-full px-3 py-2 ring-1 ring-gray-200 rounded-[10px] text-sm text-gray-900 focus:ring-2 focus:ring-gray-900 outline-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 ring-1 ring-gray-200 rounded-[10px] text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm rounded-[10px] disabled:opacity-50">
              {isPending ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditUserModalProps {
  profile: Profile;
  onClose: () => void;
}

function EditUserModal({ profile, onClose }: EditUserModalProps) {
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile(profile.id);
  const toast = useToast();
  const [form, setForm] = useState<UpdateProfileRequest & { pin: string }>({
    name: profile.name,
    role: profile.role,
    isActive: profile.isActive,
    pin: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const payload: UpdateProfileRequest = { name: form.name, role: form.role, isActive: form.isActive };
      if (form.pin) payload.pin = form.pin;
      await updateProfile(payload);
      toast.success(`User ${form.name} updated successfully`);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user';
      setError(msg);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Edit User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-3">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" required value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 ring-1 ring-gray-200 rounded-[10px] text-sm text-gray-900 focus:ring-2 focus:ring-gray-900 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={form.role || 'operator'} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
              className="w-full px-3 py-2 ring-1 ring-gray-200 rounded-[10px] text-sm text-gray-900 focus:ring-2 focus:ring-gray-900 outline-none bg-white">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Set new PIN <span className="text-gray-400 font-normal">(leave blank to keep current)</span></label>
            <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))}
              placeholder="4–6 digits"
              className="w-full px-3 py-2 ring-1 ring-gray-200 rounded-[10px] text-sm text-gray-900 focus:ring-2 focus:ring-gray-900 outline-none" />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-medium text-gray-700">Active</span>
            <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isActive ? 'bg-gray-900' : 'bg-gray-200'}`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-[18px]' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 ring-1 ring-gray-200 rounded-[10px] text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm rounded-[10px] disabled:opacity-50">
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const { data: profiles, isLoading, error } = useProfiles();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<Profile | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage user accounts and roles</p>
        </div>
        <button onClick={() => setIsAddOpen(true)}
          className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-[10px] active:scale-[0.98] transition-all">
          Add User
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading users...</p>}
      {error && <p className="text-sm text-red-600">Failed to load users</p>}

      {profiles && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {profiles.map(profile => (
                <tr key={profile.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{profile.name}</td>
                  <td className="px-4 py-3 text-gray-500">{profile.email}</td>
                  <td className="px-4 py-3 text-gray-700">{capitalize(profile.role)}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${profile.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                      <span className="text-gray-600">{profile.isActive ? 'Active' : 'Inactive'}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditProfile(profile)}
                      className="text-sm text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded px-2.5 py-1 transition-colors">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAddOpen && <AddUserModal onClose={() => setIsAddOpen(false)} />}
      {editProfile && <EditUserModal profile={editProfile} onClose={() => setEditProfile(null)} />}
    </div>
  );
}
