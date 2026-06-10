import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Archive, Bank, Clock, SealCheck, Toolbox, Truck, WarningCircle } from '@phosphor-icons/react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import { ContentCard, PageContainer, PageHeader, ScrollArea } from '../components/PageLayout';
import { StatCard } from '../components/ui';
import { formatCompactMoney, formatDate } from '../i18n/format';

const colors = ['var(--success)', 'var(--accent)', 'var(--warning)', 'var(--muted)', 'var(--danger)', 'var(--text-secondary)'];
const chartTooltipWrapper = { zIndex: 30, outline: 'none', pointerEvents: 'none' as const };
const chartTooltipProps = {
  wrapperStyle: chartTooltipWrapper,
  offset: 20,
};

function ChartTooltip({ active, label, payload }: { active?: boolean; label?: string; payload?: any[] }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="max-w-[220px] rounded-md border border-surface-200 bg-surface-50 px-3 py-2 text-xs text-surface-900 shadow-raised">
      {label ? <p className="mb-1 font-bold text-surface-950">{label}</p> : null}
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={`${entry.name}-${entry.dataKey || entry.value}`} className="flex min-w-0 items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: entry.color || entry.payload?.fill || 'var(--accent)' }}
            />
            <span className="truncate font-semibold text-surface-700">{entry.name}:</span>
            <span className="shrink-0 font-extrabold text-surface-950">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    api.get('/dashboard/stats').then((res) => setStats(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageContainer><ContentCard>{t('dashboard.loading')}</ContentCard></PageContainer>;
  if (!stats) return <PageContainer><ContentCard>{t('common.noData')}</ContentCard></PageContainer>;

  const cards = [
    { title: t('dashboard.totalEquipment'), value: stats.total, icon: Archive, tone: 'slate' as const },
    { title: t('dashboard.available'), value: stats.available, icon: SealCheck, tone: 'green' as const },
    { title: t('dashboard.inRepair'), value: stats.repair, icon: Toolbox, tone: 'violet' as const },
    { title: t('dashboard.overdue'), value: stats.overdueIssuances, icon: Clock, tone: 'red' as const },
    { title: t('dashboard.writtenOffLost'), value: stats.writtenOff + stats.lost, icon: WarningCircle, tone: 'red' as const },
    { title: t('dashboard.bookValue'), value: formatCompactMoney(stats.totalValue), icon: Bank, tone: 'blue' as const },
    { title: t('dashboard.residualValue'), value: formatCompactMoney(stats.residualValue), icon: Bank, tone: 'green' as const },
    { title: t('dashboard.repairService'), value: formatCompactMoney(stats.repairServiceCost), icon: Toolbox, tone: 'violet' as const },
    { title: t('dashboard.repairPickup'), value: stats.pickupPending + stats.pickupInProgress, icon: Truck, tone: 'violet' as const },
    { title: t('dashboard.deliveredRepair'), value: stats.pickupDelivered, icon: Truck, tone: 'green' as const },
  ];

  const statusChart = stats.statusStats.map((item: any) => ({ ...item, name: t(`status.${item.status}`, { defaultValue: item.status }) }));

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.description')}
        actions={
        <div className="hidden xl:flex items-center gap-2 text-sm text-surface-500">
          <Toolbox className="h-4 w-4 text-surface-500" weight="regular" />
          {t('dashboard.criticalRepairs')} <b className="text-surface-900">{stats.criticalRepairs}</b>
        </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <StatCard key={card.title} title={card.title} value={card.value} tone={card.tone} icon={<Icon className="h-5 w-5" weight="regular" />} />
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <ContentCard className="xl:col-span-2">
          <h2 className="mb-4 text-lg font-extrabold text-surface-950">{t('dashboard.issuancesReturns30')}</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <Tooltip {...chartTooltipProps} content={<ChartTooltip />} />
                <Area type="monotone" dataKey="issued" name={t('dashboard.issued')} stroke="var(--accent)" fill="color-mix(in srgb, var(--accent) 14%, transparent)" />
                <Area type="monotone" dataKey="returned" name={t('dashboard.returned')} stroke="var(--success)" fill="color-mix(in srgb, var(--success) 14%, transparent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ContentCard>

        <ContentCard>
          <h2 className="mb-4 text-lg font-extrabold text-surface-950">{t('dashboard.statuses')}</h2>
          <div className="h-64 px-3 pb-2 sm:h-72 sm:px-5">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
                <Pie data={statusChart} dataKey="count" nameKey="name" innerRadius={46} outerRadius={78} paddingAngle={2} isAnimationActive={false}>
                  {statusChart.map((_entry: any, index: number) => <Cell key={index} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip {...chartTooltipProps} content={<ChartTooltip />} cursor={false} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ContentCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ContentCard>
          <h2 className="mb-4 text-lg font-extrabold text-surface-950">{t('dashboard.equipmentByCategory')}</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.categoryStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <Tooltip {...chartTooltipProps} content={<ChartTooltip />} />
                <Bar dataKey="count" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ContentCard>

        <ContentCard>
          <h2 className="mb-4 text-lg font-extrabold text-surface-950">{t('dashboard.recentActions')}</h2>
          <ScrollArea className="max-h-[340px] space-y-3">
            {stats.recentAudit.map((item: any) => (
              <div key={item.id} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-surface-200 bg-surface-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-surface-900">{item.action}</p>
                  <p className="truncate text-xs text-surface-500">{item.user?.username || t('common.system')} · {item.entityType}</p>
                </div>
                <span className="text-xs text-surface-400">{formatDate(item.createdAt)}</span>
              </div>
            ))}
          </ScrollArea>
        </ContentCard>
      </div>

      <ContentCard>
        <h2 className="mb-4 text-lg font-extrabold text-surface-950">{t('dashboard.recentIssuances')}</h2>
        <ScrollArea className="max-h-[360px]">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {stats.recentIssuances.map((item: any) => (
            <div key={item.id} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-surface-200 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{item.equipment.name}</p>
                <p className="truncate text-xs text-surface-500">{item.employee.fullName} · {item.employee.department.name}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
          ))}
        </div>
        </ScrollArea>
      </ContentCard>
    </PageContainer>
  );
}
