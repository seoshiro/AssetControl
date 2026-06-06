import type { NextFunction, Request, Response } from 'express';
import client from 'prom-client';
import prisma from './lib/prisma';

const EQUIPMENT_STATUSES = ['AVAILABLE', 'IN_USE', 'REPAIR', 'RESERVED', 'WRITTEN_OFF', 'LOST'];
const REPAIR_STATUSES = ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'];
const INVENTORY_STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const REPAIR_PICKUP_STATUSES = ['PENDING', 'NOTIFIED', 'IN_PROGRESS', 'PICKED_UP', 'DELIVERED', 'CANCELLED'];

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

export const repairPickupTotal = new client.Gauge({
  name: 'repair_pickup_total',
  help: 'Total repair pickup logistics tasks',
  registers: [metricsRegister],
});

export const repairPickupOverdueTotal = new client.Gauge({
  name: 'repair_pickup_overdue_total',
  help: 'Repair pickup tasks that are overdue',
  registers: [metricsRegister],
});

export const repairPickupByStatus = new client.Gauge({
  name: 'repair_pickup_by_status',
  help: 'Repair pickup tasks grouped by logistics status',
  labelNames: ['status'] as const,
  registers: [metricsRegister],
});

export const repairDeliveryCompletedTotal = new client.Gauge({
  name: 'repair_delivery_completed_total',
  help: 'Repair pickup tasks delivered to repair destination',
  registers: [metricsRegister],
});

export const equipmentPurchaseValueTotal = new client.Gauge({
  name: 'equipment_purchase_value_total',
  help: 'Total purchase value of registered equipment assets',
  registers: [metricsRegister],
});

export const equipmentResidualValueTotal = new client.Gauge({
  name: 'equipment_residual_value_total',
  help: 'Total residual value of registered equipment assets',
  registers: [metricsRegister],
});

export const equipmentServiceCostTotal = new client.Gauge({
  name: 'equipment_service_cost_total',
  help: 'Total repair and service cost recorded for equipment assets',
  registers: [metricsRegister],
});

export const highDepreciationEquipmentTotal = new client.Gauge({
  name: 'high_depreciation_equipment_total',
  help: 'Equipment assets with depreciation percent greater than or equal to 60',
  registers: [metricsRegister],
});

export const expensiveMaintenanceEquipmentTotal = new client.Gauge({
  name: 'expensive_maintenance_equipment_total',
  help: 'Equipment assets marked as expensive to maintain',
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
      pickupCount,
      pickupOverdueCount,
      pickupStatusCounts,
      pickupDeliveredCount,
      equipmentFinance,
      highDepreciationCount,
      expensiveMaintenanceCount,
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
      prisma.repairTicket.count({ where: { assignedCoordinatorId: { not: null } } }),
      prisma.repairTicket.count({
        where: {
          assignedCoordinatorId: { not: null },
          pickupDueDate: { lt: new Date() },
          pickupStatus: { notIn: ['DELIVERED', 'CANCELLED'] },
        },
      }),
      prisma.repairTicket.groupBy({ by: ['pickupStatus'], where: { assignedCoordinatorId: { not: null } }, _count: { _all: true } }),
      prisma.repairTicket.count({ where: { pickupStatus: 'DELIVERED' } }),
      prisma.equipment.aggregate({
        _sum: {
          purchasePrice: true,
          residualValue: true,
          serviceCostTotal: true,
        },
      }),
      prisma.equipment.count({ where: { depreciationPercent: { gte: 60 } } }),
      prisma.equipment.count({ where: { financialStatus: 'EXPENSIVE_MAINTENANCE' } }),
    ]);

    equipmentTotal.set(equipmentCount);
    employeesTotal.set(employeeCount);
    activeIssuancesTotal.set(activeIssuanceCount);
    overdueIssuancesTotal.set(overdueIssuanceCount);
    repairTicketsTotal.set(repairCount);
    inventoryChecksTotal.set(inventoryCount);
    auditLogsTotal.set(auditCount);
    repairPickupTotal.set(pickupCount);
    repairPickupOverdueTotal.set(pickupOverdueCount);
    repairDeliveryCompletedTotal.set(pickupDeliveredCount);
    equipmentPurchaseValueTotal.set(Number(equipmentFinance._sum.purchasePrice || 0));
    equipmentResidualValueTotal.set(Number(equipmentFinance._sum.residualValue || 0));
    equipmentServiceCostTotal.set(Number(equipmentFinance._sum.serviceCostTotal || 0));
    highDepreciationEquipmentTotal.set(highDepreciationCount);
    expensiveMaintenanceEquipmentTotal.set(expensiveMaintenanceCount);

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

    for (const status of REPAIR_PICKUP_STATUSES) {
      repairPickupByStatus.set({ status }, 0);
    }
    for (const item of pickupStatusCounts) {
      repairPickupByStatus.set({ status: item.pickupStatus }, item._count._all);
    }
  } catch {
    equipmentDbUp.set(0);
  }
}
