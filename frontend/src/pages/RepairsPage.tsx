import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from '@phosphor-icons/react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { ContentCard, PageContainer, PageHeader, ScrollArea } from '../components/PageLayout';

export default function RepairsPage() {
  const [params] = useSearchParams();
  const [repairs, setRepairs] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(Boolean(params.get('equipmentId')));
  const [completeDialog, setCompleteDialog] = useState<any | null>(null);
  const [completeForm, setCompleteForm] = useState({ result: 'Ремонт выполнен', cost: '0' });
  const [savingComplete, setSavingComplete] = useState(false);
  const [form, setForm] = useState({
    equipmentId: params.get('equipmentId') || '',
    priority: 'MEDIUM',
    reason: '',
    pickupLocationId: '',
    destinationLocationId: '',
    assignedCoordinatorId: '',
    pickupDueDate: '',
    pickupComment: '',
  });
  const { canManage } = useAuth();

  const fetchData = async () => {
    const [r, e, l, c] = await Promise.all([
      api.get('/repairs'),
      api.get('/equipment', { params: { limit: 100 } }),
      api.get('/references/locations'),
      api.get('/repair-pickups/coordinators'),
    ]);
    setRepairs(r.data.data);
    setEquipment(e.data.data);
    setLocations(l.data.data);
    setCoordinators(c.data.data);
  };
  useEffect(() => { fetchData(); }, []);

  const createRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/repairs', {
      ...form,
      equipmentId: Number(form.equipmentId),
      pickupLocationId: form.pickupLocationId ? Number(form.pickupLocationId) : undefined,
      destinationLocationId: form.destinationLocationId ? Number(form.destinationLocationId) : undefined,
      assignedCoordinatorId: form.assignedCoordinatorId ? Number(form.assignedCoordinatorId) : undefined,
      pickupDueDate: form.pickupDueDate || undefined,
      pickupComment: form.pickupComment || undefined,
    });
    setForm({
      equipmentId: '',
      priority: 'MEDIUM',
      reason: '',
      pickupLocationId: '',
      destinationLocationId: '',
      assignedCoordinatorId: '',
      pickupDueDate: '',
      pickupComment: '',
    });
    setShowForm(false);
    fetchData();
  };

  const submitComplete = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!completeDialog) return;
    setSavingComplete(true);
    try {
      await api.put(`/repairs/${completeDialog.id}/complete`, {
        result: completeForm.result.trim() || 'Ремонт выполнен',
        cost: Number(completeForm.cost || 0),
      });
      setCompleteDialog(null);
      setCompleteForm({ result: 'Ремонт выполнен', cost: '0' });
      await fetchData();
    } finally {
      setSavingComplete(false);
    }
  };

  const changeStatus = async (id: number, status: string) => {
    await api.put(`/repairs/${id}/status`, { status });
    fetchData();
  };

  return (
    <PageContainer>
      <PageHeader
        title="Ремонтные заявки"
        description="Контроль неисправностей, приоритетов и стоимости ремонта."
        actions={canManage && <button className="btn-primary" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" weight="regular" /> Заявка</button>}
      />

      {showForm && (
        <ContentCard>
          <form onSubmit={createRepair} className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-4">
            <select className="input" value={form.equipmentId} onChange={(e) => setForm({ ...form, equipmentId: e.target.value })} required><option value="">Оборудование</option>{equipment.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.inventoryNumber}</option>)}</select>
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select>
            <input className="input" placeholder="Причина обращения" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
            <select className="input" value={form.assignedCoordinatorId} onChange={(e) => setForm({ ...form, assignedCoordinatorId: e.target.value })}>
              <option value="">Координатор ремонта</option>
              {coordinators.map((item) => <option key={item.id} value={item.id}>{item.username}</option>)}
            </select>
            <select className="input" value={form.pickupLocationId} onChange={(e) => setForm({ ...form, pickupLocationId: e.target.value })}>
              <option value="">Откуда забрать</option>
              {locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className="input" value={form.destinationLocationId} onChange={(e) => setForm({ ...form, destinationLocationId: e.target.value })}>
              <option value="">Куда доставить</option>
              {locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input className="input" type="date" value={form.pickupDueDate} onChange={(e) => setForm({ ...form, pickupDueDate: e.target.value })} />
            <input className="input" placeholder="Комментарий к передаче" value={form.pickupComment} onChange={(e) => setForm({ ...form, pickupComment: e.target.value })} />
            <button className="btn-success">Создать</button>
          </form>
        </ContentCard>
      )}

      <ContentCard>
        <ScrollArea className="max-h-[70vh]">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {repairs.map((row) => (
          <div key={row.id} className="min-w-0 rounded-lg border border-surface-200 p-4">
            <div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-extrabold">{row.equipment.name}</h2><p className="truncate font-mono text-xs text-surface-500">{row.equipment.inventoryNumber}</p></div><StatusBadge status={row.status} /></div>
            <p className="mt-3 break-words text-sm">{row.reason}</p>
            <div className="mt-3 flex items-center justify-between text-xs text-surface-500">
              <span>Приоритет: <b className="text-surface-900">{row.priority}</b></span>
              <span>{new Date(row.createdAt).toLocaleDateString('ru-RU')}</span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-surface-500 md:grid-cols-2">
              <span>Передача: <StatusBadge status={row.pickupStatus || 'PENDING'} /></span>
              <span className="truncate">Координатор: <b className="text-surface-900">{row.assignedCoordinator?.username || 'не назначен'}</b></span>
              <span className="truncate">Откуда: <b className="text-surface-900">{row.pickupLocation?.name || row.equipment.location?.name || 'не указано'}</b></span>
              <span className="truncate">Куда: <b className="text-surface-900">{row.destinationLocation?.name || 'не указано'}</b></span>
            </div>
            {canManage && row.status !== 'DONE' && row.status !== 'CANCELLED' && (
              <div className="mt-4 flex flex-wrap gap-2">
                <select className="input max-w-[180px]" value={row.status} onChange={(e) => changeStatus(row.id, e.target.value)}>
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setCompleteDialog(row);
                    setCompleteForm({ result: row.result || 'Ремонт выполнен', cost: String(row.cost || 0) });
                  }}
                >
                  Завершить ремонт
                </button>
              </div>
            )}
          </div>
        ))}
          </div>
        </ScrollArea>
      </ContentCard>

      {completeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/45 p-4">
          <form onSubmit={submitComplete} className="w-full max-w-lg rounded-lg border border-surface-200 bg-surface-50 p-5 shadow-raised">
            <p className="section-title">Завершение ремонта</p>
            <h2 className="mt-2 text-lg font-extrabold text-surface-950">{completeDialog.equipment.name}</h2>
            <p className="mt-1 font-mono text-xs text-surface-500">{completeDialog.equipment.inventoryNumber}</p>

            <label className="label mt-5" htmlFor="repair-complete-result">Результат ремонта</label>
            <textarea
              id="repair-complete-result"
              className="input min-h-[112px] resize-y"
              value={completeForm.result}
              onChange={(event) => setCompleteForm({ ...completeForm, result: event.target.value })}
              required
            />

            <label className="label mt-3" htmlFor="repair-complete-cost">Стоимость</label>
            <input
              id="repair-complete-cost"
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={completeForm.cost}
              onChange={(event) => setCompleteForm({ ...completeForm, cost: event.target.value })}
            />

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn-secondary" disabled={savingComplete} onClick={() => setCompleteDialog(null)}>
                Отмена
              </button>
              <button type="submit" className="btn-primary" disabled={savingComplete}>
                {savingComplete ? 'Сохранение...' : 'Подтвердить завершение'}
              </button>
            </div>
          </form>
        </div>
      )}
    </PageContainer>
  );
}
