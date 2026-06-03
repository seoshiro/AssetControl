import { Router } from 'express';
import { EquipmentStatus, RepairPriority, RepairStatus } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, canManageAssets } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';
import { auditLog } from '../utils/audit';

const router = Router();

const createSchema = z.object({
  equipmentId: z.coerce.number().int(),
  assignedToId: z.coerce.number().int().optional().nullable(),
  priority: z.nativeEnum(RepairPriority).default(RepairPriority.MEDIUM),
  reason: z.string().min(3),
});

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const priority = typeof req.query.priority === 'string' ? req.query.priority : undefined;
  const data = await prisma.repairTicket.findMany({
    where: {
      ...(status ? { status: status as RepairStatus } : {}),
      ...(priority ? { priority: priority as RepairPriority } : {}),
    },
    include: {
      equipment: { include: { category: true, currentHolder: true } },
      createdBy: { select: { id: true, username: true } },
      assignedTo: { select: { id: true, username: true } },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });
  res.json({ data });
}));

router.get('/dashboard', authenticate, asyncHandler(async (_req, res) => {
  const [active, critical, completed, cost] = await Promise.all([
    prisma.repairTicket.count({ where: { status: { in: [RepairStatus.OPEN, RepairStatus.IN_PROGRESS] } } }),
    prisma.repairTicket.count({ where: { priority: RepairPriority.CRITICAL, status: { not: RepairStatus.DONE } } }),
    prisma.repairTicket.count({ where: { status: RepairStatus.DONE } }),
    prisma.repairTicket.aggregate({ _avg: { cost: true }, _sum: { cost: true } }),
  ]);
  res.json({ active, critical, completed, averageCost: Number(cost._avg.cost || 0), totalCost: Number(cost._sum.cost || 0) });
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const ticket = await prisma.repairTicket.findUnique({
    where: { id: Number(req.params.id) },
    include: { equipment: true, createdBy: true, assignedTo: true },
  });
  if (!ticket) throw new ApiError(404, 'Ремонтная заявка не найдена');
  res.json(ticket);
}));

router.post('/', authenticate, canManageAssets, asyncHandler(async (req, res) => {
  const body = createSchema.parse(req.body);
  const result = await prisma.$transaction(async (tx) => {
    const equipment = await tx.equipment.findUnique({ where: { id: body.equipmentId } });
    if (!equipment) throw new ApiError(404, 'Оборудование не найдено');
    if (equipment.status === EquipmentStatus.WRITTEN_OFF || equipment.status === EquipmentStatus.LOST) {
      throw new ApiError(400, 'Нельзя отправить в ремонт списанное или потерянное оборудование');
    }
    const ticket = await tx.repairTicket.create({
      data: { ...body, createdById: req.user?.id, status: RepairStatus.OPEN },
      include: { equipment: true },
    });
    await tx.equipment.update({ where: { id: body.equipmentId }, data: { status: EquipmentStatus.REPAIR } });
    await auditLog(req, 'repair.create', 'RepairTicket', ticket.id, { equipmentId: body.equipmentId, priority: body.priority }, tx);
    return ticket;
  });
  res.status(201).json(result);
}));

router.put('/:id/status', authenticate, canManageAssets, asyncHandler(async (req, res) => {
  const body = z.object({ status: z.nativeEnum(RepairStatus), diagnosis: z.string().optional().nullable() }).parse(req.body);
  if (body.status === RepairStatus.DONE) {
    throw new ApiError(400, 'Для завершения ремонта используйте действие "Завершить ремонт"');
  }

  const ticket = await prisma.repairTicket.update({
    where: { id: Number(req.params.id) },
    data: { status: body.status, diagnosis: body.diagnosis },
  });

  if (body.status === RepairStatus.CANCELLED) {
    const activeIssuance = await prisma.issuance.findFirst({ where: { equipmentId: ticket.equipmentId, returnedAt: null } });
    await prisma.equipment.update({
      where: { id: ticket.equipmentId },
      data: { status: activeIssuance ? EquipmentStatus.IN_USE : EquipmentStatus.AVAILABLE },
    });
  } else {
    await prisma.equipment.update({ where: { id: ticket.equipmentId }, data: { status: EquipmentStatus.REPAIR } });
  }

  await auditLog(req, 'repair.status', 'RepairTicket', ticket.id, { status: ticket.status });
  res.json(ticket);
}));

router.put('/:id/complete', authenticate, canManageAssets, asyncHandler(async (req, res) => {
  const body = z.object({
    diagnosis: z.string().optional().nullable(),
    result: z.string().min(2),
    cost: z.coerce.number().nonnegative().optional().nullable(),
  }).parse(req.body);

  const ticket = await prisma.$transaction(async (tx) => {
    const existing = await tx.repairTicket.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) throw new ApiError(404, 'Ремонтная заявка не найдена');
    const activeIssuance = await tx.issuance.findFirst({ where: { equipmentId: existing.equipmentId, returnedAt: null } });
    const completed = await tx.repairTicket.update({
      where: { id: existing.id },
      data: { ...body, status: RepairStatus.DONE, completedAt: new Date() },
      include: { equipment: true },
    });
    await tx.equipment.update({
      where: { id: existing.equipmentId },
      data: { status: activeIssuance ? EquipmentStatus.IN_USE : EquipmentStatus.AVAILABLE },
    });
    await auditLog(req, 'repair.complete', 'RepairTicket', completed.id, { result: body.result, cost: body.cost }, tx);
    return completed;
  });
  res.json(ticket);
}));

export default router;
