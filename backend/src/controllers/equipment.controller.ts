import { Response } from 'express';
import { EquipmentStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { ApiError } from '../utils/apiError';
import { auditLog } from '../utils/audit';

const listQuerySchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(EquipmentStatus).optional(),
  categoryId: z.coerce.number().int().optional(),
  departmentId: z.coerce.number().int().optional(),
  locationId: z.coerce.number().int().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.string().default('createdAt:desc'),
});

const equipmentSchema = z.object({
  name: z.string().min(2),
  inventoryNumber: z.string().min(2),
  serialNumber: z.string().optional().nullable(),
  categoryId: z.coerce.number().int().optional(),
  category: z.string().optional(),
  status: z.nativeEnum(EquipmentStatus).default(EquipmentStatus.AVAILABLE),
  purchaseDate: z.coerce.date(),
  purchasePrice: z.coerce.number().nonnegative().optional().nullable(),
  warrantyUntil: z.coerce.date().optional().nullable(),
  locationId: z.coerce.number().int().optional().nullable(),
  description: z.string().optional().nullable(),
});

function parseSort(sort: string): Prisma.EquipmentOrderByWithRelationInput {
  const [field, direction] = sort.split(':');
  const safeFields = ['createdAt', 'name', 'inventoryNumber', 'purchaseDate', 'status'];
  return { [safeFields.includes(field) ? field : 'createdAt']: direction === 'asc' ? 'asc' : 'desc' };
}

async function resolveCategoryId(categoryId?: number, category?: string) {
  if (categoryId) return categoryId;
  if (!category) throw new ApiError(400, 'Укажите категорию');

  const existing = await prisma.category.upsert({
    where: { name: category },
    update: {},
    create: { name: category },
  });
  return existing.id;
}

async function ensureNoActiveIssuance(equipmentId: number) {
  const activeIssuances = await prisma.issuance.count({ where: { equipmentId, returnedAt: null } });
  if (activeIssuances > 0) {
    throw new ApiError(400, 'Нельзя списать или отметить потерянным оборудование с активной выдачей');
  }
}

