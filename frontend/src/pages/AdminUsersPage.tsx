import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import { PageContainer, PageHeader, TablePanel } from '../components/PageLayout';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const { t } = useTranslation();
  const fetchUsers = () => api.get('/admin/users').then((res) => setUsers(res.data.data));
  useEffect(() => { fetchUsers(); }, []);

  const updateRole = async (id: number, role: string) => {
    await api.put(`/admin/users/${id}`, { role });
    fetchUsers();
  };

  return (
    <PageContainer>
      <PageHeader title={t('adminUsers.title')} description={t('adminUsers.description')} />
      <TablePanel>
        <table className="table min-w-[900px] table-fixed">
          <thead><tr><th>{t('common.username')}</th><th>{t('common.email')}</th><th>{t('common.role')}</th><th>{t('common.status')}</th><th className="text-right">{t('adminUsers.changeRole')}</th></tr></thead>
          <tbody className="divide-y divide-surface-100">
            {users.map((user) => <tr key={user.id}><td className="font-bold"><span className="block truncate">{user.username}</span></td><td><span className="block truncate">{user.email}</span></td><td><span className="block truncate">{t(`role.${user.role}`, { defaultValue: user.role })}</span></td><td><StatusBadge status={user.isActive ? 'ACTIVE' : 'CANCELLED'} /></td><td className="text-right"><select className="input ml-auto max-w-[210px]" value={user.role} onChange={(e) => updateRole(user.id, e.target.value)}>{['ADMIN','MANAGER','INVENTORY_MANAGER','REPAIR_COORDINATOR','EMPLOYEE','AUDITOR','VIEWER'].map((role) => <option key={role} value={role}>{t(`role.${role}`)}</option>)}</select></td></tr>)}
          </tbody>
        </table>
      </TablePanel>
    </PageContainer>
  );
}
