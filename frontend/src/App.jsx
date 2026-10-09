import { useCallback, useEffect, useState } from 'react';
import './styles/App.css';
import { api } from './api.js';
import { ToastProvider, useToast } from './context/ToastContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import Dashboard from './components/Dashboard.jsx';
import TableView from './components/TableView.jsx';
import AboutPanel from './components/AboutPanel.jsx';
import CreateTableModal from './components/CreateTableModal.jsx';

function AppInner() {
  const toast = useToast();
  const [tables, setTables] = useState([]);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState('dashboard'); // dashboard | table | about
  const [createOpen, setCreateOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking');

  const refreshTables = useCallback(async () => {
    try {
      const res = await api.listTables();
      setTables(res.tables);
      setApiStatus('ok');
    } catch (e) {
      setApiStatus('down');
    }
  }, []);

  useEffect(() => {
    refreshTables();
    const id = setInterval(refreshTables, 4000);
    return () => clearInterval(id);
  }, [refreshTables]);

  const handleSelectTable = (name) => {
    setSelected(name);
    setView('table');
  };

  const handleCreateTable = async (payload) => {
    await api.createTable(payload);
    toast.success(`Table "${payload.name}" created`);
    setCreateOpen(false);
    await refreshTables();
    setSelected(payload.name);
    setView('table');
  };

  const handleTableDeleted = () => {
    setSelected(null);
    setView('dashboard');
    refreshTables();
  };

  return (
    <div className="app-shell">
      <Sidebar
        tables={tables}
        selected={selected}
        view={view}
        onSelect={handleSelectTable}
        onCreateClick={() => setCreateOpen(true)}
        onAboutClick={() => setView('about')}
      />
      <div className="app-shell__main">
        <TopBar apiStatus={apiStatus} />
        <div className="app-shell__content">
          {apiStatus === 'down' && (
            <div className="banner banner--error">
              Can't reach the backend API. Make sure the Express server is running (see README) — expected at{' '}
              <code>{import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}</code>.
            </div>
          )}

          {view === 'dashboard' && (
            <Dashboard tables={tables} onSelect={handleSelectTable} onCreateClick={() => setCreateOpen(true)} />
          )}
          {view === 'table' && selected && (
            <TableView tableName={selected} onTableChanged={refreshTables} onTableDeleted={handleTableDeleted} />
          )}
          {view === 'about' && <AboutPanel />}
        </div>
      </div>

      {createOpen && <CreateTableModal onClose={() => setCreateOpen(false)} onCreate={handleCreateTable} />}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
