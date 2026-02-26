import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatDate, formatRelative, formatCurrency } from '../../lib/formatters';
import { useUIStore } from '../../stores/uiStore';
import { DEAL_STAGES } from '../../lib/constants';
import { ArrowLeft, Edit, Trash2, Plus } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import DealForm from './DealForm';

export default function DealDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newNote, setNewNote] = useState('');
  const addToast = useUIStore((s) => s.addToast);

  const fetchDeal = () => api.get<{ data: any }>(`/deals/${id}`).then((r) => setDeal(r.data)).finally(() => setLoading(false));
  useEffect(() => { fetchDeal(); }, [id]);

  const handleDelete = async () => {
    if (!confirm('Delete this deal?')) return;
    await api.delete(`/deals/${id}`);
    addToast({ type: 'success', message: 'Deal deleted' });
    navigate('/deals');
  };

  const handleStageChange = async (stage: string) => {
    await api.put(`/deals/${id}`, { stage });
    addToast({ type: 'success', message: `Deal moved to ${DEAL_STAGES.find((s) => s.value === stage)?.label}` });
    fetchDeal();
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await api.post('/notes', { deal_id: id, content: newNote });
    setNewNote('');
    fetchDeal();
  };

  if (loading) return <LoadingSpinner />;
  if (!deal) return <div className="text-gray-400">Deal not found</div>;

  const stageDef = DEAL_STAGES.find((s) => s.value === deal.stage);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/deals')} className="btn-ghost p-2"><ArrowLeft size={20} /></button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{deal.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${stageDef?.color}/20 text-white`}>{stageDef?.label}</span>
            <span className="text-sm font-semibold text-green-400">{formatCurrency(deal.value)}</span>
            <span className="text-xs text-gray-500">{deal.probability}% probability</span>
          </div>
        </div>
        <button onClick={() => setEditing(true)} className="btn-secondary"><Edit size={16} /> Edit</button>
        <button onClick={handleDelete} className="btn-danger"><Trash2 size={16} /></button>
      </div>

      {/* Stage progression */}
      <div className="flex items-center gap-1">
        {DEAL_STAGES.filter((s) => s.value !== 'closed_lost').map((s) => (
          <button key={s.value} onClick={() => handleStageChange(s.value)}
            className={`flex-1 py-2 text-xs font-medium rounded transition-colors ${deal.stage === s.value ? `${s.color} text-white` : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Contact:</span> <span className="text-gray-200 ml-2">{deal.contact_first} {deal.contact_last}</span></div>
              <div><span className="text-gray-500">Value:</span> <span className="text-green-400 ml-2 font-semibold">{formatCurrency(deal.value)}</span></div>
              <div><span className="text-gray-500">Commission:</span> <span className="text-gray-200 ml-2">{deal.commission_rate}%</span></div>
              <div><span className="text-gray-500">Expected Close:</span> <span className="text-gray-200 ml-2">{deal.expected_close_date ? formatDate(deal.expected_close_date) : '—'}</span></div>
              {deal.property_address && <div className="col-span-2"><span className="text-gray-500">Property:</span> <span className="text-gray-200 ml-2">{deal.property_address}</span></div>}
            </div>
          </div>

          {/* Notes */}
          <div className="card p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Notes</h3>
            <div className="flex gap-2 mb-3">
              <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note..." className="input-field flex-1" onKeyDown={(e) => e.key === 'Enter' && handleAddNote()} />
              <button onClick={handleAddNote} className="btn-primary py-2"><Plus size={16} /></button>
            </div>
            <div className="space-y-2">
              {deal.notes?.map((n: any) => (
                <div key={n.id} className="bg-gray-900/50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">{n.author_first} {n.author_last} · {formatRelative(n.created_at)}</div>
                  <p className="text-sm text-gray-300">{n.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity */}
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Activity</h3>
          <div className="space-y-3">
            {deal.activities?.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                <div><span className="text-gray-300">{a.description}</span><div className="text-xs text-gray-600">{formatRelative(a.created_at)}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Deal" size="lg">
        <DealForm deal={deal} onSuccess={() => { setEditing(false); fetchDeal(); addToast({ type: 'success', message: 'Deal updated' }); }} onCancel={() => setEditing(false)} />
      </Modal>
    </div>
  );
}
