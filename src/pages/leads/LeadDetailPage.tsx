import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatDate, formatRelative, formatCurrency, getInitials } from '../../lib/formatters';
import { useUIStore } from '../../stores/uiStore';
import { LEAD_STATUSES, LEAD_TEMPERATURES } from '../../lib/constants';
import { ArrowLeft, Edit, Trash2, ArrowRightCircle } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import LeadForm from './LeadForm';

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [dealTitle, setDealTitle] = useState('');
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    api.get<{ data: any }>(`/leads/${id}`).then((res) => setLead(res.data)).finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Delete this lead?')) return;
    await api.delete(`/leads/${id}`);
    addToast({ type: 'success', message: 'Lead deleted' });
    navigate('/leads');
  };

  const handleConvert = async () => {
    const res = await api.post<{ data: any }>(`/leads/${id}/convert`, { title: dealTitle || 'New Deal', value: lead.value });
    addToast({ type: 'success', message: 'Lead converted to deal' });
    navigate(`/deals/${res.data.id}`);
  };

  if (loading) return <LoadingSpinner />;
  if (!lead) return <div className="text-gray-400">Lead not found</div>;

  const statusDef = LEAD_STATUSES.find((s) => s.value === lead.status);
  const tempDef = LEAD_TEMPERATURES.find((t) => t.value === lead.temperature);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/leads')} className="btn-ghost p-2"><ArrowLeft size={20} /></button>
        <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center">
          <span className="text-brand-400 font-semibold">{getInitials(lead.contact_first, lead.contact_last)}</span>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{lead.contact_first} {lead.contact_last}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusDef?.color}/20 text-white`}>{statusDef?.label}</span>
            <span className={`text-xs ${tempDef?.color}`}>{tempDef?.label}</span>
            <span className="text-xs text-gray-500">Score: {lead.score}</span>
          </div>
        </div>
        <button onClick={() => setConverting(true)} className="btn-primary"><ArrowRightCircle size={16} /> Convert to Deal</button>
        <button onClick={() => setEditing(true)} className="btn-secondary"><Edit size={16} /></button>
        <button onClick={handleDelete} className="btn-danger"><Trash2 size={16} /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-400">Lead Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">Value:</span> <span className="text-gray-200 ml-2">{lead.value ? formatCurrency(lead.value) : '—'}</span></div>
            <div><span className="text-gray-500">Property:</span> <span className="text-gray-200 ml-2">{lead.property_type || '—'}</span></div>
            <div><span className="text-gray-500">Timeline:</span> <span className="text-gray-200 ml-2">{lead.timeline || '—'}</span></div>
            <div><span className="text-gray-500">Created:</span> <span className="text-gray-200 ml-2">{formatDate(lead.created_at)}</span></div>
          </div>
          {lead.notes && <div className="mt-3 pt-3 border-t border-gray-700"><p className="text-sm text-gray-400">{lead.notes}</p></div>}
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Activity</h3>
          <div className="space-y-3">
            {lead.activities?.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                <div>
                  <span className="text-gray-300">{a.description}</span>
                  <div className="text-xs text-gray-600">{formatRelative(a.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Lead" size="lg">
        <LeadForm lead={lead} onSuccess={() => { setEditing(false); api.get<{ data: any }>(`/leads/${id}`).then((r) => setLead(r.data)); addToast({ type: 'success', message: 'Lead updated' }); }} onCancel={() => setEditing(false)} />
      </Modal>

      <Modal open={converting} onClose={() => setConverting(false)} title="Convert to Deal">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Create a new deal from this lead</p>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Deal Title</label>
            <input type="text" value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} className="input-field" placeholder={`Deal - ${lead.contact_first} ${lead.contact_last}`} />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setConverting(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleConvert} className="btn-primary">Convert</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
