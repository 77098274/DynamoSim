import { useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import Badge from './Badge.jsx';
import ItemsTable from './ItemsTable.jsx';
import QueryPanel from './QueryPanel.jsx';
import CapacityMeter from './CapacityMeter.jsx';
import CostAdvisorPanel from './CostAdvisorPanel.jsx';
import StreamPanel from './StreamPanel.jsx';
import ItemEditorModal from './ItemEditorModal.jsx';
import EmptyState from './EmptyState.jsx';

const TABS = ['Items', 'Query', 'Capacity & Cost Advisor', 'Stream (TTL events)'];

export default function TableView({ tableName, onTableChanged, onTableDeleted }) {
  const toast = useToast();
  const [table, setTable] = useState(null);
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('Items');
  const [lastConsumed, setLastConsumed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadTable = useCallback(async () => {
    const t = await api.getTable(tableName);
    setTable(t);
  }, [tableName]);

  const loadScan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.scanItems(tableName);
      setItems(res.items);
      setLastConsumed(res.consumedRCU);
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  useEffect(() => {
    setTab('Items');
    loadTable();
    loadScan();
  }, [tableName, loadTable, loadScan]);

  // Light polling so TTL expirations / capacity usage reflect in near real time.
  useEffect(() => {
    const id = setInterval(() => {
      loadTable();
      if (tab === 'Items') loadScan();
    }, 3000);
    return () => clearInterval(id);
  }, [loadTable, loadScan, tab]);

  const refreshAll = () => {
    loadTable();
    loadScan();
    setRefreshKey((k) => k + 1);
  };

  const handleQuery = async (pk, skCondition) => {
    setLoading(true);
    try {
      const res = await api.queryItems(tableName, pk, skCondition);
      setItems(res.items);
      setLastConsumed(res.consumedRCU);
      toast.info(`Query returned ${res.items.length} item(s)`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async (item) => {
    await api.putItem(tableName, item);
    toast.success('Item saved');
    setEditorOpen(false);
    setEditingItem(null);
    refreshAll();
    onTableChanged?.();
  };

  const handleDeleteItem = async (item) => {
    const { partitionKey, sortKey } = table;
    if (!confirm(`Delete item ${item[partitionKey]}${sortKey ? ' / ' + item[sortKey] : ''}?`)) return;
    try {
      await api.deleteItem(tableName, item[partitionKey], sortKey ? item[sortKey] : undefined);
      toast.success('Item deleted');
      refreshAll();
      onTableChanged?.();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleDeleteTable = async () => {
    if (!confirm(`Delete table "${tableName}" and all its items? This cannot be undone.`)) return;
    await api.deleteTable(tableName);
    toast.success(`Table "${tableName}" deleted`);
    onTableDeleted?.();
  };

  if (!table) return <div className="panel-loading">Loading table…</div>;

  return (
    <div className="table-view">
      <div className="table-view__header">
        <div>
          <h2>{table.name}</h2>
          <div className="table-view__badges">
            <Badge tone="default">PK: {table.partitionKey}</Badge>
            {table.sortKey && <Badge tone="default">SK: {table.sortKey}</Badge>}
            <Badge tone={table.billingMode === 'PROVISIONED' ? 'amber' : 'blue'}>{table.billingMode}</Badge>
            <Badge tone="green">{table.itemCount} item(s)</Badge>
          </div>
        </div>
        <div className="table-view__header-actions">
          <button
            className="btn btn--primary"
            onClick={() => {
              setEditingItem(null);
              setEditorOpen(true);
            }}
          >
            + Add item
          </button>
          <button className="btn btn--danger-ghost" onClick={handleDeleteTable}>
            Delete table
          </button>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={`tabs__tab ${tab === t ? 'tabs__tab--active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="table-view__body">
        {tab === 'Items' &&
          (items.length === 0 && !loading ? (
            <EmptyState
              icon="📦"
              title="No items yet"
              subtitle="Put your first item into this table to get started."
              action={
                <button className="btn btn--primary" onClick={() => setEditorOpen(true)}>
                  + Add item
                </button>
              }
            />
          ) : (
            <ItemsTable
              table={table}
              items={items}
              onEdit={(item) => {
                setEditingItem(item);
                setEditorOpen(true);
              }}
              onDelete={handleDeleteItem}
            />
          ))}

        {tab === 'Query' && (
          <>
            <QueryPanel table={table} onQuery={handleQuery} onScan={loadScan} lastConsumed={lastConsumed} loading={loading} />
            <ItemsTable
              table={table}
              items={items}
              onEdit={(item) => {
                setEditingItem(item);
                setEditorOpen(true);
              }}
              onDelete={handleDeleteItem}
            />
          </>
        )}

        {tab === 'Capacity & Cost Advisor' && (
          <>
            <CapacityMeter table={table} />
            <CostAdvisorPanel tableName={tableName} refreshKey={refreshKey} />
          </>
        )}

        {tab === 'Stream (TTL events)' && <StreamPanel tableName={tableName} refreshKey={refreshKey} />}
      </div>

      {editorOpen && (
        <ItemEditorModal
          table={table}
          existingItem={editingItem}
          onClose={() => {
            setEditorOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveItem}
        />
      )}
    </div>
  );
}
