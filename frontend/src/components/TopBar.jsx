export default function TopBar({ apiStatus }) {
  return (
    <header className="topbar">
      <div className="topbar__crumb">AWS Service Simulation &amp; Enhancement — DynamoDB</div>
      <div className={`topbar__status ${apiStatus === 'ok' ? 'topbar__status--ok' : 'topbar__status--down'}`}>
        <span className="topbar__dot" />
        {apiStatus === 'ok' ? 'Backend connected' : apiStatus === 'checking' ? 'Connecting…' : 'Backend unreachable'}
      </div>
    </header>
  );
}
