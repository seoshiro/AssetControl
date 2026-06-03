import { useEffect, useState } from 'react';
import api from '../api/axios';
import { ContentCard, PageContainer, PageHeader, TablePanel } from '../components/PageLayout';
import { SearchInput } from '../components/ui';

export default function AuditLogPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [action, setAction] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => api.get('/audit-log', { params: { action: action || undefined } }).then((res) => setRows(res.data.data)), 200);
    return () => window.clearTimeout(t);
  }, [action]);

  return (
    <PageContainer>
      <PageHeader title="Audit log" description="Неизменяемая история важных действий пользователей." />
      <ContentCard className="max-w-2xl"><SearchInput placeholder="Фильтр по действию" value={action} onChange={setAction} /></ContentCard>
      <TablePanel>
        <table className="table min-w-[980px] table-fixed">
          <thead><tr><th>Дата</th><th>Пользователь</th><th>Действие</th><th>Сущность</th><th>Метаданные</th></tr></thead>
          <tbody className="divide-y divide-surface-100">
            {rows.map((row) => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString('ru-RU')}</td><td><span className="block truncate">{row.user?.username || 'system'}</span></td><td className="font-bold"><span className="block truncate">{row.action}</span></td><td><span className="block truncate">{row.entityType} #{row.entityId}</span></td><td className="font-mono text-xs"><span className="block truncate">{row.metadata ? JSON.stringify(row.metadata) : ''}</span></td></tr>)}
          </tbody>
        </table>
      </TablePanel>
    </PageContainer>
  );
}
