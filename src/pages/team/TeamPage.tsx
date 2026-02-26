import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatDate, getInitials } from '../../lib/formatters';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { Plus, Building2, Shield, User as UserIcon } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const roleIcons: Record<string, any> = { admin: Shield, manager: Building2, agent: UserIcon };
const roleColors: Record<string, string> = { admin: 'text-red-400 bg-red-500/10', manager: 'text-yellow-400 bg-yellow-500/10', agent: 'text-blue-400 bg-blue-500/10' };

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState({ first_name: '', last_name: '', email: '', role: 'agent' });
  const [tempPassword, setTempPassword] = useState('');
  const currentUser = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);

  const fetchMembers = () => api.get<{ data: any[] }>('/team').then((r) => setMembers(r.data)).finally(() => setLoading(false));
  useEffect(() => { fetchMembers(); }, []);

  const handleInvite = async () => {
    try {
      const res = await api.post<{ data: any }>('/team/invite', invite);
      setTempPassword(res.data.temp_password);
      addToast({ type: 'success', message: 'Team member invited' });
      fetchMembers();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message });
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    await api.put(`/team/${id}`, { role });
    addToast({ type: 'success', message: 'Role updated' });
    fetchMembers();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{members.length} team member{members.length !== 1 ? 's' : ''}</p>
        {currentUser?.role === 'admin' && (
          <button onClick={() => { setShowInvite(true); setTempPassword(''); }} className="btn-primary"><Plus size={18} /> Invite Member</button>
        )}
      </div>

      {members.length === 0 ? (
        <EmptyState icon={Building2} title="No team members" description="Invite your first team member to get started" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => {
            const RoleIcon = roleIcons[m.role] || UserIcon;
            return (
              <div key={m.id} className="card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center">
                    <span className="text-brand-400 font-medium text-sm">{getInitials(m.first_name, m.last_name)}</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-200">{m.first_name} {m.last_name}</div>
                    <div className="text-xs text-gray-500">{m.email}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${roleColors[m.role]}`}>
                    <RoleIcon size={12} /> {m.role}
                  </span>
                  <span className="text-xs text-gray-600">Joined {formatDate(m.created_at)}</span>
                </div>
                {currentUser?.role === 'admin' && m.id !== currentUser.id && (
                  <div className="mt-3 pt-3 border-t border-gray-700/50">
                    <select value={m.role} onChange={(e) => handleRoleChange(m.id, e.target.value)} className="input-field text-xs py-1">
                      <option value="agent">Agent</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite Team Member">
        <div className="space-y-4">
          {tempPassword ? (
            <div className="space-y-3">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <p className="text-sm text-green-400 font-medium">Member invited successfully!</p>
                <p className="text-xs text-gray-400 mt-1">Share these credentials:</p>
                <div className="mt-2 bg-gray-900 rounded p-2 text-sm">
                  <div className="text-gray-300">Email: <span className="text-white">{invite.email}</span></div>
                  <div className="text-gray-300">Password: <span className="text-white font-mono">{tempPassword}</span></div>
                </div>
              </div>
              <button onClick={() => setShowInvite(false)} className="btn-primary w-full justify-center">Done</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-gray-400 mb-1">First Name</label><input type="text" value={invite.first_name} onChange={(e) => setInvite((f) => ({ ...f, first_name: e.target.value }))} className="input-field" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Last Name</label><input type="text" value={invite.last_name} onChange={(e) => setInvite((f) => ({ ...f, last_name: e.target.value }))} className="input-field" /></div>
              </div>
              <div><label className="block text-sm text-gray-400 mb-1">Email</label><input type="email" value={invite.email} onChange={(e) => setInvite((f) => ({ ...f, email: e.target.value }))} className="input-field" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Role</label><select value={invite.role} onChange={(e) => setInvite((f) => ({ ...f, role: e.target.value }))} className="input-field"><option value="agent">Agent</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowInvite(false)} className="btn-ghost">Cancel</button>
                <button onClick={handleInvite} className="btn-primary">Send Invite</button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
