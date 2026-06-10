import { useTranslation } from 'react-i18next';
import { PageContainer, PageHeader } from '../components/PageLayout';

export default function AboutProjectPage() {
  const { t } = useTranslation();
  const processes = t('about.processes', { returnObjects: true }) as string[];

  return (
    <PageContainer>
      <PageHeader title={t('about.title')} description={t('about.description')} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card xl:col-span-2"><h2 className="text-lg font-extrabold">{t('about.systemTitle')}</h2><p className="text-sm text-surface-600 mt-3">{t('about.systemText')}</p></div>
        <div className="card"><h2 className="text-lg font-extrabold">{t('about.stack')}</h2><p className="text-sm text-surface-600 mt-3">React, TypeScript, Vite, TailwindCSS, Node.js, Express, Prisma, PostgreSQL, JWT, Docker, Prometheus, Grafana.</p></div>
      </div>
      <div className="card"><h2 className="text-lg font-extrabold mb-4">{t('about.processesTitle')}</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{processes.map((p, i) => <div key={p} className="rounded-md border border-surface-200 bg-surface-200/40 p-3"><span className="font-mono text-xs text-surface-500">0{i + 1}</span><p className="font-bold mt-1">{p}</p></div>)}</div></div>
      <div className="card"><h2 className="text-lg font-extrabold">{t('about.rolesTitle')}</h2><p className="text-sm text-surface-600 mt-3">{t('about.rolesText')}</p></div>
    </PageContainer>
  );
}
