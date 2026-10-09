import { useState } from 'react';

const OPS = [
  { value: 'eq', label: '= equals' },
  { value: 'begins_with', label: 'begins_with' },
  { value: 'gt', label: '> greater than' },
  { value: 'gte', label: '>= greater or equal' },
  { value: 'lt', label: '< less than' },
  { value: 'lte', label: '<= less or equal' },
  { value: 'between', label: 'between' },
];

export default function QueryPanel({ table, onQuery, onScan, lastConsumed, loading }) {
  const [pk, setPk] = useState('');
  const [op, setOp] = useState('eq');
  const [val, setVal] = useState('');
  const [val2, setVal2] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!pk.trim()) return;
    const skCondition = table.sortKey && val ? { op, value: val, value2: val2 } : undefined;
    onQuery(pk.trim(), skCondition);
  };

  return (
    <form className="query-panel" onSubmit={submit}>
      <div className="query-panel__row">
        <div className="query-panel__field">
          <label>Partition key ({table.partitionKey})</label>
          <input value={pk} onChange={(e) => setPk(e.target.value)} placeholder="exact value…" />
        </div>

        {table.sortKey && (
          <>
            <div className="query-panel__field">
              <label>Sort key condition ({table.sortKey})</label>
              <select value={op} onChange={(e) => setOp(e.target.value)}>
                {OPS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="query-panel__field">
              <label>Value</label>
              <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="optional" />
            </div>
            {op === 'between' && (
              <div className="query-panel__field">
                <label>and</label>
                <input value={val2} onChange={(e) => setVal2(e.target.value)} />
              </div>
            )}
          </>
        )}

        <div className="query-panel__actions">
          <button type="submit" className="btn btn--primary" disabled={loading}>
            Query
          </button>
          <button type="button" className="btn btn--ghost" onClick={onScan} disabled={loading}>
            Scan all
          </button>
        </div>
      </div>
      {lastConsumed != null && (
        <div className="query-panel__cost">Consumed capacity: <strong>{lastConsumed}</strong> RCU</div>
      )}
    </form>
  );
}
