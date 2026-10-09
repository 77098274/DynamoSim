import Badge from './Badge.jsx';

export default function Sidebar({ tables, selected, onSelect, onCreateClick, onAboutClick, view }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">🗄️</div>
        <div>
          <div className="sidebar__title">DynamoSim</div>
          <div className="sidebar__subtitle">DynamoDB Simulator</div>
        </div>
      </div>

      <button className="btn btn--primary btn--block" onClick={onCreateClick}>
        + Create table
      </button>

      <nav className="sidebar__nav">
        <div className="sidebar__section-label">Tables ({tables.length})</div>
        {tables.length === 0 && <div className="sidebar__empty">No tables yet</div>}
        <ul className="sidebar__list">
          {tables.map((t) => (
            <li key={t.name}>
              <button
                className={`sidebar__item ${selected === t.name && view === 'table' ? 'sidebar__item--active' : ''}`}
                onClick={() => onSelect(t.name)}
              >
                <span className="sidebar__item-name">{t.name}</span>
                <span className="sidebar__item-meta">
                  <Badge tone={t.billingMode === 'PROVISIONED' ? 'amber' : 'blue'}>
                    {t.billingMode === 'PROVISIONED' ? 'PROV' : 'ON-DEMAND'}
                  </Badge>
                  <span className="sidebar__item-count">{t.itemCount}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <button className={`sidebar__about ${view === 'about' ? 'sidebar__about--active' : ''}`} onClick={onAboutClick}>
        ℹ️ How DynamoDB works
      </button>
    </aside>
  );
}
