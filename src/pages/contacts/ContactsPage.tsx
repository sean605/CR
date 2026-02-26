import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatDate, getInitials } from '../../lib/formatters';
import { useUIStore } from '../../stores/uiStore';
import { Plus, Search, Users } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ContactForm from './ContactForm';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, total_pages: 1, total: 0, limit: 25 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  const fetchContacts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (search) params.set('search', search);
      const res = await api.get<{ data: any[]; meta: any }>(`/contacts?${params}`);
      setContacts(res.data);
      setMeta(res.meta);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const handleCreated = () => {
    setShowForm(false);
    addToast({ type: 'success', message: 'Contact created' });
    fetchContacts();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={18} /> Add Contact
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner />
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Get started by adding your first contact"
          action={<button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} /> Add Contact</button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="text-left table-header px-4 py-3">Name</th>
                <th className="text-left table-header px-4 py-3">Email</th>
                <th className="text-left table-header px-4 py-3">Phone</th>
                <th className="text-left table-header px-4 py-3">Company</th>
                <th className="text-left table-header px-4 py-3">Source</th>
                <th className="text-left table-header px-4 py-3">Added</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/contacts/${c.id}`} className="flex items-center gap-3 hover:text-brand-400">
                      <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-brand-400 text-xs font-medium">{getInitials(c.first_name, c.last_name)}</span>
                      </div>
                      <span className="font-medium text-gray-200">{c.first_name} {c.last_name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{c.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{c.company || '—'}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-gray-300">{c.source}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={meta.page} totalPages={meta.total_pages} onPageChange={(p) => fetchContacts(p)} />

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Contact">
        <ContactForm onSuccess={handleCreated} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
