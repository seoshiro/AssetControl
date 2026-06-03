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
  const [showForm, setShowForm] = useState(Boolean(params.get('equipmentId')));
  const [form, setForm] = useState({ equipmentId: params.get('equipmentId') || '', priority: 'MEDIUM', reason: '' });
  const { canManage } = useAuth();

  const fetchData = async () => {
    const [r, e] = await Promise.all([api.get('/repairs'), api.get('/equipment', { params: { limit: 100 } })]);
    setRepairs(r.data.data);
    setEquipment(e.data.data);
  };
  useEffect(() => { fetchData(); }, []);

  const createRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/repairs', { ...form, equipmentId: Number(form.equipmentId) });
    setForm({ equipmentId: '', priority: 'MEDIUM', reason: '' });
    setShowForm(false);
    fetchData();
  };

  const complete = async (id: number) => {
    const result = prompt('Результат ремонта') || 'Ремонт выполнен';
    await api.put(`/repairs/${id}/complete`, { result, cost: 0 });
    fetchData();
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
          <form onSubmit={createRepair} className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_180px_minmax(0,2fr)_auto]">
            <select className="input" value={form.equipmentId} onChange={(e) => setForm({ ...form, equipmentId: e.target.value })} required><option value="">Оборудование</option>{equipment.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.inventoryNumber}</option>)}</select>
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select>
            <input className="input" placeholder="Причина обращения" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
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
            {canManage && row.status !== 'DONE' && row.status !== 'CANCELLED' && (
              <div className="mt-4 flex flex-wrap gap-2">
                <select className="input max-w-[180px]" value={row.status} onChange={(e) => changeStatus(row.id, e.target.value)}>
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
                <button className="btn-secondary" onClick={() => complete(row.id)}>Завершить ремонт</button>
              </div>
            )}
          </div>
        ))}
          </div>
        </ScrollArea>
      </ContentCard>
    </PageContainer>
  );
}
