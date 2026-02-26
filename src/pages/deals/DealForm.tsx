import { useState, useEffect, FormEvent } from 'react';
import { api } from '../../lib/api';
import { DEAL_STAGES } from '../../lib/constants';

interface DealFormProps {
  deal?: any;
  onSuccess: (deal: any) => void;
  onCancel: () => void;
}

export default function DealForm({ deal, onSuccess, onCancel }: DealFormProps) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: deal?.title || '',
    contact_id: deal?.contact_id || '',
    stage: deal?.stage || 'discovery',
    value: deal?.value || '',
    probability: deal?.probability || 10,
    expected_close_date: deal?.expected_close_date || '',
    property_address: deal?.property_address || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ data: any[] }>('/contacts?limit=100').then((r) => setContacts(r.data));
  }, []);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = { ...form, value: Number(form.value) || 0, probability: Number(form.probability) };
      const res = deal
        ? await api.put<{ data: any }>(`/deals/${deal.id}`, payload)
        : await api.post<{ data: any }>('/deals', payload);
      onSuccess(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-2">{error}</div>}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Deal Title *</label>
        <input type="text" value={form.title} onChange={update('title')} required className="input-field" placeholder="123 Main St - Purchase" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Contact *</label>
        <select value={form.contact_id} onChange={update('contact_id')} required className="input-field">
          <option value="">Select a contact...</option>
          {contacts.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.email ? ` (${c.email})` : ''}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Stage</label>
          <select value={form.stage} onChange={update('stage')} className="input-field">
            {DEAL_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Value ($)</label>
          <input type="number" value={form.value} onChange={update('value')} className="input-field" placeholder="0" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Probability (%)</label>
          <input type="number" min="0" max="100" value={form.probability} onChange={update('probability')} className="input-field" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Expected Close Date</label>
          <input type="date" value={form.expected_close_date} onChange={update('expected_close_date')} className="input-field" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Property Address</label>
          <input type="text" value={form.property_address} onChange={update('property_address')} className="input-field" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : deal ? 'Update Deal' : 'Create Deal'}</button>
      </div>
    </form>
  );
}
