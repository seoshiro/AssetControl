import { Router } from 'express';
import {
  EquipmentStatus,
  InventoryItemStatus,
  IssuanceStatus,
  Prisma,
  RepairPriority,
  RepairStatus,
  Role,
} from '@prisma/client';
import prisma from '../lib/prisma';
import { AuthRequest, authenticate, requireRoles } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { toCsv } from '../utils/csv';
import { auditLog } from '../utils/audit';
import {
  SummaryCard,
  formatCompactDate,
  formatCompactDateTime,
  formatDate,
  formatDateTime,
  formatMoney,
  generatePdfReport,
  truncateText,
} from '../services/pdfReport.service';
import { ApiError } from '../utils/apiError';

const router = Router();

const canViewReports = requireRoles(Role.ADMIN, Role.MANAGER, Role.INVENTORY_MANAGER, Role.AUDITOR, Role.VIEWER);
const canViewAuditReport = requireRoles(Role.ADMIN, Role.AUDITOR);

function sendCsv(res: import('express').Response, filename: string, rows: Record<string, unknown>[]) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(`\uFEFF${toCsv(rows)}`);
}

async function sendPdf<T extends Record<string, unknown>>(
  req: AuthRequest,
  res: import('express').Response,
  filename: string,
  report: Parameters<typeof generatePdfReport<T>>[0]
) {
  const buffer = await generatePdfReport({
    ...report,
    user: {
      username: req.user?.username,
      role: req.user?.role,
    },
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function dateRangeFilter(dateFrom?: unknown, dateTo?: unknown): Prisma.DateTimeFilter | undefined {
  if (!dateFrom && !dateTo) return undefined;
  return {
    ...(dateFrom ? { gte: new Date(String(dateFrom)) } : {}),
    ...(dateTo ? { lte: new Date(String(dateTo)) } : {}),
  };
}

function equipmentWhere(query: Record<string, unknown>): Prisma.EquipmentWhereInput {
  const search = typeof query.search === 'string' ? query.search : undefined;
  return {
    ...(query.status ? { status: String(query.status) as EquipmentStatus } : {}),
    ...(query.categoryId ? { categoryId: Number(query.categoryId) } : {}),
    ...(query.locationId ? { locationId: Number(query.locationId) } : {}),
    ...(query.departmentId ? { currentHolder: { departmentId: Number(query.departmentId) } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { inventoryNumber: { contains: search, mode: 'insensitive' } },
            { serialNumber: { contains: search, mode: 'insensitive' } },
            { category: { name: { contains: search, mode: 'insensitive' } } },
            { currentHolder: { fullName: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };
}

function issuanceWhere(query: Record<string, unknown>): Prisma.IssuanceWhereInput {
  return {
    ...(query.status ? { status: String(query.status).toUpperCase() as IssuanceStatus } : {}),
    ...(query.employeeId ? { employeeId: Number(query.employeeId) } : {}),
    ...(query.equipmentId ? { equipmentId: Number(query.equipmentId) } : {}),
    ...(query.overdue === 'true'
      ? { OR: [{ status: IssuanceStatus.OVERDUE }, { expectedReturnAt: { lt: new Date() }, returnedAt: null }] }
      : {}),
    ...(query.dateFrom || query.dateTo ? { issuedAt: dateRangeFilter(query.dateFrom, query.dateTo) } : {}),
  };
}

function repairWhere(query: Record<string, unknown>): Prisma.RepairTicketWhereInput {
  return {
    ...(query.status ? { status: String(query.status) as RepairStatus } : {}),
    ...(query.priority ? { priority: String(query.priority) as RepairPriority } : {}),
    ...(query.dateFrom || query.dateTo ? { createdAt: dateRangeFilter(query.dateFrom, query.dateTo) } : {}),
  };
}

function auditWhere(query: Record<string, unknown>): Prisma.AuditLogWhereInput {
  return {
    ...(query.userId ? { userId: Number(query.userId) } : {}),
    ...(query.action ? { action: { contains: String(query.action), mode: 'insensitive' } } : {}),
    ...(query.entityType ? { entityType: String(query.entityType) } : {}),
    ...(query.dateFrom || query.dateTo ? { createdAt: dateRangeFilter(query.dateFrom, query.dateTo) } : {}),
  };
}

function filtersFromQuery(query: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, query[key]]).filter(([, value]) => value !== undefined && value !== ''));
}

function statusCards(counts: Record<string, number>, labels: Record<string, string>): SummaryCard[] {
  return Object.entries(labels).map(([status, label]) => ({
    label,
    value: counts[status] || 0,
    tone:
      status.includes('LOST') || status.includes('OVERDUE') || status.includes('DAMAGED') || status.includes('CRITICAL')
        ? 'red'
        : status.includes('REPAIR') || status.includes('MOVED') || status.includes('OPEN')
          ? 'amber'
          : status.includes('IN_USE') || status.includes('ACTIVE') || status.includes('IN_PROGRESS')
            ? 'blue'
            : status.includes('WRITTEN_OFF') || status.includes('CANCELLED')
              ? 'gray'
              : 'green',
  }));
}

router.get('/equipment.csv', authenticate, canViewReports, asyncHandler(async (req, res) => {
  const items = await prisma.equipment.findMany({
    where: equipmentWhere(req.query),
    include: { category: true, location: true, currentHolder: { include: { department: true } } },
    orderBy: { inventoryNumber: 'asc' },
  });
  await auditLog(req, 'report.export', 'Report', 'equipment.csv');
  sendCsv(res, 'equipment.csv', items.map((item) => ({
    inventoryNumber: item.inventoryNumber,
    name: item.name,
    serialNumber: item.serialNumber,
    category: item.category.name,
    status: item.status,
    location: item.location?.name,
    holder: item.currentHolder?.fullName,
    department: item.currentHolder?.department.name,
    purchasePrice: item.purchasePrice?.toString(),
    warrantyUntil: item.warrantyUntil?.toISOString().slice(0, 10),
  })));
}));

router.get('/issuances.csv', authenticate, canViewReports, asyncHandler(async (req, res) => {
  const items = await prisma.issuance.findMany({
    where: issuanceWhere(req.query),
    include: { equipment: true, employee: { include: { department: true } }, issuedBy: true },
    orderBy: { issuedAt: 'desc' },
  });
  await auditLog(req, 'report.export', 'Report', 'issuances.csv');
  sendCsv(res, 'issuances.csv', items.map((item) => ({
    id: item.id,
    equipment: item.equipment.inventoryNumber,
    equipmentName: item.equipment.name,
    employee: item.employee.fullName,
    department: item.employee.department.name,
    status: item.status,
    issuedAt: item.issuedAt.toISOString().slice(0, 10),
    expectedReturnAt: item.expectedReturnAt?.toISOString().slice(0, 10),
    returnedAt: item.returnedAt?.toISOString().slice(0, 10),
    issuedBy: item.issuedBy?.username,
  })));
}));

router.get('/repairs.csv', authenticate, canViewReports, asyncHandler(async (req, res) => {
  const items = await prisma.repairTicket.findMany({
    where: repairWhere(req.query),
    include: {
      equipment: { include: { category: true } },
      createdBy: { select: { username: true } },
      assignedTo: { select: { username: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  await auditLog(req, 'report.export', 'Report', 'repairs.csv');
  sendCsv(res, 'repairs.csv', items.map((item) => ({
    id: item.id,
    equipment: item.equipment.inventoryNumber,
    equipmentName: item.equipment.name,
    category: item.equipment.category.name,
    status: item.status,
    priority: item.priority,
    reason: item.reason,
    diagnosis: item.diagnosis,
    result: item.result,
    cost: item.cost?.toString(),
    createdBy: item.createdBy?.username,
    assignedTo: item.assignedTo?.username,
    createdAt: item.createdAt.toISOString().slice(0, 10),
    completedAt: item.completedAt?.toISOString().slice(0, 10),
  })));
}));

router.get('/inventory/:id.csv', authenticate, canViewReports, asyncHandler(async (req, res) => {
  const check = await prisma.inventoryCheck.findUnique({
    where: { id: Number(req.params.id) },
    include: { items: { include: { equipment: true, expectedLocation: true, actualLocation: true } } },
  });
  const rows = check?.items.map((item) => ({
    inventoryCheck: check.title,
    equipment: item.equipment.inventoryNumber,
    name: item.equipment.name,
    expectedLocation: item.expectedLocation?.name,
    actualLocation: item.actualLocation?.name,
    status: item.status,
    comment: item.comment,
  })) ?? [];
  await auditLog(req, 'report.export', 'Report', `inventory-${req.params.id}.csv`);
  sendCsv(res, `inventory-${req.params.id}.csv`, rows);
}));

router.get('/equipment.pdf', authenticate, canViewReports, asyncHandler(async (req, res) => {
  const filters = filtersFromQuery(req.query, ['status', 'categoryId', 'locationId', 'departmentId', 'search']);
  const items = await prisma.equipment.findMany({
    where: equipmentWhere(req.query),
    include: { category: true, location: true, currentHolder: { include: { department: true } } },
    orderBy: { inventoryNumber: 'asc' },
  });
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  const totalValue = items.reduce((sum, item) => sum + Number(item.purchasePrice || 0), 0);

  await auditLog(req, 'report.export', 'Report', 'equipment.pdf', { filters });
  await sendPdf(req, res, `equipment-report-${dateStamp()}.pdf`, {
    title: 'Equipment Registry Report',
    description: 'Инвентаризационная ведомость активов предприятия: статусы, владельцы, локации, гарантия и балансовая стоимость.',
    filters,
    summary: [
      { label: 'Всего записей', value: items.length, tone: 'blue' },
      { label: 'Доступно', value: counts.AVAILABLE || 0, tone: 'green' },
      { label: 'Используется', value: counts.IN_USE || 0, tone: 'blue' },
      { label: 'В ремонте', value: counts.REPAIR || 0, tone: 'amber' },
      { label: 'Списано / потеряно', value: (counts.WRITTEN_OFF || 0) + (counts.LOST || 0), tone: 'red' },
      { label: 'Стоимость активов', value: formatMoney(totalValue), tone: 'neutral' },
    ],
    breakdown: statusCards(counts, {
      AVAILABLE: 'Available',
      IN_USE: 'In use',
      REPAIR: 'Repair',
      RESERVED: 'Reserved',
      WRITTEN_OFF: 'Written off',
      LOST: 'Lost',
    }),
    columns: [
      { header: 'Инв. номер', key: 'inventoryNumber', width: 76 },
      { header: 'Оборудование', key: 'name', width: 116 },
      { header: 'Категория', key: 'category', width: 72 },
      { header: 'Статус', key: 'status', width: 72, status: true },
      { header: 'Владелец', key: 'holder', width: 96 },
      { header: 'Локация', key: 'location', width: 76 },
      { header: 'Покупка', key: 'purchaseDate', width: 58 },
      { header: 'Гарантия', key: 'warrantyUntil', width: 58 },
    ],
    rows: items.map((item) => ({
      inventoryNumber: item.inventoryNumber,
      name: item.name,
      category: item.category.name,
      status: item.status,
      holder: item.currentHolder?.fullName || '—',
      location: item.location?.name || '—',
      purchaseDate: formatCompactDate(item.purchaseDate),
      warrantyUntil: formatCompactDate(item.warrantyUntil),
    })),
    notes: ['CSV используется для обработки данных в Excel, PDF — для официального представления и печати отчётов.'],
  });
}));

router.get('/issuances.pdf', authenticate, canViewReports, asyncHandler(async (req, res) => {
  const filters = filtersFromQuery(req.query, ['status', 'employeeId', 'equipmentId', 'dateFrom', 'dateTo', 'overdue']);
  const items = await prisma.issuance.findMany({
    where: issuanceWhere(req.query),
    include: { equipment: true, employee: { include: { department: true } }, issuedBy: { select: { username: true } } },
    orderBy: { issuedAt: 'desc' },
  });
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    const effectiveStatus = item.status === IssuanceStatus.ACTIVE && item.expectedReturnAt && item.expectedReturnAt < new Date() ? IssuanceStatus.OVERDUE : item.status;
    acc[effectiveStatus] = (acc[effectiveStatus] || 0) + 1;
    return acc;
  }, {});

  await auditLog(req, 'report.export', 'Report', 'issuances.pdf', { filters });
  await sendPdf(req, res, `issuances-report-${dateStamp()}.pdf`, {
    title: 'Equipment Movement Report',
    description: 'Отчёт о движении оборудования: выдачи сотрудникам, ожидаемые возвраты, фактические возвраты и просрочки.',
    filters,
    summary: [
      { label: 'Всего выдач', value: items.length, tone: 'blue' },
      { label: 'Активные', value: counts.ACTIVE || 0, tone: 'blue' },
      { label: 'Возвращённые', value: counts.RETURNED || 0, tone: 'green' },
      { label: 'Просроченные', value: counts.OVERDUE || 0, tone: 'red' },
    ],
    breakdown: statusCards(counts, { ACTIVE: 'Active', RETURNED: 'Returned', OVERDUE: 'Overdue' }),
    columns: [
      { header: 'Оборудование', key: 'equipment', width: 130 },
      { header: 'Инв. номер', key: 'inventoryNumber', width: 78 },
      { header: 'Сотрудник', key: 'employee', width: 120 },
      { header: 'Выдано', key: 'issuedAt', width: 68 },
      { header: 'План возврата', key: 'expectedReturnAt', width: 76 },
      { header: 'Возврат', key: 'returnedAt', width: 68 },
      { header: 'Статус', key: 'status', width: 78, status: true },
    ],
    rows: items.map((item) => ({
      equipment: item.equipment.name,
      inventoryNumber: item.equipment.inventoryNumber,
      employee: item.employee.fullName,
      issuedAt: formatCompactDate(item.issuedAt),
      expectedReturnAt: formatCompactDate(item.expectedReturnAt),
      returnedAt: formatCompactDate(item.returnedAt),
      status: item.status === IssuanceStatus.ACTIVE && item.expectedReturnAt && item.expectedReturnAt < new Date() ? IssuanceStatus.OVERDUE : item.status,
    })),
  });
}));

router.get('/repairs.pdf', authenticate, canViewReports, asyncHandler(async (req, res) => {
  const filters = filtersFromQuery(req.query, ['status', 'priority', 'dateFrom', 'dateTo']);
  const items = await prisma.repairTicket.findMany({
    where: repairWhere(req.query),
    include: {
      equipment: { include: { category: true } },
      createdBy: { select: { username: true } },
      assignedTo: { select: { username: true } },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    acc[item.priority] = (acc[item.priority] || 0) + 1;
    return acc;
  }, {});
  const totalCost = items.reduce((sum, item) => sum + Number(item.cost || 0), 0);

  await auditLog(req, 'report.export', 'Report', 'repairs.pdf', { filters });
  await sendPdf(req, res, `repairs-report-${dateStamp()}.pdf`, {
    title: 'Maintenance & Repair Report',
    description: 'Отчёт по техническому обслуживанию: статусы заявок, приоритеты, причины, стоимость и результаты ремонтов.',
    filters,
    summary: [
      { label: 'Всего заявок', value: items.length, tone: 'blue' },
      { label: 'Open', value: counts.OPEN || 0, tone: 'amber' },
      { label: 'In progress', value: counts.IN_PROGRESS || 0, tone: 'blue' },
      { label: 'Done', value: counts.DONE || 0, tone: 'green' },
      { label: 'Cancelled', value: counts.CANCELLED || 0, tone: 'gray' },
      { label: 'Total cost', value: formatMoney(totalCost), tone: 'neutral' },
      { label: 'Critical / high', value: (counts.CRITICAL || 0) + (counts.HIGH || 0), tone: 'red' },
    ],
    breakdown: statusCards(counts, { OPEN: 'Open', IN_PROGRESS: 'In progress', DONE: 'Done', CANCELLED: 'Cancelled', CRITICAL: 'Critical', HIGH: 'High' }),
    columns: [
      { header: 'Оборудование', key: 'equipment', width: 120 },
      { header: 'Инв. номер', key: 'inventoryNumber', width: 76 },
      { header: 'Приоритет', key: 'priority', width: 74, status: true },
      { header: 'Статус', key: 'status', width: 72, status: true },
      { header: 'Причина', key: 'reason', width: 150 },
      { header: 'Создано', key: 'createdAt', width: 64 },
      { header: 'Закрыто', key: 'completedAt', width: 64 },
      { header: 'Стоимость', key: 'cost', width: 70, align: 'right' },
    ],
    rows: items.map((item) => ({
      equipment: item.equipment.name,
      inventoryNumber: item.equipment.inventoryNumber,
      priority: item.priority,
      status: item.status,
      reason: item.reason,
      createdAt: formatCompactDate(item.createdAt),
      completedAt: formatCompactDate(item.completedAt),
      cost: formatMoney(item.cost),
    })),
  });
}));

router.get('/inventory/:id.pdf', authenticate, canViewReports, asyncHandler(async (req, res) => {
  const check = await prisma.inventoryCheck.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      createdBy: { select: { username: true } },
      items: {
        include: {
          equipment: { include: { category: true } },
          expectedLocation: true,
          actualLocation: true,
        },
        orderBy: { id: 'asc' },
      },
    },
  });
  if (!check) throw new ApiError(404, 'Инвентаризация не найдена');

  const counts = check.items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  const inventoryStatusLabel: Record<string, string> = {
    PLANNED: 'План',
    IN_PROGRESS: 'В работе',
    COMPLETED: 'Завершено',
    CANCELLED: 'Отменено',
  };

  await auditLog(req, 'report.export', 'Report', `inventory-${req.params.id}.pdf`);
  await sendPdf(req, res, `inventory-check-${req.params.id}-${dateStamp()}.pdf`, {
    title: 'Inventory Check Act',
    description: `Официальный акт инвентаризации: ${check.title}. Фиксация найденных, отсутствующих, перемещённых и повреждённых активов.`,
    filters: { inventoryCheckId: req.params.id, title: check.title, status: check.status },
    summary: [
      { label: 'Статус проверки', value: inventoryStatusLabel[check.status] || check.status, tone: check.status === 'COMPLETED' ? 'green' : 'blue' },
      { label: 'Дата начала', value: formatDate(check.startedAt), tone: 'neutral' },
      { label: 'Дата завершения', value: formatDate(check.completedAt), tone: 'neutral' },
      { label: 'Всего позиций', value: check.items.length, tone: 'blue' },
      { label: 'Found', value: counts.FOUND || 0, tone: 'green' },
      { label: 'Missing', value: counts.MISSING || 0, tone: 'red' },
      { label: 'Moved', value: counts.MOVED || 0, tone: 'amber' },
      { label: 'Damaged', value: counts.DAMAGED || 0, tone: 'red' },
    ],
    breakdown: statusCards(counts, { FOUND: 'Found', MISSING: 'Missing', MOVED: 'Moved', DAMAGED: 'Damaged' }),
    columns: [
      { header: 'Оборудование', key: 'equipment', width: 130 },
      { header: 'Инв. номер', key: 'inventoryNumber', width: 78 },
      { header: 'Ожид. локация', key: 'expectedLocation', width: 94 },
      { header: 'Факт. локация', key: 'actualLocation', width: 94 },
      { header: 'Статус', key: 'status', width: 78, status: true },
      { header: 'Комментарий', key: 'comment', width: 145 },
    ],
    rows: check.items.map((item) => ({
      equipment: item.equipment.name,
      inventoryNumber: item.equipment.inventoryNumber,
      expectedLocation: item.expectedLocation?.name || '—',
      actualLocation: item.actualLocation?.name || '—',
      status: item.status,
      comment: item.comment || '—',
    })),
    notes: ['Документ может использоваться как приложение к внутренней инвентаризационной ведомости предприятия.'],
    signature: true,
  });
}));

router.get('/audit-log.pdf', authenticate, canViewAuditReport, asyncHandler(async (req, res) => {
  const filters = filtersFromQuery(req.query, ['action', 'entityType', 'userId', 'dateFrom', 'dateTo', 'limit']);
  const limit = Math.min(Math.max(Number(req.query.limit || 200), 1), 500);
  const items = await prisma.auditLog.findMany({
    where: auditWhere(req.query),
    include: { user: { select: { id: true, username: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  await auditLog(req, 'report.export', 'Report', 'audit-log.pdf', { filters, limit });
  await sendPdf(req, res, `audit-log-report-${dateStamp()}.pdf`, {
    title: 'System Audit Log Report',
    description: 'Журнал действий системы: пользователи, операции, сущности, идентификаторы и краткие metadata для аудита.',
    filters: { ...filters, limit },
    summary: [
      { label: 'Записей в выборке', value: items.length, tone: 'blue' },
      { label: 'Период с', value: formatDate(req.query.dateFrom as string | undefined), tone: 'neutral' },
      { label: 'Период по', value: formatDate(req.query.dateTo as string | undefined), tone: 'neutral' },
      { label: 'Лимит', value: limit, tone: 'gray' },
    ],
    columns: [
      { header: 'Дата', key: 'createdAt', width: 86 },
      { header: 'Пользователь', key: 'user', width: 92 },
      { header: 'Действие', key: 'action', width: 112 },
      { header: 'Сущность', key: 'entityType', width: 78 },
      { header: 'ID', key: 'entityId', width: 48 },
      { header: 'Metadata', key: 'metadata', width: 210 },
    ],
    rows: items.map((item) => ({
      createdAt: formatCompactDateTime(item.createdAt),
      user: item.user?.username || 'system',
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId || '—',
      metadata: item.metadata ? truncateText(JSON.stringify(item.metadata), 140) : '—',
    })),
    notes: ['Audit log фиксирует доказательную историю действий пользователей и системных событий.'],
  });
}));

export default router;
