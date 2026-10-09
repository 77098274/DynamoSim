import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function StreamPanel({ tableName, refreshKey }) {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api
        .stream(tableName)
        .then((d) => !cancelled && setEvents(d.events))
        .catch((e) => !cancelled && setError(e.message));
    };
    load();
    const id = setInterval(load, 2500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [tableName, refreshKey]);

  if (error) return <div className="form__error">{error}</div>;

  return (
    <div className="stream-panel">
      <p className="advisor-panel__intro">
        Simulated <strong>DynamoDB Stream</strong> of change events. Currently emits <code>REMOVE</code> records when
        the TTL enhancement auto-expires an item — the same pattern real applications use to react to TTL deletes
        (e.g. archiving expired sessions).
      </p>
      {events.length === 0 ? (
        <div className="empty-state empty-state--inline">No stream events yet. Add an item with TTL enabled and wait for it to expire.</div>
      ) : (
        <ul className="stream-list">
          {events.map((ev) => (
            <li key={ev.eventId} className="stream-list__item">
              <span className="pill pill--remove">{ev.eventName}</span>
              <span className="stream-list__reason">{ev.reason}</span>
              <span className="stream-list__keys">{JSON.stringify(ev.keys)}</span>
              <span className="stream-list__time">{new Date(ev.timestamp).toLocaleTimeString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
