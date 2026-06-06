import { PageContainer, PageHeader } from '../components/PageLayout';

export default function AboutProjectPage() {
  const processes = ['Поступление оборудования на баланс', 'Закрепление за сотрудником', 'Возврат и история выдач', 'Ремонтная заявка и передача в ремонт', 'Финансы: стоимость, износ и ремонтные затраты', 'Инвентаризация: найдено, перемещено, повреждено, отсутствует', 'Audit log, уведомления и CSV/PDF-отчёты'];

  return (
    <PageContainer>
      <PageHeader title="О проекте" description="Дипломная тема: разработка автоматизированной системы учёта и контроля оборудования предприятия." />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card xl:col-span-2"><h2 className="text-lg font-extrabold">Что показывает система</h2><p className="text-sm text-surface-600 mt-3">Проект демонстрирует не отдельный CRUD, а полный жизненный цикл материальных активов: от постановки на баланс до выдачи, ремонта, инвентаризации, отчётности и контроля действий пользователей.</p></div>
        <div className="card"><h2 className="text-lg font-extrabold">Стек</h2><p className="text-sm text-surface-600 mt-3">React, TypeScript, Vite, TailwindCSS, Node.js, Express, Prisma, PostgreSQL, JWT, Docker, Prometheus, Grafana.</p></div>
      </div>
      <div className="card"><h2 className="text-lg font-extrabold mb-4">Бизнес-процессы для защиты</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{processes.map((p, i) => <div key={p} className="rounded-md border border-surface-200 bg-surface-200/40 p-3"><span className="font-mono text-xs text-surface-500">0{i + 1}</span><p className="font-bold mt-1">{p}</p></div>)}</div></div>
      <div className="card"><h2 className="text-lg font-extrabold">Роли</h2><p className="text-sm text-surface-600 mt-3">ADMIN управляет всем, MANAGER и INVENTORY_MANAGER работают с активами, REPAIR_COORDINATOR отвечает за передачу оборудования в ремонт, EMPLOYEE видит свои данные и уведомления, AUDITOR смотрит отчёты и журнал действий, VIEWER только просматривает обычные данные и отчёты.</p></div>
    </PageContainer>
  );
}
