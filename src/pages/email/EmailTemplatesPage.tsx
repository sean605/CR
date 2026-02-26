import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/formatters';
import { useUIStore } from '../../stores/uiStore';
import { Plus, Mail, Edit, Trash2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', subject: '', body: '', category: 'general' });
  const addToast = useUIStore((s) => s.addToast);

  const fetchTemplates = () => api.get<{ data: any[] }>('/email/templates').then((r) => setTemplates(r.data)).finally(() => setLoading(false));
  useEffect(() => { fetchTemplates(); }, []);

  const handleSave = async () => {
    if (!form.name || !form.subject || !form.body) return;
    if (editing) {
      await api.put(`/email/templates/${editing.id}`, form);
      addToast({ type: 'success', message: 'Template updated' });
    } else {
      await api.post('/email/templates', form);
      addToast({ type: 'success', message: 'Template created' });
    }
    setShowForm(false);
    setEditing(null);
    setForm({ name: '', subject: '', body: '', category: 'general' });
    fetchTemplates();
  };

  const handleEdit = (t: any) => {
    setForm({ name: t.name, subject: t.subject, body: t.body, category: t.category });
    setEditing(t);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await api.delete(`/email/templates/${id}`);
    addToast({ type: 'success', message: 'Template deleted' });
    fetchTemplates();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-gray-400">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
        <button onClick={() => { setEditing(null); setForm({ name: '', subject: '', body: '', category: 'general' }); setShowForm(true); }} className="btn-primary"><Plus size={18} /> New Template</button>
      </div>

      {templates.length === 0 ? (
        <EmptyState icon={Mail} title="No email templates" description="Create reusable email templates for faster outreach" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-200">{t.name}</h3>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(t)} className="btn-ghost p-1"><Edit size={14} /></button>
                  <button onClick={() => handleDelete(t.id)} className="btn-ghost p-1 text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="text-sm text-gray-400 mb-1">Subject: {t.subject}</div>
              <div className="text-xs text-gray-500 line-clamp-2">{t.body}</div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700/50">
                <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400">{t.category}</span>
                <span className="text-xs text-gray-600">{formatDate(t.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? 'Edit Template' : 'New Template'} size="lg">
        <div className="space-y-4">
          <div><label className="block text-sm text-gray-400 mb-1">Template Name</label><input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Follow-up after showing" /></div>
          <div><label className="block text-sm text-gray-400 mb-1">Subject Line</label><input type="text" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className="input-field" placeholder="Great meeting you today!" /></div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Body <span className="text-gray-600">(use {'{{first_name}}'}, {'{{company}}'} for merge tags)</span></label>
            <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} className="input-field h-40 resize-none font-mono text-sm" placeholder="Hi {{first_name}},&#10;&#10;Thank you for..." />
          </div>
          <div><label className="block text-sm text-gray-400 mb-1">Category</label><select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="input-field"><option value="general">General</option><option value="follow_up">Follow-up</option><option value="introduction">Introduction</option><option value="proposal">Proposal</option></select></div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleSave} className="btn-primary">{editing ? 'Update' : 'Create'} Template</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
