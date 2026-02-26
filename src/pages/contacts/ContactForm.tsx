import { useState, FormEvent } from 'react';
import { api } from '../../lib/api';
import { CONTACT_SOURCES } from '../../lib/constants';

interface ContactFormProps {
  contact?: any;
  onSuccess: (contact: any) => void;
  onCancel: () => void;
}

export default function ContactForm({ contact, onSuccess, onCancel }: ContactFormProps) {
  const [form, setForm] = useState({
    first_name: contact?.first_name || '',
    last_name: contact?.last_name || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    company: contact?.company || '',
    job_title: contact?.job_title || '',
    address: contact?.address || '',
    city: contact?.city || '',
    state: contact?.state || '',
    zip: contact?.zip || '',
    source: contact?.source || 'manual',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = contact
        ? await api.put<{ data: any }>(`/contacts/${contact.id}`, form)
        : await api.post<{ data: any }>('/contacts', form);
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">First Name *</label>
          <input type="text" value={form.first_name} onChange={update('first_name')} required className="input-field" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Last Name *</label>
          <input type="text" value={form.last_name} onChange={update('last_name')} required className="input-field" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Email</label>
          <input type="email" value={form.email} onChange={update('email')} className="input-field" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Phone</label>
          <input type="tel" value={form.phone} onChange={update('phone')} className="input-field" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Company</label>
          <input type="text" value={form.company} onChange={update('company')} className="input-field" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Job Title</label>
          <input type="text" value={form.job_title} onChange={update('job_title')} className="input-field" />
        </div>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Source</label>
        <select value={form.source} onChange={update('source')} className="input-field">
          {CONTACT_SOURCES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">City</label>
          <input type="text" value={form.city} onChange={update('city')} className="input-field" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">State</label>
          <input type="text" value={form.state} onChange={update('state')} className="input-field" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">ZIP</label>
          <input type="text" value={form.zip} onChange={update('zip')} className="input-field" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Saving...' : contact ? 'Update' : 'Create Contact'}
        </button>
      </div>
    </form>
  );
}
