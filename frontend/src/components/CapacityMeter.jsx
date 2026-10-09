function Sparkline({ history, field, color }) {
  const values = history.map((h) => h[field]);
  const max = Math.max(1, ...values);
  const width = 220;
  const height = 48;
  const step = values.length > 1 ? width / (values.length - 1) : width;

  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - (v / max) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="sparkline" role="img" aria-label={`${field} trend`}>
      {values.length > 1 ? (
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      ) : (
        <circle cx={2} cy={height - 2} r={2} fill={color} />
      )}
    </svg>
  );
}

export default function CapacityMeter({ table }) {
  const { metrics, billingMode, provisionedThroughput } = table;
  const history = metrics.history.length ? metrics.history : [{ consumedRCU: 0, consumedWCU: 0 }];

  return (
    <div className="capacity-meter">
      <div className="capacity-meter__cards">
        <div className="metric-card">
          <div className="metric-card__label">Consumed RCU (total)</div>
          <div className="metric-card__value">{metrics.consumedRCU.toFixed(1)}</div>
          <Sparkline history={history} field="consumedRCU" color="#2e7dd7" />
        </div>
        <div className="metric-card">
          <div className="metric-card__label">Consumed WCU (total)</div>
          <div className="metric-card__value">{metrics.consumedWCU.toFixed(1)}</div>
          <Sparkline history={history} field="consumedWCU" color="#e07b1f" />
        </div>
        <div className="metric-card">
          <div className="metric-card__label">Reads / Writes / Deletes</div>
          <div className="metric-card__value metric-card__value--small">
            {metrics.totalReads} / {metrics.totalWrites} / {metrics.totalDeletes}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-card__label">TTL expirations</div>
          <div className="metric-card__value">{metrics.ttlExpirations}</div>
        </div>
      </div>

      {billingMode === 'PROVISIONED' && (
        <div className={`throttle-banner ${metrics.throttledRequests > 0 ? 'throttle-banner--alert' : ''}`}>
          <strong>Provisioned mode:</strong> {provisionedThroughput.readCapacityUnits} RCU/s &amp;{' '}
          {provisionedThroughput.writeCapacityUnits} WCU/s reserved.
          {metrics.throttledRequests > 0 ? (
            <> ⚠️ {metrics.throttledRequests} request(s) throttled (ProvisionedThroughputExceededException) — traffic exceeded capacity.</>
          ) : (
            <> No throttling observed yet.</>
          )}
        </div>
      )}
    </div>
  );
}
