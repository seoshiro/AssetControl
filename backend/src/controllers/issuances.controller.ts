import { Response } from 'express';
import { EquipmentStatus, IssuanceStatus, NotificationType, Role } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { ApiError } from '../utils/apiError';
import { auditLog, notifyUsers } from '../utils/audit';

const createSchema = z.object({
  equipmentId: z.coerce.number().int(),
  employeeId: z.coerce.number().int(),
  expectedReturnAt: z.coerce.date().optional().nullable(),
});

export async function getAllIssuances(req: AuthRequest, res: Response): Promise<void> {
  const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
  const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
  const equipmentId = req.query.equipmentId ? Number(req.query.equipmentId) : undefined;
  const active = req.query.active === 'true';
  const returned = req.query.returned === 'true';
  const overdue = req.query.overdue === 'true';

  const data = await prisma.issuance.findMany({
    where: {
      ...(employeeId ? { employeeId } : {}),
      ...(equipmentId ? { equipmentId } : {}),
      ...(status ? { status: status as IssuanceStatus } : {}),
      ...(active ? { returnedAt: null } : {}),
      ...(returned ? { returnedAt: { not: null } } : {}),
      ...(overdue ? { OR: [{ status: IssuanceStatus.OVERDUE }, { expectedReturnAt: { lt: new Date() }, returnedAt: null }] } : {}),
    },
    include: {
      equipment: { include: { category: true } },
      employee: { include: { department: true } },
      issuedBy: { select: { id: true, username: true } },
    },
    orderBy: { issuedAt: 'desc' },
  });
  res.json({ data });
}

export async function createIssuance(req: AuthRequest, res: Response): Promise<void> {
  const body = createSchema.parse(req.body);

  const result = await prisma.$transaction(async (tx) => {
    const equipment = await tx.equipment.findUnique({ where: { id: body.equipmentId } });
    if (!equipment) throw new ApiError(404, 'Оборудование не найдено');
    if (equipment.status !== EquipmentStatus.AVAILABLE && equipment.status !== EquipmentStatus.RESERVED) {
      throw new ApiError(400, 'Оборудование недоступно для выдачи');
    }

    const employee = await tx.employee.findUnique({ where: { id: body.employeeId } });
    if (!employee) throw new ApiError(404, 'Сотрудник не найден');

    const issuance = await tx.issuance.create({
      data: {
        equipmentId: body.equipmentId,
        employeeId: body.employeeId,
        issuedById: req.user?.id,
        expectedReturnAt: body.expectedReturnAt,
        status: body.expectedReturnAt && body.expectedReturnAt < new Date() ? IssuanceStatus.OVERDUE : IssuanceStatus.ACTIVE,
      },
      include: { equipment: true, employee: true },
    });

    await tx.equipment.update({
      where: { id: body.equipmentId },
      data: { status: EquipmentStatus.IN_USE, currentHolderId: body.employeeId },
    });

    await auditLog(req, 'issuance.create', 'Issuance', issuance.id, {
      equipmentId: body.equipmentId,
      employeeId: body.employeeId,
    }, tx);

    const managers = await tx.user.findMany({
      where: { role: { in: [Role.ADMIN, Role.MANAGER, Role.INVENTORY_MANAGER] } },
      select: { id: true },
    });
    await notifyUsers(
      managers.map((user) => user.id),
      'Оборудование выдано',
      `${issuance.equipment.name} закреплено за ${issuance.employee.fullName}`,
      NotificationType.SUCCESS,
      tx
    );

    return issuance;
  });

  res.status(201).json(result);
}

export async function returnIssuance(req: AuthRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const body = z.object({ returnComment: z.string().optional().nullable() }).parse(req.body ?? {});

  const updated = await prisma.$transaction(async (tx) => {
    const issuance = await tx.issuance.findUnique({ where: { id }, include: { equipment: true, employee: true } });
    if (!issuance) throw new ApiError(404, 'Запись о выдаче не найдена');
    if (issuance.returnedAt) throw new ApiError(400, 'Оборудование уже возвращено');

    const returnedIssuance = await tx.issuance.update({
      where: { id },
      data: { returnedAt: new Date(), returnComment: body.returnComment, status: IssuanceStatus.RETURNED },
      include: { equipment: true, employee: true },
    });

    const activeRepair = await tx.repairTicket.findFirst({
      where: { equipmentId: issuance.equipmentId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    });

    await tx.equipment.update({
      where: { id: issuance.equipmentId },
      data: { status: activeRepair ? EquipmentStatus.REPAIR : EquipmentStatus.AVAILABLE, currentHolderId: null },
    });

    await auditLog(req, 'issuance.return', 'Issuance', id, { returnComment: body.returnComment }, tx);
    return returnedIssuance;
  });

  res.json(updated);
}

export async function getOverdueIssuances(req: AuthRequest, res: Response): Promise<void> {
  const data = await prisma.issuance.findMany({
    where: { OR: [{ status: IssuanceStatus.OVERDUE }, { expectedReturnAt: { lt: new Date() }, returnedAt: null }] },
    include: { equipment: true, employee: { include: { department: true } } },
    orderBy: { expectedReturnAt: 'asc' },
  });
  res.json({ data });
}
