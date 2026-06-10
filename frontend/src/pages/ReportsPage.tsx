import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      setError(t('reports.downloadError'));
    } finally {
      setLoadingKey(null);
    }
  };

  const reports: ReportCard[] = [
    {
      title: t('reports.equipmentTitle'),
      description: t('reports.equipmentDescription'),
      actions: [
        { label: 'CSV', path: '/reports/equipment.csv', filename: 'equipment.csv', type: 'csv' },
        { label: 'PDF', path: '/reports/equipment.pdf', filename: `equipment-report-${today()}.pdf`, type: 'pdf' },
      ],
    },
    {
      title: t('reports.issuancesTitle'),
      description: t('reports.issuancesDescription'),
      actions: [
        { label: 'CSV', path: '/reports/issuances.csv', filename: 'issuances.csv', type: 'csv' },
        { label: 'PDF', path: '/reports/issuances.pdf', filename: `issuances-report-${today()}.pdf`, type: 'pdf' },
      ],
    },
    {
      title: t('reports.repairsTitle'),
      description: t('reports.repairsDescription'),
      actions: [
        { label: 'CSV', path: '/reports/repairs.csv', filename: 'repairs.csv', type: 'csv' },
        { label: 'PDF', path: '/reports/repairs.pdf', filename: `repairs-report-${today()}.pdf`, type: 'pdf' },
      ],
    },
    {
      title: t('reports.financeTitle'),
      description: t('reports.financeDescription'),
      actions: [
        { label: 'CSV', path: '/reports/finance.csv', filename: 'finance.csv', type: 'csv' },
        { label: 'PDF', path: '/reports/finance.pdf', filename: `finance-report-${today()}.pdf`, type: 'pdf' },
      ],
    },
    {
      title: t('reports.pickupTitle'),
      description: t('reports.pickupDescription'),
      actions: [
        { label: 'CSV', path: '/reports/repair-pickups.csv', filename: 'repair-pickups.csv', type: 'csv' },
        { label: 'PDF', path: '/reports/repair-pickups.pdf', filename: `repair-pickups-report-${today()}.pdf`, type: 'pdf' },
      ],
    },
    {
      title: t('reports.inventoryTitle'),
      description: t('reports.inventoryDescription'),
      actions: [
        { label: 'CSV', path: '/reports/inventory/1.csv', filename: 'inventory-1.csv', type: 'csv' },
        { label: 'PDF', path: '/reports/inventory/1.pdf', filename: `inventory-check-1-${today()}.pdf`, type: 'pdf' },
      ],
    },
    {
      title: t('reports.auditTitle'),
      description: t('reports.auditDescription'),
      auditOnly: true,
      actions: [
        { label: 'PDF', path: '/reports/audit-log.pdf', filename: `audit-log-report-${today()}.pdf`, type: 'pdf' },
      ],
    },
  ];

  const visibleReports = canViewReports ? reports.filter((report) => !report.auditOnly || canAudit) : [];

  return (
    <PageContainer>
      <PageHeader title={t('reports.title')} description={t('reports.description')} />
      {error && <ErrorState message={error} />}
      <ContentCard>
        <ScrollArea className="max-h-[70vh]">
          {visibleReports.length === 0 ? (
            <EmptyState title={t('reports.unavailableTitle')} description={t('reports.unavailableDescription')} />
          ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                        {busy ? t('common.downloading') : `${action.label}`}
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
