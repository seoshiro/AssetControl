import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { ContentCard, PageContainer, PageHeader, TablePanel } from '../components/PageLayout';
import { SearchInput } from '../components/ui';
import { formatDateTime } from '../i18n/format';

export default function AuditLogPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [action, setAction] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    const t = window.setTimeout(() => api.get('/audit-log', { params: { action: action || undefined } }).then((res) => setRows(res.data.data)), 200);
    return () => window.clearTimeout(t);
  }, [action]);

  return (
    <PageContainer>
      <PageHeader title={t('auditLog.title')} description={t('auditLog.description')} />
      <ContentCard className="max-w-2xl"><SearchInput placeholder={t('auditLog.filterPlaceholder')} value={action} onChange={setAction} /></ContentCard>
      <TablePanel>
        <table className="table min-w-[980px] table-fixed">
          <thead><tr><th>{t('common.date')}</th><th>{t('common.user')}</th><th>{t('auditLog.action')}</th><th>{t('auditLog.entity')}</th><th>{t('auditLog.metadata')}</th></tr></thead>
          <tbody className="divide-y divide-surface-100">
            {rows.map((row) => <tr key={row.id}><td>{formatDateTime(row.createdAt)}</td><td><span className="block truncate">{row.user?.username || t('common.system')}</span></td><td className="font-bold"><span className="block truncate">{row.action}</span></td><td><span className="block truncate">{row.entityType} #{row.entityId}</span></td><td className="font-mono text-xs"><span className="block truncate">{row.metadata ? JSON.stringify(row.metadata) : ''}</span></td></tr>)}
          </tbody>
        </table>
      </TablePanel>
    </PageContainer>
  );
}
