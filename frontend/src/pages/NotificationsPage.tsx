import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { ContentCard, PageContainer, PageHeader, ScrollArea } from '../components/PageLayout';
import { formatDateTime } from '../i18n/format';

export default function NotificationsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const { t } = useTranslation();
  const fetchRows = () => api.get('/notifications').then((res) => setRows(res.data.data));
  useEffect(() => { fetchRows(); }, []);

  const read = async (id: number) => {
    await api.put(`/notifications/${id}/read`);
    fetchRows();
  };

  return (
    <PageContainer>
      <PageHeader
        title={t('notifications.title')}
        description={t('notifications.description')}
        actions={<button className="btn-secondary" onClick={async () => { await api.put('/notifications/read-all'); fetchRows(); }}>{t('notifications.readAll')}</button>}
      />
      <ContentCard>
        <ScrollArea className="max-h-[70vh]">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {rows.map((row) => <div key={row.id} className={`min-w-0 rounded-lg border border-surface-200 p-4 ${row.readAt ? 'opacity-65' : ''}`}>
          <div className="flex min-w-0 justify-between gap-3"><h2 className="min-w-0 truncate font-extrabold">{row.title}</h2><span className="text-xs font-bold">{row.type}</span></div>
          <p className="mt-2 break-words text-sm text-surface-600">{row.message}</p>
          <div className="flex justify-between items-center mt-4"><span className="text-xs text-surface-400">{formatDateTime(row.createdAt)}</span>{!row.readAt && <button className="btn-secondary px-3 py-1" onClick={() => read(row.id)}>{t('notifications.read')}</button>}</div>
        </div>)}
      </div>
        </ScrollArea>
      </ContentCard>
    </PageContainer>
  );
}
