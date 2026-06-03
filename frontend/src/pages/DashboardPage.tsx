import { useEffect, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Archive, Bank, Clock, SealCheck, Toolbox, WarningCircle } from '@phosphor-icons/react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import { ContentCard, PageContainer, PageHeader, ScrollArea } from '../components/PageLayout';
import { StatCard } from '../components/ui';

const statusLabels: Record<string, string> = {
  AVAILABLE: 'Доступно',
  IN_USE: 'Используется',
  REPAIR: 'Ремонт',
  RESERVED: 'Резерв',
  WRITTEN_OFF: 'Списано',
  LOST: 'Потеряно',
};

const colors = ['var(--success)', 'var(--accent)', 'var(--warning)', 'var(--muted)', 'var(--danger)', 'var(--text-secondary)'];
const chartTooltip = { background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' };

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats').then((res) => setStats(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageContainer><ContentCard>Загрузка dashboard...</ContentCard></PageContainer>;
  if (!stats) return <PageContainer><ContentCard>Нет данных</ContentCard></PageContainer>;

  const cards = [
    { title: 'Всего оборудования', value: stats.total, icon: Archive, tone: 'slate' as const },
    { title: 'Доступно', value: stats.available, icon: SealCheck, tone: 'green' as const },
    { title: 'На ремонте', value: stats.repair, icon: Toolbox, tone: 'violet' as const },
    { title: 'Просрочено', value: stats.overdueIssuances, icon: Clock, tone: 'red' as const },
    { title: 'Списано/потеряно', value: stats.writtenOff + stats.lost, icon: WarningCircle, tone: 'red' as const },
    { title: 'Балансовая стоимость', value: `${Math.round(stats.totalValue / 1000).toLocaleString('ru-RU')}k ₸`, icon: Bank, tone: 'blue' as const },
  ];

  const statusChart = stats.statusStats.map((item: any) => ({ ...item, name: statusLabels[item.status] || item.status }));

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Операционный dashboard"
        description="Баланс, выдачи, ремонты, риски и последние действия в одном месте."
        actions={
        <div className="hidden xl:flex items-center gap-2 text-sm text-surface-500">
          <Toolbox className="h-4 w-4 text-surface-500" weight="regular" />
          Критичных ремонтов: <b className="text-surface-900">{stats.criticalRepairs}</b>
        </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <StatCard key={card.title} title={card.title} value={card.value} tone={card.tone} icon={<Icon className="h-5 w-5" weight="regular" />} />
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <ContentCard className="xl:col-span-2">
          <h2 className="mb-4 text-lg font-extrabold text-surface-950">Выдачи и возвраты за 30 дней</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltip} />
                <Area type="monotone" dataKey="issued" name="Выдано" stroke="var(--accent)" fill="color-mix(in srgb, var(--accent) 14%, transparent)" />
                <Area type="monotone" dataKey="returned" name="Возвращено" stroke="var(--success)" fill="color-mix(in srgb, var(--success) 14%, transparent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ContentCard>

        <ContentCard>
          <h2 className="mb-4 text-lg font-extrabold text-surface-950">Статусы</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusChart} dataKey="count" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={2}>
                  {statusChart.map((_entry: any, index: number) => <Cell key={index} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip contentStyle={chartTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ContentCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ContentCard>
          <h2 className="mb-4 text-lg font-extrabold text-surface-950">Оборудование по категориям</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.categoryStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltip} />
                <Bar dataKey="count" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ContentCard>

        <ContentCard>
          <h2 className="mb-4 text-lg font-extrabold text-surface-950">Последние действия</h2>
          <ScrollArea className="max-h-[340px] space-y-3">
            {stats.recentAudit.map((item: any) => (
              <div key={item.id} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-surface-200 bg-surface-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-surface-900">{item.action}</p>
                  <p className="truncate text-xs text-surface-500">{item.user?.username || 'system'} · {item.entityType}</p>
                </div>
                <span className="text-xs text-surface-400">{new Date(item.createdAt).toLocaleDateString('ru-RU')}</span>
              </div>
            ))}
          </ScrollArea>
        </ContentCard>
      </div>

      <ContentCard>
        <h2 className="mb-4 text-lg font-extrabold text-surface-950">Последние выдачи</h2>
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
