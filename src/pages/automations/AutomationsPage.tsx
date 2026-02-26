import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/formatters';
import { useUIStore } from '../../stores/uiStore';
import { Plus, Zap, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const TRIGGERS = [
  { value: 'lead_created', label: 'Lead Created' },
  { value: 'lead_status_changed', label: 'Lead Status Changed' },
  { value: 'deal_stage_changed', label: 'Deal Stage Changed' },
  { value: 'task_overdue', label: 'Task Overdue' },
];

const ACTIONS = [
  { value: 'assign_user', label: 'Assign to User' },
  { value: 'change_status', label: 'Change Status' },
  { value: 'create_task', label: 'Create Task' },
  { value: 'send_email', label: 'Send Email' },
  { value: 'add_note', label: 'Add Note' },
];

export default function AutomationsPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', trigger_type: 'lead_created', action_type: 'create_task' });
  const addToast = useUIStore((s) => s.addToast);

  const fetchRules = () => api.get<{ data: any[] }>('/automations').then((r) => setRules(r.data)).finally(() => setLoading(false));
  useEffect(() => { fetchRules(); }, []);

  const handleCreate = async () => {
    if (!form.name) return;
    await api.post('/automations', form);
    setShowForm(false);
    setForm({ name: '', trigger_type: 'lead_created', action_type: 'create_task' });
    addToast({ type: 'success', message: 'Automation created' });
    fetchRules();
  };

  const handleToggle = async (id: string) => {
    await api.put(`/automations/${id}/toggle`);
    addToast({ type: 'info', message: 'Automation toggled' });
    fetchRules();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this automation?')) return;
    await api.delete(`/automations/${id}`);
    addToast({ type: 'success', message: 'Automation deleted' });
    fetchRules();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-gray-400">{rules.length} automation rule{rules.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={18} /> New Automation</button>
      </div>

      {rules.length === 0 ? (
        <EmptyState icon={Zap} title="No automations yet" description="Create rules to automate repetitive tasks like lead assignment and follow-ups" />
      ) : (
        <div className="space-y-3">
          {rules.map((r) => (
            <div key={r.id} className="card px-4 py-3 flex items-center gap-4">
              <button onClick={() => handleToggle(r.id)} className="flex-shrink-0">
                {r.is_active ? <ToggleRight size={24} className="text-green-400" /> : <ToggleLeft size={24} className="text-gray-600" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-200">{r.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded">When: {TRIGGERS.find((t) => t.value === r.trigger_type)?.label || r.trigger_type}</span>
                  <span className="text-gray-600">→</span>
                  <span className="text-xs bg-brand-500/10 text-brand-400 px-2 py-0.5 rounded">Then: {ACTIONS.find((a) => a.value === r.action_type)?.label || r.action_type}</span>
                </div>
              </div>
              <span className="text-xs text-gray-600">{formatDate(r.created_at)}</span>
              <button onClick={() => handleDelete(r.id)} className="text-gray-600 hover:text-red-400"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Automation Rule">
        <div className="space-y-4">
          <div><label className="block text-sm text-gray-400 mb-1">Rule Name</label><input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Auto-assign new leads" /></div>
          <div><label className="block text-sm text-gray-400 mb-1">When this happens (Trigger)</label><select value={form.trigger_type} onChange={(e) => setForm((f) => ({ ...f, trigger_type: e.target.value }))} className="input-field">{TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          <div><label className="block text-sm text-gray-400 mb-1">Do this (Action)</label><select value={form.action_type} onChange={(e) => setForm((f) => ({ ...f, action_type: e.target.value }))} className="input-field">{ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</select></div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleCreate} className="btn-primary">Create Rule</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
