import { useState } from 'react';
import { DownloadSimple, FilePdf } from '@phosphor-icons/react';
import api from '../api/axios';
import { ContentCard, PageContainer, PageHeader, ScrollArea } from '../components/PageLayout';
import { EmptyState, ErrorState } from '../components/ui';
import { useAuth } from '../context/AuthContext';

type ReportAction = {
  label: string;
  path: string;
  filename: string;
  type: 'csv' | 'pdf';
};

type ReportCard = {
  title: string;
  description: string;
  actions: ReportAction[];
  auditOnly?: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function ReportsPage() {
  const { canAudit, canViewReports } = useAuth();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  const download = async (action: ReportAction) => {
    const key = `${action.type}:${action.path}`;
    setLoadingKey(key);
    setError('');
    try {
      const response = await api.get(action.path, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: action.type === 'pdf' ? 'application/pdf' : 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = action.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Не удалось скачать отчёт. Проверьте права доступа или повторите попытку.');
    } finally {
      setLoadingKey(null);
    }
  };

  const reports: ReportCard[] = [
    {
      title: 'Сводный реестр оборудования',
      description: 'Инвентарная ведомость активов: статусы, владельцы, локации, стоимость и гарантия.',
      actions: [
        { label: 'CSV', path: '/reports/equipment.csv', filename: 'equipment.csv', type: 'csv' },
        { label: 'PDF', path: '/reports/equipment.pdf', filename: `equipment-report-${today()}.pdf`, type: 'pdf' },
      ],
    },
    {
      title: 'История выдач',
      description: 'Движение оборудования по сотрудникам: активные, возвращённые и просроченные выдачи.',
      actions: [
        { label: 'CSV', path: '/reports/issuances.csv', filename: 'issuances.csv', type: 'csv' },
        { label: 'PDF', path: '/reports/issuances.pdf', filename: `issuances-report-${today()}.pdf`, type: 'pdf' },
      ],
    },
    {
      title: 'Ремонтные заявки',
      description: 'Техническое обслуживание: причины, приоритеты, статусы, стоимость и результаты.',
      actions: [
        { label: 'CSV', path: '/reports/repairs.csv', filename: 'repairs.csv', type: 'csv' },
        { label: 'PDF', path: '/reports/repairs.pdf', filename: `repairs-report-${today()}.pdf`, type: 'pdf' },
      ],
    },
    {
      title: 'Demo-инвентаризация',
      description: 'Официальный акт проверки: найдено, отсутствует, перемещено, повреждено.',
      actions: [
        { label: 'CSV', path: '/reports/inventory/1.csv', filename: 'inventory-1.csv', type: 'csv' },
        { label: 'PDF', path: '/reports/inventory/1.pdf', filename: `inventory-check-1-${today()}.pdf`, type: 'pdf' },
      ],
    },
    {
      title: 'Audit log',
      description: 'Журнал действий пользователей и системных событий для аудитора.',
      auditOnly: true,
      actions: [
        { label: 'PDF', path: '/reports/audit-log.pdf', filename: `audit-log-report-${today()}.pdf`, type: 'pdf' },
      ],
    },
  ];

  const visibleReports = canViewReports ? reports.filter((report) => !report.auditOnly || canAudit) : [];

  return (
    <PageContainer>
      <PageHeader title="Отчёты и экспорт" description="CSV для Excel и PDF для официального представления, печати и защиты проекта." />
      {error && <ErrorState message={error} />}
      <ContentCard>
        <ScrollArea className="max-h-[70vh]">
          {visibleReports.length === 0 ? (
            <EmptyState title="Отчёты недоступны" description="Для этой роли глобальные отчёты скрыты. Обратитесь к администратору или аудитору." />
          ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {visibleReports.map((report) => (
              <section key={report.title} className="flex min-w-0 flex-col rounded-lg border border-surface-200 bg-surface-50 p-4">
                <div className="min-h-[116px]">
                  <h2 className="text-base font-extrabold text-surface-950">{report.title}</h2>
                  <p className="mt-2 break-words text-sm leading-6 text-surface-500">{report.description}</p>
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {report.actions.map((action) => {
                    const key = `${action.type}:${action.path}`;
                    const busy = loadingKey === key;
                    const Icon = action.type === 'pdf' ? FilePdf : DownloadSimple;
                    return (
                      <button
                        key={key}
                        className={action.type === 'pdf' ? 'btn-primary min-w-[104px]' : 'btn-secondary min-w-[104px]'}
                        disabled={Boolean(loadingKey)}
                        onClick={() => download(action)}
                      >
                        <Icon className="h-4 w-4" weight="regular" />
                        {busy ? 'Скачивание...' : `${action.label}`}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
          )}
        </ScrollArea>
      </ContentCard>
    </PageContainer>
  );
}
