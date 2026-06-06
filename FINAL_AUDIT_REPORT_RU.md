# Финальный аудит AssetControl

Дата актуализации: 6 июня 2026.

Этот файл написан простым языком. Его задача - помочь быстро объяснить комиссии, что проект проверен и готов к демонстрации.

## Короткий итог

AssetControl готов к защите.

Система запускается через Docker, frontend открывается, backend отвечает, база заполняется demo-данными, роли работают, отчёты формируются, Grafana получает метрики.

В актуальной версии дополнительно проверены две большие фичи:

- finance module;
- repair pickup workflow.

Простыми словами:

> Проект теперь умеет не только учитывать оборудование, но и показывать его стоимость, затраты на ремонт и процесс доставки оборудования в ремонт.

## Что проверено

Проверены основные части проекта:

- Prisma schema;
- миграции;
- seed-данные;
- demo-аккаунты;
- backend API;
- frontend-страницы;
- роли и ограничения доступа;
- CSV и PDF отчёты;
- dashboard-метрики;
- Prometheus/Grafana;
- Docker-запуск;
- frontend build;
- frontend tests;
- UI страницы Finance;
- UI donut chart в тёмной теме.

## Что реально работает

### База данных

В `backend/prisma/schema.prisma` есть:

- роль `REPAIR_COORDINATOR`;
- финансовые поля оборудования;
- модель `EquipmentFinancialOperation`;
- enum `FinancialStatus`;
- enum `RepairPickupStatus`;
- поля pickup в `RepairTicket`.

В `backend/prisma/migrations/20260605000000_finance_repair_pickup/` есть миграция для finance и repair pickup.

В `backend/prisma/seed.ts` есть demo-данные и demo-логин:

```text
repair_coordinator / password123
```

### Backend API

Реализованы endpoints:

```text
/api/finance
/api/repair-pickups
```

Finance API умеет:

- получать финансовую сводку;
- получать финансовые данные по оборудованию;
- создавать финансовую операцию;
- изменять финансовую операцию;
- удалять финансовую операцию;
- пересчитывать остаточную стоимость и статус.

Repair pickup API умеет:

- показывать задачи передачи в ремонт;
- показывать задачи конкретного координатора;
- менять статус задачи;
- работать с координаторами ремонта.

Также проверены:

- запрет доступа `EMPLOYEE` к finance;
- ограниченный доступ `VIEWER`;
- audit log;
- уведомления;
- CSV/PDF отчёты.

### Frontend

Добавлены страницы:

- `frontend/src/pages/FinancePage.tsx`;
- `frontend/src/pages/RepairPickupTasksPage.tsx`.

Обновлены:

- маршруты в `frontend/src/App.tsx`;
- sidebar в `frontend/src/components/Sidebar.tsx`;
- карточки и badges статусов;
- dashboard;
- reports page;
- equipment details page.

Проверено:

- страница Finance открывается;
- левая карточка на Finance больше не растягивается вниз;
- список оборудования имеет внутренний scroll;
- форма справа не сломана;
- mobile layout без горизонтального scroll;
- координатор ремонта видит свои задачи;
- финансовые страницы скрыты от ролей, которым нельзя видеть финансы.

### Reports

Работают отчёты:

- finance CSV;
- finance PDF;
- repair pickup CSV;
- repair pickup PDF;
- старые equipment/issuances/repairs/inventory/audit отчёты.

PDF-отчёты имеют summary-блоки и нормальный официальный вид.

### Dashboard

Добавлены и проверены метрики:

- pending pickup;
- in progress pickup;
- delivered pickup;
- overdue pickup;
- residual asset value;
- repair/service cost.

### Grafana / Prometheus

Backend отдаёт метрики для Prometheus.

Grafana dashboard JSON обновлён:

```text
monitoring/grafana/dashboards/equipment-control-overview.json
```

После seed-данных панели не должны быть пустыми, потому что база содержит demo-оборудование, ремонты, выдачи, finance operations и repair pickup tasks.

## Какие проблемы найдены и исправлены

### 1. FinancePage растягивала левую карточку

Причина:

CSS grid по умолчанию растягивает элементы по высоте строки.

Исправлено:

- в grid добавлено `items-start`;
- на левую карточку добавлено `self-start`;
- список оборудования оставлен с `max-h-[520px]` и внутренним scroll.

Файл:

```text
frontend/src/pages/FinancePage.tsx
```

### 2. Похожий риск найден в InventoryChecksPage

Причина:

Там тоже была grid-сетка с левой карточкой-списком.

Исправлено аналогично:

- `items-start`;
- `self-start`.

Файл:

```text
frontend/src/pages/InventoryChecksPage.tsx
```

### 3. Donut chart плохо выглядел в dark mode

Причина:

Стандартный Recharts tooltip выглядел слишком сыро и мог плохо читаться в тёмной теме.

Исправлено:

- добавлен custom tooltip;
- формат стал `Доступно: 14`;
- убран лишний пробел перед двоеточием;
- tooltip использует цветовые токены темы;
- добавлены border, shadow и offset;
- donut уменьшен и центрирован;
- отключена animation у pie chart, чтобы seeded dashboard стабильно показывал сектора.

Файл:

```text
frontend/src/pages/DashboardPage.tsx
```

## Какие команды запущены

Frontend:

```bash
cd frontend
npm run build
npm test -- --run
```

Результат:

```text
4 test files passed
27 tests passed
```

Docker:

```bash
docker compose up --build -d frontend
```

Результат:

```text
frontend rebuilt
backend running
frontend running
database healthy
```

Backend health:

```text
http://localhost:5847/api/health
```

Ответ:

```json
{
  "status": "ok",
  "service": "equipment-control-api"
}
```

## Технические предупреждения

Эти пункты не мешают защите:

- Vite предупреждает, что frontend chunk больше 500 kB.
- Vitest показывает React Router future flag warnings.
- Это дипломный MVP, а не промышленная enterprise-система.
- Для будущего развития можно добавить QR-коды, загрузку фото, отдельные акты выдачи/возврата и e2e-тесты.

## Простая фраза для защиты

Можно сказать так:

> Я провёл финальную проверку проекта. Система запускается через Docker, роли работают, данные создаются seed-скриптом, отчёты формируются, Grafana показывает метрики. В последней версии добавлены финансы оборудования и задачи передачи оборудования в ремонт. Также исправлены UI-проблемы на странице Finance и в donut-графике тёмной темы.
