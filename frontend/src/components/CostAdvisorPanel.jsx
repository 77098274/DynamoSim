import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function CostAdvisorPanel({ tableName, refreshKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .advisor(tableName)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [tableName, refreshKey]);

  if (error) return <div className="form__error">{error}</div>;
  if (!data) return <div className="panel-loading">Crunching capacity numbers…</div>;

  const cheaper = data.recommendation;
  const matchesCurrent = cheaper === data.currentMode;

  return (
    <div className="advisor-panel">
      <p className="advisor-panel__intro">
        <strong>Enhancement — Capacity &amp; Cost Advisor.</strong> Beyond basic DynamoDB simulation, this projects
        this table's observed read/write traffic to a monthly volume and estimates cost under both AWS billing
        modes, then recommends the cheaper one — mirroring a real AWS Cost Explorer-style recommendation.
      </p>

      <div className="advisor-panel__grid">
        <div className="advisor-card">
          <div className="advisor-card__title">On-Demand</div>
          <div className="advisor-card__cost">${data.estimatedOnDemandMonthlyCostUSD.toFixed(4)}<span>/mo (est.)</span></div>
          <div className="advisor-card__meta">
            {data.projectedMonthlyWCU.toLocaleString()} WCU · {data.projectedMonthlyRCU.toLocaleString()} RCU projected
          </div>
          {data.currentMode === 'ON_DEMAND' && <span className="pill pill--current">current mode</span>}
        </div>
        <div className="advisor-card">
          <div className="advisor-card__title">Provisioned</div>
          <div className="advisor-card__cost">${data.estimatedProvisionedMonthlyCostUSD.toFixed(4)}<span>/mo (est.)</span></div>
          <div className="advisor-card__meta">fixed reserved throughput, billed hourly</div>
          {data.currentMode === 'PROVISIONED' && <span className="pill pill--current">current mode</span>}
        </div>
      </div>

      <div className={`advisor-panel__verdict ${matchesCurrent ? 'advisor-panel__verdict--good' : 'advisor-panel__verdict--warn'}`}>
        {matchesCurrent ? (
          <>✅ Your current mode (<strong>{data.currentMode}</strong>) looks cost-optimal for this traffic pattern.</>
        ) : (
          <>
            💡 Recommendation: switch to <strong>{cheaper}</strong> to save an estimated{' '}
            <strong>${data.potentialSavingsUSD.toFixed(4)}/mo</strong> at current traffic.
          </>
        )}
      </div>
    </div>
  );
}
