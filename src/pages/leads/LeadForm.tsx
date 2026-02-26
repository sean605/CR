import { useState, FormEvent } from 'react';
import { api } from '../../lib/api';
import { LEAD_STATUSES, LEAD_TEMPERATURES } from '../../lib/constants';

interface LeadFormProps {
  lead?: any;
  onSuccess: (lead: any) => void;
  onCancel: () => void;
}

export default function LeadForm({ lead, onSuccess, onCancel }: LeadFormProps) {
  const [form, setForm] = useState({
    first_name: lead?.contact_first || '',
    last_name: lead?.contact_last || '',
    email: lead?.contact_email || '',
    phone: lead?.contact_phone || '',
    company: lead?.contact_company || '',
    status: lead?.status || 'new',
    temperature: lead?.temperature || 'cold',
    score: lead?.score || 0,
    value: lead?.value || '',
    property_type: lead?.property_type || '',
    timeline: lead?.timeline || '',
    notes: lead?.notes || '',
    source: lead?.source || 'manual',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = { ...form, value: form.value ? Number(form.value) : null, score: Number(form.score) };
      const res = lead
        ? await api.put<{ data: any }>(`/leads/${lead.id}`, payload)
        : await api.post<{ data: any }>('/leads', payload);
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
      {!lead && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-400 mb-1">First Name *</label><input type="text" value={form.first_name} onChange={update('first_name')} required className="input-field" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Last Name *</label><input type="text" value={form.last_name} onChange={update('last_name')} required className="input-field" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-400 mb-1">Email</label><input type="email" value={form.email} onChange={update('email')} className="input-field" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Phone</label><input type="tel" value={form.phone} onChange={update('phone')} className="input-field" /></div>
          </div>
          <div><label className="block text-sm text-gray-400 mb-1">Company</label><input type="text" value={form.company} onChange={update('company')} className="input-field" /></div>
        </>
      )}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Status</label>
          <select value={form.status} onChange={update('status')} className="input-field">
            {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Temperature</label>
          <select value={form.temperature} onChange={update('temperature')} className="input-field">
            {LEAD_TEMPERATURES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Score (0-100)</label>
          <input type="number" min="0" max="100" value={form.score} onChange={update('score')} className="input-field" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm text-gray-400 mb-1">Estimated Value</label><input type="number" value={form.value} onChange={update('value')} className="input-field" placeholder="$0" /></div>
        <div><label className="block text-sm text-gray-400 mb-1">Property Type</label>
          <select value={form.property_type} onChange={update('property_type')} className="input-field">
            <option value="">Select...</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="land">Land</option>
            <option value="multi_family">Multi-Family</option>
          </select>
        </div>
      </div>
      <div><label className="block text-sm text-gray-400 mb-1">Notes</label><textarea value={form.notes} onChange={update('notes')} className="input-field h-20 resize-none" /></div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : lead ? 'Update Lead' : 'Create Lead'}</button>
      </div>
    </form>
  );
}
