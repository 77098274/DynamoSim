import Badge from './Badge.jsx';
import EmptyState from './EmptyState.jsx';

export default function Dashboard({ tables, onSelect, onCreateClick }) {
  const totalItems = tables.reduce((sum, t) => sum + t.itemCount, 0);
  const totalRCU = tables.reduce((sum, t) => sum + t.metrics.consumedRCU, 0);
  const totalWCU = tables.reduce((sum, t) => sum + t.metrics.consumedWCU, 0);
  const totalTtl = tables.reduce((sum, t) => sum + t.metrics.ttlExpirations, 0);

  return (
    <div className="dashboard">
      <div className="dashboard__hero">
        <h1>DynamoSim Dashboard</h1>
        <p>
          A functional, in-browser simulation of <strong>Amazon DynamoDB</strong> — create tables, put &amp; query
          items, watch capacity units get consumed, and see the TTL auto-expiry enhancement in action.
        </p>
      </div>

      <div className="dashboard__stats">
        <div className="stat-tile">
          <div className="stat-tile__value">{tables.length}</div>
          <div className="stat-tile__label">Tables</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile__value">{totalItems}</div>
          <div className="stat-tile__label">Items stored</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile__value">{totalRCU.toFixed(1)}</div>
          <div className="stat-tile__label">RCU consumed</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile__value">{totalWCU.toFixed(1)}</div>
          <div className="stat-tile__label">WCU consumed</div>
        </div>
        <div className="stat-tile stat-tile--accent">
          <div className="stat-tile__value">{totalTtl}</div>
          <div className="stat-tile__label">TTL auto-expiries</div>
        </div>
      </div>

      <div className="dashboard__section-head">
        <h2>Your tables</h2>
        <button className="btn btn--primary" onClick={onCreateClick}>
          + Create table
        </button>
      </div>

      {tables.length === 0 ? (
        <EmptyState
          icon="🗄️"
          title="No tables yet"
          subtitle="Create your first table to start simulating DynamoDB."
          action={
            <button className="btn btn--primary" onClick={onCreateClick}>
              + Create table
            </button>
          }
        />
      ) : (
        <div className="table-cards">
          {tables.map((t) => (
            <button key={t.name} className="table-card" onClick={() => onSelect(t.name)}>
              <div className="table-card__head">
                <span className="table-card__name">{t.name}</span>
                <Badge tone={t.billingMode === 'PROVISIONED' ? 'amber' : 'blue'}>
                  {t.billingMode === 'PROVISIONED' ? 'Provisioned' : 'On-demand'}
                </Badge>
              </div>
              <div className="table-card__keys">
                PK: <code>{t.partitionKey}</code>
                {t.sortKey && (
                  <>
                    {' '}
                    · SK: <code>{t.sortKey}</code>
                  </>
                )}
              </div>
              <div className="table-card__metrics">
                <span>{t.itemCount} items</span>
                <span>{t.metrics.consumedRCU.toFixed(1)} RCU</span>
                <span>{t.metrics.consumedWCU.toFixed(1)} WCU</span>
                {t.metrics.throttledRequests > 0 && <span className="table-card__throttle">⚠ throttled</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
