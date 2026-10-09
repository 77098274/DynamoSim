import { useState } from 'react';
import Modal from './Modal.jsx';

const SYSTEM_FIELDS = new Set(['_id', '_createdAt', '_updatedAt']);

function itemToAttrsJSON(item, pk, sk) {
  if (!item) return '{\n  \n}';
  const rest = { ...item };
  delete rest[pk];
  if (sk) delete rest[sk];
  delete rest.ttl;
  SYSTEM_FIELDS.forEach((f) => delete rest[f]);
  return JSON.stringify(rest, null, 2);
}

export default function ItemEditorModal({ table, existingItem, onClose, onSave }) {
  const { partitionKey, sortKey } = table;
  const isEdit = Boolean(existingItem);

  const [pkValue, setPkValue] = useState(existingItem ? String(existingItem[partitionKey]) : '');
  const [skValue, setSkValue] = useState(existingItem && sortKey ? String(existingItem[sortKey]) : '');
  const [attrsText, setAttrsText] = useState(itemToAttrsJSON(existingItem, partitionKey, sortKey));
  const [ttlEnabled, setTtlEnabled] = useState(Boolean(existingItem?.ttl));
  const [ttlMinutes, setTtlMinutes] = useState(2);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!pkValue.trim()) {
      setError(`Partition key "${partitionKey}" is required.`);
      return;
    }
    if (sortKey && !skValue.trim()) {
      setError(`Sort key "${sortKey}" is required.`);
      return;
    }

    let attrs;
    try {
      attrs = attrsText.trim() ? JSON.parse(attrsText) : {};
      if (typeof attrs !== 'object' || Array.isArray(attrs)) throw new Error('not an object');
    } catch {
      setError('Attributes must be valid JSON (an object), e.g. {"name": "value"}');
      return;
    }

    const item = {
      ...attrs,
      [partitionKey]: pkValue,
      ...(sortKey ? { [sortKey]: skValue } : {}),
    };
    if (ttlEnabled) {
      item.ttl = Math.floor(Date.now() / 1000) + Math.max(5, Number(ttlMinutes) * 60 || 60);
    }

    setSubmitting(true);
    try {
      await onSave(item);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit item' : 'Add item'} onClose={onClose} width="560px">
      <form className="form" onSubmit={handleSubmit}>
        <div className="form__row">
          <label className="form__field">
            <span>
              Partition key <code>{partitionKey}</code>
            </span>
            <input value={pkValue} onChange={(e) => setPkValue(e.target.value)} disabled={isEdit} />
          </label>
          {sortKey && (
            <label className="form__field">
              <span>
                Sort key <code>{sortKey}</code>
              </span>
              <input value={skValue} onChange={(e) => setSkValue(e.target.value)} disabled={isEdit} />
            </label>
          )}
        </div>

        <label className="form__field">
          <span>Other attributes (JSON)</span>
          <textarea
            className="form__json"
            rows={8}
            value={attrsText}
            onChange={(e) => setAttrsText(e.target.value)}
            spellCheck={false}
          />
        </label>

        <div className="form__ttl">
          <label className="form__checkbox">
            <input type="checkbox" checked={ttlEnabled} onChange={(e) => setTtlEnabled(e.target.checked)} />
            <span>Enable TTL — auto-delete this item after</span>
          </label>
          <input
            type="number"
            min="1"
            step="0.5"
            disabled={!ttlEnabled}
            value={ttlMinutes}
            onChange={(e) => setTtlMinutes(e.target.value)}
            style={{ width: 70 }}
          />
          <span>minute(s)</span>
        </div>
        <p className="form__hint">
          TTL simulates the real DynamoDB Time-To-Live feature: a background sweeper automatically removes the item
          once it expires (accelerated here for demo purposes — real DynamoDB can take up to 48h).
        </p>

        {error && <div className="form__error">{error}</div>}

        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Put item'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
