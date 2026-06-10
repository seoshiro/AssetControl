import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from '@phosphor-icons/react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { ContentCard, PageContainer, PageHeader, ScrollArea } from '../components/PageLayout';
import { StatCard } from '../components/ui';
import { formatDate } from '../i18n/format';

export default function InventoryChecksPage() {
  const { t } = useTranslation();
  const [checks, setChecks] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [newItem, setNewItem] = useState({ equipmentId: '', expectedLocationId: '', actualLocationId: '', status: 'FOUND' });
  const { canManageInventory } = useAuth();

  const fetchChecks = async () => {
    const res = await api.get('/inventory-checks');
    setChecks(res.data.data);
  };
  useEffect(() => {
    fetchChecks();
    Promise.all([api.get('/equipment', { params: { limit: 100 } }), api.get('/references/locations')]).then(([eq, loc]) => {
      setEquipment(eq.data.data);
      setLocations(loc.data.data);
    });
  }, []);

  const open = async (id: number) => {
    const res = await api.get(`/inventory-checks/${id}`);
    setSelected(res.data);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/inventory-checks', { title, status: 'IN_PROGRESS' });
    setTitle('');
    await fetchChecks();
    open(res.data.id);
  };

  const updateItem = async (itemId: number, status: string) => {
    await api.put(`/inventory-checks/${selected.id}/items/${itemId}`, { status });
    open(selected.id);
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    await api.post(`/inventory-checks/${selected.id}/items`, {
      equipmentId: Number(newItem.equipmentId),
      expectedLocationId: newItem.expectedLocationId ? Number(newItem.expectedLocationId) : null,
      actualLocationId: newItem.actualLocationId ? Number(newItem.actualLocationId) : null,
      status: newItem.status,
    });
    setNewItem({ equipmentId: '', expectedLocationId: '', actualLocationId: '', status: 'FOUND' });
    open(selected.id);
  };

  const complete = async () => {
    await api.post(`/inventory-checks/${selected.id}/complete`);
    open(selected.id);
    fetchChecks();
  };

  const selectedItems = selected?.items || [];
  const inventorySummary = ['FOUND', 'MISSING', 'MOVED', 'DAMAGED'].map((status) => ({
    status,
    count: selectedItems.filter((item: any) => item.status === status).length,
  }));

  return (
    <PageContainer>
      <PageHeader
        title={t('inventory.title')}
        description={t('inventory.description')}
      />
      {canManageInventory && (
        <ContentCard>
          <form onSubmit={create} className="flex max-w-3xl flex-col gap-3 sm:flex-row">
            <input className="input" placeholder={t('inventory.checkTitlePlaceholder')} value={title} onChange={(e) => setTitle(e.target.value)} required />
            <button className="btn-primary shrink-0"><Plus className="h-4 w-4" weight="regular" /> {t('common.create')}</button>
          </form>
        </ContentCard>
      )}

      <div className="grid min-h-0 min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <ContentCard className="self-start p-0">
          <div className="border-b border-surface-200 px-4 py-3">
            <h2 className="text-sm font-extrabold uppercase text-surface-500">{t('inventory.checks')}</h2>
          </div>
          <ScrollArea className="max-h-[70vh] space-y-2 p-4 pr-2">
            {checks.map((check) => (
              <button key={check.id} onClick={() => open(check.id)} className="w-full rounded-md border border-surface-200 p-3 text-left transition hover:border-primary-400/35 hover:bg-surface-200/50">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <b className="min-w-0 truncate">{check.title}</b>
                  <StatusBadge status={check.status} />
                </div>
                <p className="mt-1 text-xs text-surface-500">{t('inventory.itemsCount', { count: check._count?.items || 0 })}</p>
              </button>
            ))}
          </ScrollArea>
        </ContentCard>
        <ContentCard className="min-h-0">
          {!selected ? <p className="text-surface-500">{t('inventory.selectCheck')}</p> : (
            <>
              <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-extrabold">{selected.title}</h2>
                  <p className="text-xs text-surface-500">{formatDate(selected.startedAt)}</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
                {inventorySummary.map((entry) => (
                  <StatCard
                    key={entry.status}
                    title={t(`status.${entry.status}`)}
                    value={entry.count}
                    tone={entry.status === 'FOUND' ? 'green' : entry.status === 'MISSING' || entry.status === 'DAMAGED' ? 'red' : 'violet'}
                  />
                ))}
              </div>
              {canManageInventory && selected.status !== 'COMPLETED' && (
                <form onSubmit={addItem} className="mb-4 rounded-md border border-surface-200 p-3 space-y-3">
                  <p className="text-sm font-extrabold">{t('inventory.addEquipment')}</p>
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 2xl:grid-cols-4">
                    <select className="input" value={newItem.equipmentId} onChange={(e) => setNewItem({ ...newItem, equipmentId: e.target.value })} required>
                      <option value="">{t('issuances.equipment')}</option>
                      {equipment.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.inventoryNumber}</option>)}
                    </select>
                    <select className="input" value={newItem.expectedLocationId} onChange={(e) => setNewItem({ ...newItem, expectedLocationId: e.target.value })}>
                      <option value="">{t('inventory.expectedLocation')}</option>
                      {locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <select className="input" value={newItem.actualLocationId} onChange={(e) => setNewItem({ ...newItem, actualLocationId: e.target.value })}>
                      <option value="">{t('inventory.actualLocation')}</option>
                      {locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <select className="input" value={newItem.status} onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}>
                      {['FOUND', 'MISSING', 'MOVED', 'DAMAGED'].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                    </select>
                  </div>
                  <button className="btn-primary">{t('inventory.addItem')}</button>
                </form>
              )}
              <ScrollArea className="max-h-[60vh] space-y-2">
                {selected.items.map((item: any) => <div key={item.id} className="rounded-md border border-surface-200 p-3">
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <div className="min-w-0">
                      <b className="block truncate">{item.equipment.name}</b>
                      <p className="truncate font-mono text-xs text-surface-500">{item.equipment.inventoryNumber}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-2 break-words text-xs text-surface-500">{t('inventory.expected')} {item.expectedLocation?.name || '—'} · {t('inventory.actual')} {item.actualLocation?.name || '—'}</p>
                  {canManageInventory && <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">{['FOUND', 'MISSING', 'MOVED', 'DAMAGED'].map((s) => <button key={s} className="btn-secondary px-3 py-1 text-xs" onClick={() => updateItem(item.id, s)}>{t(`status.${s}`)}</button>)}</div>}
                </div>)}
              </ScrollArea>
              {canManageInventory && selected.status !== 'COMPLETED' && <button className="btn-success mt-4" onClick={complete}>{t('inventory.complete')}</button>}
            </>
          )}
        </ContentCard>
      </div>
    </PageContainer>
  );
}
