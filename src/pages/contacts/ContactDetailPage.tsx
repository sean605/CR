import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatDate, formatRelative, getInitials } from '../../lib/formatters';
import { useUIStore } from '../../stores/uiStore';
import { ArrowLeft, Mail, Phone, Building2, MapPin, Edit, Trash2, Plus, Pin } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ContactForm from './ContactForm';

export default function ContactDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [tab, setTab] = useState<'overview' | 'deals' | 'tasks' | 'notes' | 'activity'>('overview');
  const addToast = useUIStore((s) => s.addToast);

  const fetchContact = async () => {
    try {
      const res = await api.get<{ data: any }>(`/contacts/${id}`);
      setContact(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContact(); }, [id]);

  const handleDelete = async () => {
    if (!confirm('Delete this contact?')) return;
    await api.delete(`/contacts/${id}`);
    addToast({ type: 'success', message: 'Contact deleted' });
    navigate('/contacts');
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await api.post('/notes', { contact_id: id, content: newNote });
    setNewNote('');
    addToast({ type: 'success', message: 'Note added' });
    fetchContact();
  };

  if (loading) return <LoadingSpinner />;
  if (!contact) return <div className="text-gray-400">Contact not found</div>;

  const tabs = ['overview', 'deals', 'tasks', 'notes', 'activity'] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/contacts')} className="btn-ghost p-2"><ArrowLeft size={20} /></button>
        <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center">
          <span className="text-brand-400 font-semibold">{getInitials(contact.first_name, contact.last_name)}</span>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{contact.first_name} {contact.last_name}</h2>
          {contact.company && <p className="text-sm text-gray-400">{contact.job_title ? `${contact.job_title} at ` : ''}{contact.company}</p>}
        </div>
        <button onClick={() => setEditing(true)} className="btn-secondary"><Edit size={16} /> Edit</button>
        <button onClick={handleDelete} className="btn-danger"><Trash2 size={16} /></button>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {contact.email && <div className="card p-3 flex items-center gap-2"><Mail size={16} className="text-gray-500" /><span className="text-sm text-gray-300">{contact.email}</span></div>}
        {contact.phone && <div className="card p-3 flex items-center gap-2"><Phone size={16} className="text-gray-500" /><span className="text-sm text-gray-300">{contact.phone}</span></div>}
        {contact.company && <div className="card p-3 flex items-center gap-2"><Building2 size={16} className="text-gray-500" /><span className="text-sm text-gray-300">{contact.company}</span></div>}
        {contact.city && <div className="card p-3 flex items-center gap-2"><MapPin size={16} className="text-gray-500" /><span className="text-sm text-gray-300">{contact.city}{contact.state ? `, ${contact.state}` : ''}</span></div>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium transition-colors ${tab === t ? 'text-brand-400 border-b-2 border-brand-400' : 'text-gray-400 hover:text-gray-200'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'deals' && contact.deals?.length > 0 && <span className="ml-1 text-xs bg-gray-700 px-1.5 py-0.5 rounded-full">{contact.deals.length}</span>}
            {t === 'tasks' && contact.tasks?.length > 0 && <span className="ml-1 text-xs bg-gray-700 px-1.5 py-0.5 rounded-full">{contact.tasks.length}</span>}
            {t === 'notes' && contact.notes?.length > 0 && <span className="ml-1 text-xs bg-gray-700 px-1.5 py-0.5 rounded-full">{contact.notes.length}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Source:</span> <span className="text-gray-300 ml-2">{contact.source}</span></div>
            <div><span className="text-gray-500">Added:</span> <span className="text-gray-300 ml-2">{formatDate(contact.created_at)}</span></div>
            <div><span className="text-gray-500">Owner:</span> <span className="text-gray-300 ml-2">{contact.owner_id || 'Unassigned'}</span></div>
          </div>
        </div>
      )}

      {tab === 'deals' && (
        <div className="space-y-2">
          {contact.deals?.length > 0 ? contact.deals.map((d: any) => (
            <div key={d.id} className="card p-3 flex items-center justify-between cursor-pointer hover:bg-gray-800/50" onClick={() => navigate(`/deals/${d.id}`)}>
              <div><span className="text-gray-200 font-medium">{d.title}</span><span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full ml-2">{d.stage}</span></div>
              <span className="text-sm text-gray-400">${(d.value || 0).toLocaleString()}</span>
            </div>
          )) : <p className="text-gray-500 text-sm">No deals yet</p>}
        </div>
      )}

      {tab === 'tasks' && (
        <div className="space-y-2">
          {contact.tasks?.length > 0 ? contact.tasks.map((t: any) => (
            <div key={t.id} className="card p-3 flex items-center justify-between">
              <span className="text-gray-200">{t.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{t.status}</span>
            </div>
          )) : <p className="text-gray-500 text-sm">No tasks yet</p>}
        </div>
      )}

      {tab === 'notes' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note..." className="input-field flex-1" onKeyDown={(e) => e.key === 'Enter' && handleAddNote()} />
            <button onClick={handleAddNote} className="btn-primary"><Plus size={16} /> Add</button>
          </div>
          {contact.notes?.map((n: any) => (
            <div key={n.id} className="card p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-300">{n.author_first} {n.author_last}</span>
                <span className="text-xs text-gray-600">{formatRelative(n.created_at)}</span>
                {n.is_pinned ? <Pin size={12} className="text-brand-400" /> : null}
              </div>
              <p className="text-sm text-gray-400">{n.content}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'activity' && (
        <div className="space-y-3">
          {contact.activities?.map((a: any) => (
            <div key={a.id} className="flex items-start gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
              <div>
                <span className="text-gray-300">{a.description}</span>
                <div className="text-xs text-gray-600">{formatRelative(a.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Contact">
        <ContactForm contact={contact} onSuccess={() => { setEditing(false); fetchContact(); addToast({ type: 'success', message: 'Contact updated' }); }} onCancel={() => setEditing(false)} />
      </Modal>
    </div>
  );
}
