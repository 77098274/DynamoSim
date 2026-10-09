import TtlBadge from './TtlBadge.jsx';

const SYSTEM_FIELDS = new Set(['_id', '_createdAt', '_updatedAt', 'ttl']);

export default function ItemsTable({ table, items, onEdit, onDelete }) {
  const { partitionKey, sortKey } = table;

  const extraCols = new Set();
  items.forEach((item) => {
    Object.keys(item).forEach((k) => {
      if (k !== partitionKey && k !== sortKey && !SYSTEM_FIELDS.has(k)) extraCols.add(k);
    });
  });
  const columns = Array.from(extraCols).slice(0, 5); // keep the table readable

  if (items.length === 0) {
    return <div className="items-table__empty">No items match. Try adding one, or clearing your query.</div>;
  }

  return (
    <div className="items-table-wrap">
      <table className="items-table">
        <thead>
          <tr>
            <th>{partitionKey} <span className="items-table__key-tag">PK</span></th>
            {sortKey && <th>{sortKey} <span className="items-table__key-tag items-table__key-tag--sort">SK</span></th>}
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
            <th>TTL</th>
            <th className="items-table__actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const key = `${item[partitionKey]}#${sortKey ? item[sortKey] : ''}`;
            return (
              <tr key={key}>
                <td className="items-table__key-cell">{String(item[partitionKey])}</td>
                {sortKey && <td className="items-table__key-cell">{String(item[sortKey])}</td>}
                {columns.map((c) => (
                  <td key={c}>
                    {item[c] === undefined ? (
                      <span className="items-table__muted">—</span>
                    ) : typeof item[c] === 'object' ? (
                      <code>{JSON.stringify(item[c])}</code>
                    ) : (
                      String(item[c])
                    )}
                  </td>
                ))}
                <td>
                  <TtlBadge ttl={item.ttl} />
                </td>
                <td className="items-table__actions-col">
                  <button className="icon-btn" title="Edit" onClick={() => onEdit(item)}>
                    ✏️
                  </button>
                  <button className="icon-btn icon-btn--danger" title="Delete" onClick={() => onDelete(item)}>
                    🗑️
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
