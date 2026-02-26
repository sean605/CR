import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Settings, User } from 'lucide-react';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const [tab, setTab] = useState<'profile' | 'organization'>('profile');

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex gap-1 border-b border-gray-800">
        <button onClick={() => setTab('profile')} className={`px-4 py-2 text-sm font-medium transition-colors ${tab === 'profile' ? 'text-brand-400 border-b-2 border-brand-400' : 'text-gray-400 hover:text-gray-200'}`}>
          <User size={14} className="inline mr-1" /> Profile
        </button>
        <button onClick={() => setTab('organization')} className={`px-4 py-2 text-sm font-medium transition-colors ${tab === 'organization' ? 'text-brand-400 border-b-2 border-brand-400' : 'text-gray-400 hover:text-gray-200'}`}>
          <Settings size={14} className="inline mr-1" /> Organization
        </button>
      </div>

      {tab === 'profile' && (
        <div className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Profile Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-gray-400 mb-1">First Name</label><input type="text" defaultValue={user.first_name} className="input-field" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Last Name</label><input type="text" defaultValue={user.last_name} className="input-field" /></div>
          </div>
          <div><label className="block text-sm text-gray-400 mb-1">Email</label><input type="email" defaultValue={user.email} className="input-field" disabled /></div>
          <div><label className="block text-sm text-gray-400 mb-1">Role</label><input type="text" defaultValue={user.role} className="input-field" disabled /></div>
          <button onClick={() => addToast({ type: 'info', message: 'Profile settings saved (coming soon)' })} className="btn-primary">Save Changes</button>
        </div>
      )}

      {tab === 'organization' && (
        <div className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Organization Settings</h3>
          <p className="text-sm text-gray-400">Manage your organization's settings, billing, and integrations.</p>
          <div className="bg-gray-900/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-400">Plan</span><span className="text-brand-400 font-medium">Trial</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Team Members</span><span className="text-gray-200">Up to 5</span></div>
          </div>
          <button onClick={() => addToast({ type: 'info', message: 'Billing management coming soon' })} className="btn-secondary">Manage Billing</button>
        </div>
      )}
    </div>
  );
}