export async function getAllEquipment(req: AuthRequest, res: Response): Promise<void> {
  const query = listQuerySchema.parse(req.query);
  const where: Prisma.EquipmentWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.locationId ? { locationId: query.locationId } : {}),
    ...(query.departmentId ? { currentHolder: { departmentId: query.departmentId } } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { inventoryNumber: { contains: query.search, mode: 'insensitive' } },
            { serialNumber: { contains: query.search, mode: 'insensitive' } },
            { category: { name: { contains: query.search, mode: 'insensitive' } } },
            { currentHolder: { fullName: { contains: query.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [total, data] = await Promise.all([
    prisma.equipment.count({ where }),
    prisma.equipment.findMany({
      where,
      include: { category: true, location: true, currentHolder: { include: { department: true } } },
      orderBy: parseSort(query.sort),
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  res.json({ data, pagination: { total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) } });
}

export async function getEquipmentById(req: AuthRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const equipment = await prisma.equipment.findUnique({
    where: { id },
    include: {
      category: true,
      location: true,
      currentHolder: { include: { department: true } },
      issuances: {
        include: { employee: { include: { department: true } }, issuedBy: { select: { id: true, username: true } } },
        orderBy: { issuedAt: 'desc' },
      },
      repairs: {
        include: { createdBy: { select: { id: true, username: true } }, assignedTo: { select: { id: true, username: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!equipment) throw new ApiError(404, 'Оборудование не найдено');

  const auditLogs = await prisma.auditLog.findMany({
    where: { entityType: 'Equipment', entityId: String(id) },
    include: { user: { select: { id: true, username: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  res.json({ ...equipment, auditLogs });
}

export async function createEquipment(req: AuthRequest, res: Response): Promise<void> {
  const body = equipmentSchema.parse(req.body);
  const categoryId = await resolveCategoryId(body.categoryId, body.category);

  const equipment = await prisma.equipment.create({
    data: {
      name: body.name,
      inventoryNumber: body.inventoryNumber,
      serialNumber: body.serialNumber,
      categoryId,
      status: body.status,
      purchaseDate: body.purchaseDate,
      purchasePrice: body.purchasePrice,
      warrantyUntil: body.warrantyUntil,
      locationId: body.locationId,
      description: body.description,
    },
    include: { category: true, location: true },
  });

  await auditLog(req, 'equipment.create', 'Equipment', equipment.id, { inventoryNumber: equipment.inventoryNumber });
  res.status(201).json(equipment);
}

export async function updateEquipment(req: AuthRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const existing = await prisma.equipment.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Оборудование не найдено');

  const body = equipmentSchema.partial().parse(req.body);
  const categoryId =
    body.categoryId || body.category ? await resolveCategoryId(body.categoryId, body.category) : existing.categoryId;

  const equipment = await prisma.equipment.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      inventoryNumber: body.inventoryNumber ?? existing.inventoryNumber,
      serialNumber: body.serialNumber ?? existing.serialNumber,
      categoryId,
      status: body.status ?? existing.status,
      purchaseDate: body.purchaseDate ?? existing.purchaseDate,
      purchasePrice: body.purchasePrice ?? existing.purchasePrice,
      warrantyUntil: body.warrantyUntil ?? existing.warrantyUntil,
      locationId: body.locationId ?? existing.locationId,
      description: body.description ?? existing.description,
    },
    include: { category: true, location: true, currentHolder: true },
  });

  await auditLog(req, 'equipment.update', 'Equipment', equipment.id, { inventoryNumber: equipment.inventoryNumber });
  res.json(equipment);
}

export async function deleteEquipment(req: AuthRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const related = await prisma.issuance.count({ where: { equipmentId: id } });

  if (related > 0) {
    throw new ApiError(400, 'Нельзя удалить оборудование с историей. Используйте списание.');
  }

  await prisma.equipment.delete({ where: { id } });
  await auditLog(req, 'equipment.delete', 'Equipment', id);
  res.json({ message: 'Оборудование удалено' });
}

export async function writeOffEquipment(req: AuthRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  await ensureNoActiveIssuance(id);
  const equipment = await prisma.equipment.update({
    where: { id },
    data: { status: EquipmentStatus.WRITTEN_OFF, currentHolderId: null },
  });
  await auditLog(req, 'equipment.write_off', 'Equipment', id, { inventoryNumber: equipment.inventoryNumber });
  res.json(equipment);
}

export async function markLostEquipment(req: AuthRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  await ensureNoActiveIssuance(id);
  const equipment = await prisma.equipment.update({
    where: { id },
    data: { status: EquipmentStatus.LOST, currentHolderId: null },
  });
  await auditLog(req, 'equipment.mark_lost', 'Equipment', id, { inventoryNumber: equipment.inventoryNumber });
  res.json(equipment);
}

const statusMap: Record<string, string> = {
  AVAILABLE: 'Доступно',
  IN_USE: 'В использовании',
  REPAIR: 'На ремонте',
  RESERVED: 'Зарезервировано',
  WRITTEN_OFF: 'Списано',
  LOST: 'Потеряно',
};

export async function exportEquipmentToExcel(_req: AuthRequest, res: Response): Promise<void> {
  const equipment = await prisma.equipment.findMany({
    orderBy: { createdAt: 'desc' },
    include: { category: true, location: true, currentHolder: { include: { department: true } } },
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Оборудование');
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Название', key: 'name', width: 34 },
    { header: 'Инв. номер', key: 'inventoryNumber', width: 18 },
    { header: 'Серийный номер', key: 'serialNumber', width: 18 },
    { header: 'Категория', key: 'category', width: 20 },
    { header: 'Статус', key: 'status', width: 18 },
    { header: 'Локация', key: 'location', width: 20 },
    { header: 'Владелец', key: 'holder', width: 28 },
    { header: 'Стоимость', key: 'price', width: 14 },
  ];
  worksheet.getRow(1).font = { bold: true };

  equipment.forEach((item) =>
    worksheet.addRow({
      id: item.id,
      name: item.name,
      inventoryNumber: item.inventoryNumber,
      serialNumber: item.serialNumber || '',
      category: item.category.name,
      status: statusMap[item.status],
      location: item.location?.name || '',
      holder: item.currentHolder?.fullName || '',
      price: item.purchasePrice?.toString() || '',
    })
  );

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="equipment.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
}
