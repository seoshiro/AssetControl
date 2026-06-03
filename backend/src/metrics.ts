import type { NextFunction, Request, Response } from 'express';
import client from 'prom-client';
import prisma from './lib/prisma';

const EQUIPMENT_STATUSES = ['AVAILABLE', 'IN_USE', 'REPAIR', 'RESERVED', 'WRITTEN_OFF', 'LOST'];
const REPAIR_STATUSES = ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'];
const INVENTORY_STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export const metricsRegister = new client.Registry();

client.collectDefaultMetrics({ register: metricsRegister });

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests handled by the equipment control API',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [metricsRegister],
});

export const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [metricsRegister],
});

export const equipmentDbUp = new client.Gauge({
  name: 'equipment_db_up',
  help: 'Database connectivity status for the equipment control API. 1 is up, 0 is down.',
  registers: [metricsRegister],
});

export const equipmentTotal = new client.Gauge({
  name: 'equipment_total',
  help: 'Total equipment assets registered in the system',
  registers: [metricsRegister],
});

export const equipmentByStatus = new client.Gauge({
  name: 'equipment_by_status',
  help: 'Equipment assets grouped by operational status',
  labelNames: ['status'] as const,
  registers: [metricsRegister],
});

export const employeesTotal = new client.Gauge({
  name: 'employees_total',
  help: 'Total employees available for equipment assignment',
  registers: [metricsRegister],
});

export const activeIssuancesTotal = new client.Gauge({
  name: 'active_issuances_total',
  help: 'Current active equipment issuances',
  registers: [metricsRegister],
});

export const overdueIssuancesTotal = new client.Gauge({
  name: 'overdue_issuances_total',
  help: 'Equipment issuances that are overdue',
  registers: [metricsRegister],
});

export const repairTicketsTotal = new client.Gauge({
  name: 'repair_tickets_total',
  help: 'Total repair tickets registered in the system',
  registers: [metricsRegister],
});

export const repairTicketsByStatus = new client.Gauge({
  name: 'repair_tickets_by_status',
  help: 'Repair tickets grouped by workflow status',
  labelNames: ['status'] as const,
  registers: [metricsRegister],
});

export const inventoryChecksTotal = new client.Gauge({
  name: 'inventory_checks_total',
  help: 'Total inventory checks registered in the system',
  registers: [metricsRegister],
});

export const inventoryChecksByStatus = new client.Gauge({
  name: 'inventory_checks_by_status',
  help: 'Inventory checks grouped by workflow status',
  labelNames: ['status'] as const,
  registers: [metricsRegister],
});

export const auditLogsTotal = new client.Gauge({
  name: 'audit_logs_total',
  help: 'Total audit log records stored by the system',
  registers: [metricsRegister],
});

function normalizeRoute(req: Request): string {
  const withoutQuery = req.originalUrl.split('?')[0] || req.path;
  return withoutQuery
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(/\/[0-9a-fA-F-]{24,}(?=\/|$)/g, '/:token');
}

export function httpMetricsMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/api/metrics') {
    next();
    return;
  }

  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
    const labels = {
      method: req.method,
      route: normalizeRoute(req),
      status_code: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationSeconds);
  });

  next();
}

export async function updateBusinessMetrics() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    equipmentDbUp.set(1);

    const [
      equipmentCount,
      equipmentStatusCounts,
      employeeCount,
      activeIssuanceCount,
      overdueIssuanceCount,
      repairCount,
      repairStatusCounts,
      inventoryCount,
      inventoryStatusCounts,
      auditCount,
    ] = await Promise.all([
      prisma.equipment.count(),
      prisma.equipment.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.employee.count(),
      prisma.issuance.count({ where: { status: 'ACTIVE' } }),
      prisma.issuance.count({
        where: {
          OR: [
            { status: 'OVERDUE' },
            {
              status: 'ACTIVE',
              expectedReturnAt: { lt: new Date() },
            },
          ],
        },
      }),
      prisma.repairTicket.count(),
      prisma.repairTicket.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.inventoryCheck.count(),
      prisma.inventoryCheck.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.auditLog.count(),
    ]);

    equipmentTotal.set(equipmentCount);
    employeesTotal.set(employeeCount);
    activeIssuancesTotal.set(activeIssuanceCount);
    overdueIssuancesTotal.set(overdueIssuanceCount);
    repairTicketsTotal.set(repairCount);
    inventoryChecksTotal.set(inventoryCount);
    auditLogsTotal.set(auditCount);

    for (const status of EQUIPMENT_STATUSES) {
      equipmentByStatus.set({ status }, 0);
    }
    for (const item of equipmentStatusCounts) {
      equipmentByStatus.set({ status: item.status }, item._count._all);
    }

    for (const status of REPAIR_STATUSES) {
      repairTicketsByStatus.set({ status }, 0);
    }
    for (const item of repairStatusCounts) {
      repairTicketsByStatus.set({ status: item.status }, item._count._all);
    }

    for (const status of INVENTORY_STATUSES) {
      inventoryChecksByStatus.set({ status }, 0);
    }
    for (const item of inventoryStatusCounts) {
      inventoryChecksByStatus.set({ status: item.status }, item._count._all);
    }
  } catch {
    equipmentDbUp.set(0);
  }
}
