import { useState } from 'react';
import Modal from './Modal.jsx';

const initial = {
  name: '',
  partitionKey: '',
  sortKey: '',
  billingMode: 'ON_DEMAND',
  rcu: 5,
  wcu: 5,
};

export default function CreateTableModal({ onClose, onCreate }) {
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.partitionKey.trim()) {
      setError('Table name and partition key are required.');
      return;
    }
    setSubmitting(true);
    try {
      await onCreate({
        name: form.name.trim(),
        partitionKey: form.partitionKey.trim(),
        sortKey: form.sortKey.trim() || undefined,
        billingMode: form.billingMode,
        rcu: Number(form.rcu) || 5,
        wcu: Number(form.wcu) || 5,
      });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Create table" onClose={onClose} width="520px">
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span>Table name</span>
          <input value={form.name} onChange={update('name')} placeholder="e.g. Orders" autoFocus />
        </label>

        <div className="form__row">
          <label className="form__field">
            <span>Partition key (required)</span>
            <input value={form.partitionKey} onChange={update('partitionKey')} placeholder="e.g. orderId" />
          </label>
          <label className="form__field">
            <span>Sort key (optional)</span>
            <input value={form.sortKey} onChange={update('sortKey')} placeholder="e.g. createdAt" />
          </label>
        </div>

        <label className="form__field">
          <span>Capacity mode</span>
          <select value={form.billingMode} onChange={update('billingMode')}>
            <option value="ON_DEMAND">On-demand (pay per request)</option>
            <option value="PROVISIONED">Provisioned (fixed RCU/WCU)</option>
          </select>
        </label>

        {form.billingMode === 'PROVISIONED' && (
          <div className="form__row">
            <label className="form__field">
              <span>Read capacity units (RCU/s)</span>
              <input type="number" min="1" value={form.rcu} onChange={update('rcu')} />
            </label>
            <label className="form__field">
              <span>Write capacity units (WCU/s)</span>
              <input type="number" min="1" value={form.wcu} onChange={update('wcu')} />
            </label>
          </div>
        )}

        {error && <div className="form__error">{error}</div>}

        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create table'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
