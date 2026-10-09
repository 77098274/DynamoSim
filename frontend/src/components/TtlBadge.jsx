import { useEffect, useState } from 'react';

/** Shows a live countdown for items carrying a `ttl` (unix seconds) attribute. */
export default function TtlBadge({ ttl }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  if (typeof ttl !== 'number') return null;

  const remaining = ttl - now;
  if (remaining <= 0) {
    return <span className="ttl-badge ttl-badge--expiring">expiring…</span>;
  }

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const label = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  const urgent = remaining <= 15;

  return (
    <span className={`ttl-badge ${urgent ? 'ttl-badge--urgent' : ''}`} title="Time To Live — auto-deletes when it reaches 0">
      ⏳ TTL {label}
    </span>
  );
}
