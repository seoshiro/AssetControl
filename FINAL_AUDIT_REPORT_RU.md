# Финальный audit + repair AssetControl

Дата проверки: 27 мая 2026.

## Что проверено

- Чистый Docker-запуск с `docker compose down -v` и `docker compose up --build -d`.
- Frontend, backend health, Grafana, Prometheus, pgAdmin.
- Вход под ролями ADMIN, MANAGER, INVENTORY_MANAGER, EMPLOYEE, AUDITOR, VIEWER.
- Основные страницы: Dashboard, Equipment, Employees, Issuances, Repairs, Inventory, Reports, Audit log, Notifications, Profile, About, Backup.
- Бизнес-сценарий: создание оборудования, выдача, возврат, ремонт, завершение ремонта, инвентаризация.
- CSV и PDF отчёты.
- Prometheus target и бизнес-метрики Grafana.
- Responsive-проверка: 1920x1080, 1366x768, 768px, 390px, 430px.
- Backend/frontend build и tests.

## Найдено и исправлено

1. Docker frontend обращался к API через абсолютный `localhost`.
   Исправлено: frontend в Docker теперь ходит на `/api`, а nginx проксирует запросы в backend.

2. CORS разрешал только `localhost`.
   Исправлено: backend поддерживает список origin и по умолчанию разрешает `localhost` и `127.0.0.1`.

3. Роль `INVENTORY_MANAGER` имела слишком широкие права.
   Исправлено: она может управлять инвентаризацией, но не может создавать оборудование.

4. EMPLOYEE видел действия с отчётами, которые backend запрещал.
   Исправлено: отчёты и CSV-кнопка скрыты для EMPLOYEE, backend также возвращает 403.

5. В seed не было demo-аккаунтов для `INVENTORY_MANAGER` и `VIEWER`.
   Исправлено: добавлены `inventory_manager / password123` и `viewer / password123`.

6. Списание/потеря оборудования могли выполняться при активной выдаче.
   Исправлено: такие действия теперь блокируются.

7. Возврат оборудования не учитывал активный ремонт.
   Исправлено: если ремонт активен, после возврата статус остаётся `REPAIR`.

8. Отмена ремонта могла оставить оборудование в статусе `REPAIR`.
   Исправлено: при отмене статус возвращается в `AVAILABLE` или `IN_USE`.

9. Ошибка уникальности в Prisma могла уходить как 500.
   Исправлено: уникальные конфликты возвращают 409 с понятным сообщением.

10. CSV-отчёты не учитывали фильтры.
    Исправлено: equipment/issuances/repairs CSV применяют те же фильтры, что и PDF.

## Результаты проверок

- `docker compose config --quiet` — прошло.
- `docker compose up --build -d` — прошло.
- `backend npm run build` — прошло.
- `backend npm run test` — 79 tests passed.
- `frontend npm run build` — прошло.
- `frontend npm run test` — 23 tests passed.
- Всего тестов: 102.

## Runtime

- Frontend: работает.
- Backend health: `ok`.
- PostgreSQL: healthy.
- Prometheus target backend: `UP`.
- Grafana dashboard provisioned.
- pgAdmin открывается.

## Отчёты

Проверены:

- `equipment.csv`
- `issuances.csv`
- `repairs.csv`
- `equipment.pdf`
- `issuances.pdf`
- `repairs.pdf`
- `inventory/:id.pdf`
- `audit-log.pdf`

PDF ответы имеют `Content-Type: application/pdf`, корректный filename и начинаются с `%PDF`.

## Grafana

Проверены метрики:

- `equipment_total`
- `employees_total`
- `active_issuances_total`
- `overdue_issuances_total`
- `repair_tickets_total`
- `audit_logs_total`
- `inventory_checks_total`
- `equipment_by_status`
- `http_requests_total`

Backend target в Prometheus: `UP`.

## Ограничения

- Это дипломный MVP, не промышленная enterprise-система.
- E2E-тесты есть только как ручной/скриптовый audit, не как отдельный CI-suite.
- `npm audit` всё ещё показывает moderate dev/dependency warnings для Vite/Vitest/ExcelJS chain. Безопасное `npm audit fix` применено; оставшиеся исправляются только breaking upgrade через `--force`, поэтому перед защитой не трогались.
- Frontend bundle больше 500 kB из-за Recharts и общей сборки. Это warning, не runtime-баг.

## Итог

Проект готов к демонстрации на защите: запускается через Docker, основные сценарии работают, отчёты скачиваются, Grafana показывает бизнес-метрики, роли проверены, тесты зелёные.
