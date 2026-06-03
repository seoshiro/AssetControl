import { useEffect, useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { ContentCard, PageContainer, PageHeader, TablePanel } from '../components/PageLayout';
import { ErrorState } from '../components/ui';

export default function IssuancesPage() {
  const [issuances, setIssuances] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ equipmentId: '', employeeId: '', expectedReturnAt: '' });
  const [error, setError] = useState('');
  const { canManage } = useAuth();

  const fetchData = async () => {
    const [i, e, emp] = await Promise.all([
      api.get('/issuances'),
      api.get('/equipment', { params: { status: 'AVAILABLE', limit: 100 } }),
      api.get('/employees'),
    ]);
    setIssuances(i.data.data);
    setEquipment(e.data.data);
    setEmployees(emp.data.data);
  };

  useEffect(() => { fetchData(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/issuances', {
        equipmentId: Number(form.equipmentId),
        employeeId: Number(form.employeeId),
        expectedReturnAt: form.expectedReturnAt || null,
      });
      setForm({ equipmentId: '', employeeId: '', expectedReturnAt: '' });
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка выдачи');
    }
  };

  const returnItem = async (id: number) => {
    const comment = prompt('Комментарий к возврату') || '';
    await api.put(`/issuances/${id}/return`, { returnComment: comment });
    fetchData();
  };

  return (
    <PageContainer>
      <PageHeader
        title="Выдачи и возвраты"
        description="Транзакционный жизненный цикл закрепления оборудования."
        actions={canManage && <button className="btn-primary" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" weight="regular" /> Выдать</button>}
      />

      {showForm && (
        <ContentCard>
        <form onSubmit={submit} className="space-y-4">
          {error && <ErrorState message={error} />}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select className="input" value={form.equipmentId} onChange={(e) => setForm({ ...form, equipmentId: e.target.value })} required>
              <option value="">Оборудование</option>
              {equipment.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.inventoryNumber}</option>)}
            </select>
            <select className="input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required>
              <option value="">Сотрудник</option>
              {employees.map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.department?.name}</option>)}
            </select>
            <input className="input" type="date" value={form.expectedReturnAt} onChange={(e) => setForm({ ...form, expectedReturnAt: e.target.value })} />
          </div>
          <div className="flex gap-3"><button className="btn-success">Подтвердить выдачу</button><button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Отмена</button></div>
        </form>
        </ContentCard>
      )}

      <TablePanel>
        <table className="table min-w-[980px] table-fixed">
          <thead><tr><th>Оборудование</th><th>Сотрудник</th><th>Выдано</th><th>План возврата</th><th>Факт возврата</th><th>Статус</th>{canManage && <th className="text-right">Действия</th>}</tr></thead>
          <tbody className="divide-y divide-surface-100">
            {issuances.map((row) => (
              <tr key={row.id}>
                <td><p className="truncate font-bold">{row.equipment.name}</p><p className="truncate font-mono text-xs text-surface-500">{row.equipment.inventoryNumber}</p></td>
                <td><p className="truncate">{row.employee.fullName}</p><p className="truncate text-xs text-surface-500">{row.employee.department?.name}</p></td>
                <td>{new Date(row.issuedAt).toLocaleDateString('ru-RU')}</td>
                <td>{row.expectedReturnAt ? new Date(row.expectedReturnAt).toLocaleDateString('ru-RU') : '—'}</td>
                <td>{row.returnedAt ? new Date(row.returnedAt).toLocaleDateString('ru-RU') : '—'}</td>
                <td><StatusBadge status={row.status} /></td>
                {canManage && <td className="text-right">{!row.returnedAt && <button className="btn-secondary px-3 py-1" onClick={() => returnItem(row.id)}>Вернуть</button>}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>
    </PageContainer>
  );
}
