import { useEffect, useState } from 'react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import { PageContainer, PageHeader, TablePanel } from '../components/PageLayout';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const fetchUsers = () => api.get('/admin/users').then((res) => setUsers(res.data.data));
  useEffect(() => { fetchUsers(); }, []);

  const updateRole = async (id: number, role: string) => {
    await api.put(`/admin/users/${id}`, { role });
    fetchUsers();
  };

  return (
    <PageContainer>
      <PageHeader title="Пользователи и роли" description="RBAC: ADMIN, MANAGER, INVENTORY_MANAGER, REPAIR_COORDINATOR, EMPLOYEE, AUDITOR, VIEWER." />
      <TablePanel>
        <table className="table min-w-[900px] table-fixed">
          <thead><tr><th>Логин</th><th>Email</th><th>Роль</th><th>Статус</th><th className="text-right">Смена роли</th></tr></thead>
          <tbody className="divide-y divide-surface-100">
            {users.map((user) => <tr key={user.id}><td className="font-bold"><span className="block truncate">{user.username}</span></td><td><span className="block truncate">{user.email}</span></td><td><span className="block truncate">{user.role}</span></td><td><StatusBadge status={user.isActive ? 'ACTIVE' : 'CANCELLED'} /></td><td className="text-right"><select className="input ml-auto max-w-[210px]" value={user.role} onChange={(e) => updateRole(user.id, e.target.value)}>{['ADMIN','MANAGER','INVENTORY_MANAGER','REPAIR_COORDINATOR','EMPLOYEE','AUDITOR','VIEWER'].map((role) => <option key={role}>{role}</option>)}</select></td></tr>)}
          </tbody>
        </table>
      </TablePanel>
    </PageContainer>
  );
}
