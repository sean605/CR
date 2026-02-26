import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/formatters';
import { useUIStore } from '../../stores/uiStore';
import { TASK_PRIORITIES, TASK_TYPES } from '../../lib/constants';
import { Plus, Search, CheckSquare, Square, Clock, AlertTriangle } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import clsx from 'clsx';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, total_pages: 1, total: 0, limit: 25 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'todo', priority: 'medium', due_date: '' });
  const addToast = useUIStore((s) => s.addToast);

  const fetchTasks = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get<{ data: any[]; meta: any }>(`/tasks?${params}`);
      setTasks(res.data);
      setMeta(res.meta);
    } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    await api.post('/tasks', form);
    setShowForm(false);
    setForm({ title: '', description: '', type: 'todo', priority: 'medium', due_date: '' });
    addToast({ type: 'success', message: 'Task created' });
    fetchTasks();
  };

  const toggleComplete = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await api.put(`/tasks/${task.id}`, { status: newStatus });
    addToast({ type: 'success', message: newStatus === 'completed' ? 'Task completed' : 'Task reopened' });
    fetchTasks();
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/tasks/${id}`);
    addToast({ type: 'success', message: 'Task deleted' });
    fetchTasks();
  };

  const priorityColors: Record<string, string> = { low: 'text-gray-400', medium: 'text-blue-400', high: 'text-orange-400', urgent: 'text-red-400' };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-1">
          {['', 'pending', 'in_progress', 'completed'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-brand-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={18} /> Add Task</button>
      </div>

      {loading ? <LoadingSpinner /> : tasks.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No tasks yet" description="Create tasks to stay on top of your follow-ups"
          action={<button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} /> Add Task</button>} />
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => {
            const isOverdue = t.due_date && t.status !== 'completed' && new Date(t.due_date) < new Date();
            return (
              <div key={t.id} className="card px-4 py-3 flex items-center gap-3 group">
                <button onClick={() => toggleComplete(t)} className="flex-shrink-0">
                  {t.status === 'completed' ? <CheckSquare size={18} className="text-green-400" /> : <Square size={18} className="text-gray-500 hover:text-brand-400" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={clsx('font-medium text-sm', t.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-200')}>
                    {t.title}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {t.assignee_first && <span className="text-xs text-gray-500">{t.assignee_first} {t.assignee_last}</span>}
                    {t.contact_first && <span className="text-xs text-gray-600">· {t.contact_first} {t.contact_last}</span>}
                  </div>
                </div>
                <span className={`text-xs ${priorityColors[t.priority]}`}>{t.priority}</span>
                <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400">{TASK_TYPES.find((tt) => tt.value === t.type)?.label || t.type}</span>
                {t.due_date && (
                  <div className={clsx('flex items-center gap-1 text-xs', isOverdue ? 'text-red-400' : 'text-gray-500')}>
                    {isOverdue ? <AlertTriangle size={12} /> : <Clock size={12} />}
                    {formatDate(t.due_date)}
                  </div>
                )}
                <button onClick={() => handleDelete(t.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs">Delete</button>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={meta.page} totalPages={meta.total_pages} onPageChange={(p) => fetchTasks(p)} />

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Task">
        <div className="space-y-4">
          <div><label className="block text-sm text-gray-400 mb-1">Title *</label><input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-field" placeholder="Follow up with client" /></div>
          <div><label className="block text-sm text-gray-400 mb-1">Description</label><textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input-field h-20 resize-none" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-sm text-gray-400 mb-1">Type</label><select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="input-field">{TASK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Priority</label><select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className="input-field">{TASK_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Due Date</label><input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} className="input-field" /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleCreate} className="btn-primary">Create Task</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
