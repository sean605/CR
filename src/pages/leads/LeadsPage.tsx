import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatDate, formatCurrency, getInitials } from '../../lib/formatters';
import { useUIStore } from '../../stores/uiStore';
import { LEAD_STATUSES, LEAD_TEMPERATURES } from '../../lib/constants';
import { Plus, Search, UserPlus, Flame, Snowflake, Sun } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import LeadForm from './LeadForm';

const tempIcons: Record<string, any> = { cold: Snowflake, warm: Sun, hot: Flame };

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, total_pages: 1, total: 0, limit: 25 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  const fetchLeads = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get<{ data: any[]; meta: any }>(`/leads?${params}`);
      setLeads(res.data);
      setMeta(res.meta);
    } finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-9" />
        </div>
        <div className="flex gap-1">
          <button onClick={() => setStatusFilter('')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!statusFilter ? 'bg-brand-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>All</button>
          {LEAD_STATUSES.map((s) => (
            <button key={s.value} onClick={() => setStatusFilter(s.value)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s.value ? 'bg-brand-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>{s.label}</button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={18} /> Add Lead</button>
      </div>

      {loading ? <LoadingSpinner /> : leads.length === 0 ? (
        <EmptyState icon={UserPlus} title="No leads yet" description="Start capturing leads to fill your pipeline" action={<button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} /> Add Lead</button>} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="text-left table-header px-4 py-3">Contact</th>
                <th className="text-left table-header px-4 py-3">Status</th>
                <th className="text-left table-header px-4 py-3">Temp</th>
                <th className="text-left table-header px-4 py-3">Score</th>
                <th className="text-left table-header px-4 py-3">Value</th>
                <th className="text-left table-header px-4 py-3">Assigned To</th>
                <th className="text-left table-header px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const TempIcon = tempIcons[l.temperature] || Snowflake;
                const statusDef = LEAD_STATUSES.find((s) => s.value === l.status);
                const tempDef = LEAD_TEMPERATURES.find((t) => t.value === l.temperature);
                return (
                  <tr key={l.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/leads/${l.id}`} className="flex items-center gap-3 hover:text-brand-400">
                        <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center"><span className="text-brand-400 text-xs font-medium">{getInitials(l.contact_first, l.contact_last)}</span></div>
                        <div>
                          <div className="font-medium text-gray-200">{l.contact_first} {l.contact_last}</div>
                          {l.contact_email && <div className="text-xs text-gray-500">{l.contact_email}</div>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusDef?.color}/20 text-white`}>{statusDef?.label}</span></td>
                    <td className="px-4 py-3"><TempIcon size={16} className={tempDef?.color} /></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-1"><div className="w-8 h-1.5 bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-brand-500 rounded-full" style={{ width: `${l.score}%` }} /></div><span className="text-xs text-gray-500">{l.score}</span></div></td>
                    <td className="px-4 py-3 text-sm text-gray-400">{l.value ? formatCurrency(l.value) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{l.assignee_first ? `${l.assignee_first} ${l.assignee_last}` : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(l.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={meta.page} totalPages={meta.total_pages} onPageChange={(p) => fetchLeads(p)} />

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Lead" size="lg">
        <LeadForm onSuccess={() => { setShowForm(false); addToast({ type: 'success', message: 'Lead created' }); fetchLeads(); }} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
