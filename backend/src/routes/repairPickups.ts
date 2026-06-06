import { Router } from 'express';
import { NotificationType, RepairPickupStatus, RepairStatus, Role } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest, authenticate, canManageRepairPickup, canViewRepairPickup } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';
import { auditLog } from '../utils/audit';

const router = Router();

const statusSchema = z.object({
  status: z.nativeEnum(RepairPickupStatus),
  comment: z.string().optional().nullable(),
});

router.get('/coordinators', authenticate, canManageRepairPickup, asyncHandler(async (_req, res) => {
  const data = await prisma.user.findMany({
    where: { role: Role.REPAIR_COORDINATOR, isActive: true },
    select: { id: true, username: true, role: true },
    orderBy: { username: 'asc' },
  });
  res.json({ data });
}));

const pickupInclude = {
  equipment: { include: { category: true } },
  pickupLocation: true,
  destinationLocation: true,
  assignedCoordinator: { select: { id: true, username: true, role: true } },
  createdBy: { select: { id: true, username: true, role: true } },
} as const;

const closedPickupStatuses: RepairPickupStatus[] = [RepairPickupStatus.DELIVERED, RepairPickupStatus.CANCELLED];

function isOverdue(item: { pickupDueDate?: Date | null; pickupStatus: RepairPickupStatus }) {
  return Boolean(item.pickupDueDate && item.pickupDueDate < new Date() && !closedPickupStatuses.includes(item.pickupStatus));
}

function canChangePickup(req: AuthRequest, item: { assignedCoordinatorId?: number | null }) {
  return req.user?.role === Role.ADMIN || req.user?.role === Role.MANAGER || (req.user?.role === Role.REPAIR_COORDINATOR && item.assignedCoordinatorId === req.user.id);
}

router.get('/', authenticate, canViewRepairPickup, asyncHandler(async (req: AuthRequest, res) => {
  const where =
    req.user?.role === Role.REPAIR_COORDINATOR
      ? { assignedCoordinatorId: req.user.id }
      : { assignedCoordinatorId: { not: null } };
  const data = await prisma.repairTicket.findMany({
    where,
    include: pickupInclude,
    orderBy: [{ pickupDueDate: 'asc' }, { createdAt: 'desc' }],
  });
  res.json({ data: data.map((item) => ({ ...item, overdue: isOverdue(item) })) });
}));

router.get('/mine', authenticate, canViewRepairPickup, asyncHandler(async (req: AuthRequest, res) => {
  if (req.user?.role !== Role.REPAIR_COORDINATOR) {
    throw new ApiError(403, 'Раздел доступен только координатору ремонта');
  }
  const data = await prisma.repairTicket.findMany({
    where: { assignedCoordinatorId: req.user.id },
    include: pickupInclude,
    orderBy: [{ pickupDueDate: 'asc' }, { createdAt: 'desc' }],
  });
  res.json({ data: data.map((item) => ({ ...item, overdue: isOverdue(item) })) });
}));

router.put('/:id/status', authenticate, canViewRepairPickup, asyncHandler(async (req: AuthRequest, res) => {
  const body = statusSchema.parse(req.body);
  const existing = await prisma.repairTicket.findUnique({ where: { id: Number(req.params.id) }, include: pickupInclude });
  if (!existing) throw new ApiError(404, 'Задача доставки не найдена');
  if (!canChangePickup(req, existing)) throw new ApiError(403, 'Доступ запрещён');

  const item = await prisma.$transaction(async (tx) => {
    const updated = await tx.repairTicket.update({
      where: { id: existing.id },
      data: {
        pickupStatus: body.status,
        pickupComment: body.comment ?? existing.pickupComment,
        deliveredAt: body.status === RepairPickupStatus.DELIVERED ? new Date() : existing.deliveredAt,
        status: body.status === RepairPickupStatus.DELIVERED ? RepairStatus.IN_PROGRESS : existing.status,
      },
      include: pickupInclude,
    });

    await auditLog(req, 'repair_pickup.status', 'RepairTicket', updated.id, { status: body.status, equipmentId: updated.equipmentId }, tx);

    const managers = await tx.user.findMany({ where: { role: { in: [Role.ADMIN, Role.MANAGER] }, isActive: true }, select: { id: true } });
    if (body.status === RepairPickupStatus.DELIVERED && managers.length > 0) {
      await tx.notification.createMany({
        data: managers.map((user) => ({
          userId: user.id,
          title: 'Оборудование доставлено в ремонт',
          message: `${updated.equipment.name} (${updated.equipment.inventoryNumber}) доставлено в ${updated.destinationLocation?.name || 'ремонтную зону'}.`,
          type: NotificationType.SUCCESS,
        })),
      });
    }

    return updated;
  });

  res.json({ ...item, overdue: isOverdue(item) });
}));

export default router;
