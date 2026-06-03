import { Router } from 'express';
import { InventoryCheckStatus, InventoryItemStatus } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, canManageInventory } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';
import { auditLog } from '../utils/audit';

const router = Router();

router.get('/', authenticate, asyncHandler(async (_req, res) => {
  const data = await prisma.inventoryCheck.findMany({
    include: { createdBy: { select: { username: true } }, _count: { select: { items: true } } },
    orderBy: { startedAt: 'desc' },
  });
  res.json({ data });
}));

router.post('/', authenticate, canManageInventory, asyncHandler(async (req, res) => {
  const body = z.object({ title: z.string().min(3), status: z.nativeEnum(InventoryCheckStatus).default(InventoryCheckStatus.PLANNED) }).parse(req.body);
  const item = await prisma.inventoryCheck.create({ data: { ...body, createdById: req.user?.id } });
  await auditLog(req, 'inventory.create', 'InventoryCheck', item.id, { title: item.title });
  res.status(201).json(item);
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const item = await prisma.inventoryCheck.findUnique({
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
  if (!item) throw new ApiError(404, 'Инвентаризация не найдена');
  res.json(item);
}));

router.post('/:id/items', authenticate, canManageInventory, asyncHandler(async (req, res) => {
  const body = z.object({
    equipmentId: z.coerce.number().int(),
    expectedLocationId: z.coerce.number().int().optional().nullable(),
    actualLocationId: z.coerce.number().int().optional().nullable(),
    status: z.nativeEnum(InventoryItemStatus).default(InventoryItemStatus.FOUND),
    comment: z.string().optional().nullable(),
  }).parse(req.body);

  const item = await prisma.inventoryCheckItem.create({
    data: { inventoryCheckId: Number(req.params.id), ...body },
    include: { equipment: true, expectedLocation: true, actualLocation: true },
  });
  await auditLog(req, 'inventory.item_add', 'InventoryCheck', req.params.id, { equipmentId: body.equipmentId });
  res.status(201).json(item);
}));

router.put('/:id/items/:itemId', authenticate, canManageInventory, asyncHandler(async (req, res) => {
  const body = z.object({
    actualLocationId: z.coerce.number().int().optional().nullable(),
    status: z.nativeEnum(InventoryItemStatus).optional(),
    comment: z.string().optional().nullable(),
  }).parse(req.body);
  const item = await prisma.inventoryCheckItem.update({
    where: { id: Number(req.params.itemId) },
    data: body,
    include: { equipment: true, expectedLocation: true, actualLocation: true },
  });
  await auditLog(req, 'inventory.item_update', 'InventoryCheckItem', item.id, { status: item.status });
  res.json(item);
}));

router.post('/:id/complete', authenticate, canManageInventory, asyncHandler(async (req, res) => {
  const item = await prisma.inventoryCheck.update({
    where: { id: Number(req.params.id) },
    data: { status: InventoryCheckStatus.COMPLETED, completedAt: new Date() },
    include: { items: true },
  });
  await auditLog(req, 'inventory.complete', 'InventoryCheck', item.id, { items: item.items.length });
  res.json(item);
}));

export default router;
