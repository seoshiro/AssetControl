import { Router } from 'express';
import { PaymentMethod, PaymentType, Role } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest, authenticate, canManageFinance, canViewFinance } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';
import { auditLog } from '../utils/audit';
import { financialSnapshot, refreshEquipmentFinancials } from '../services/finance.service';

const router = Router();

const operationSchema = z.object({
  type: z.nativeEnum(PaymentType),
  method: z.nativeEnum(PaymentMethod),
  amount: z.coerce.number().positive(),
  operationDate: z.coerce.date().optional(),
  comment: z.string().optional().nullable(),
});

function typeFilter(value: unknown) {
  return typeof value === 'string' && value in PaymentType ? (value as PaymentType) : undefined;
}

function methodFilter(value: unknown) {
  return typeof value === 'string' && value in PaymentMethod ? (value as PaymentMethod) : undefined;
}

async function financeSummary() {
  const [equipment, repairOps] = await Promise.all([
    prisma.equipment.findMany({
      select: {
        id: true,
        name: true,
        inventoryNumber: true,
        purchasePrice: true,
        currentValue: true,
        residualValue: true,
        depreciationPercent: true,
        serviceCostTotal: true,
        financialStatus: true,
      },
      orderBy: { purchasePrice: 'desc' },
    }),
    prisma.equipmentFinancialOperation.aggregate({
      _sum: { amount: true },
      where: { type: { in: [PaymentType.REPAIR, PaymentType.SERVICE] } },
    }),
  ]);

  const totalPurchaseValue = equipment.reduce((sum, item) => sum + Number(item.purchasePrice || 0), 0);
  const totalResidualValue = equipment.reduce((sum, item) => sum + Number(item.residualValue ?? item.currentValue ?? item.purchasePrice ?? 0), 0);
  const highDepreciation = equipment.filter((item) => Number(item.depreciationPercent || 0) >= 60);

  return {
    totalPurchaseValue,
    totalResidualValue,
    repairAndServiceCost: Number(repairOps._sum.amount || 0),
    highDepreciationCount: highDepreciation.length,
    expensiveMaintenanceCount: equipment.filter((item) => item.financialStatus === 'EXPENSIVE_MAINTENANCE').length,
    topExpensiveAssets: equipment.slice(0, 5),
    highDepreciationAssets: highDepreciation.slice(0, 5),
  };
}

router.get('/summary', authenticate, canViewFinance, asyncHandler(async (_req, res) => {
  res.json(await financeSummary());
}));

router.get('/equipment/:id', authenticate, canViewFinance, asyncHandler(async (req: AuthRequest, res) => {
  const equipmentId = Number(req.params.id);
  const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId }, include: { category: true } });
  if (!equipment) throw new ApiError(404, 'Оборудование не найдено');

  const snapshot = financialSnapshot({
    purchasePrice: equipment.purchasePrice,
    currentValue: equipment.currentValue ?? equipment.purchasePrice,
    serviceCostTotal: equipment.serviceCostTotal,
    equipmentStatus: equipment.status,
  });
  const isViewer = req.user?.role === Role.VIEWER;
  const operations = isViewer
    ? []
    : await prisma.equipmentFinancialOperation.findMany({
        where: {
          equipmentId,
          ...(typeFilter(req.query.type) ? { type: typeFilter(req.query.type) } : {}),
          ...(methodFilter(req.query.method) ? { method: methodFilter(req.query.method) } : {}),
        },
        include: { createdBy: { select: { id: true, username: true, role: true } } },
        orderBy: { operationDate: 'desc' },
      });

  res.json({ equipment, summary: snapshot, operations, detailsHidden: isViewer });
}));

router.post('/equipment/:id/operations', authenticate, canManageFinance, asyncHandler(async (req: AuthRequest, res) => {
  const equipmentId = Number(req.params.id);
  const body = operationSchema.parse(req.body);

  const operation = await prisma.$transaction(async (tx) => {
    const equipment = await tx.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) throw new ApiError(404, 'Оборудование не найдено');

    const created = await tx.equipmentFinancialOperation.create({
      data: {
        equipmentId,
        type: body.type,
        method: body.method,
        amount: body.amount,
        operationDate: body.operationDate,
        comment: body.comment,
        createdById: req.user?.id,
      },
      include: { createdBy: { select: { id: true, username: true, role: true } } },
    });

    await refreshEquipmentFinancials(tx, equipmentId);
    await auditLog(req, 'finance.operation_create', 'EquipmentFinancialOperation', created.id, { equipmentId, type: body.type, amount: body.amount }, tx);
    return created;
  });

  res.status(201).json(operation);
}));

router.put('/operations/:id', authenticate, canManageFinance, asyncHandler(async (req: AuthRequest, res) => {
  const body = operationSchema.partial().parse(req.body);
  const existing = await prisma.equipmentFinancialOperation.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) throw new ApiError(404, 'Финансовая операция не найдена');

  const operation = await prisma.$transaction(async (tx) => {
    const updated = await tx.equipmentFinancialOperation.update({
      where: { id: existing.id },
      data: body,
      include: { createdBy: { select: { id: true, username: true, role: true } } },
    });
    await refreshEquipmentFinancials(tx, updated.equipmentId);
    await auditLog(req, 'finance.operation_update', 'EquipmentFinancialOperation', updated.id, { equipmentId: updated.equipmentId }, tx);
    return updated;
  });

  res.json(operation);
}));

router.delete('/operations/:id', authenticate, canManageFinance, asyncHandler(async (req: AuthRequest, res) => {
  const existing = await prisma.equipmentFinancialOperation.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) throw new ApiError(404, 'Финансовая операция не найдена');

  await prisma.$transaction(async (tx) => {
    await tx.equipmentFinancialOperation.delete({ where: { id: existing.id } });
    await refreshEquipmentFinancials(tx, existing.equipmentId);
    await auditLog(req, 'finance.operation_delete', 'EquipmentFinancialOperation', existing.id, { equipmentId: existing.equipmentId }, tx);
  });

  res.json({ message: 'Финансовая операция удалена' });
}));

export default router;
