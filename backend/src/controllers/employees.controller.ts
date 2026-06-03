import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { ApiError } from '../utils/apiError';
import { auditLog } from '../utils/audit';

const employeeSchema = z.object({
  fullName: z.string().min(3),
  departmentId: z.coerce.number().int().optional(),
  department: z.string().optional(),
  position: z.string().min(2),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
});

async function resolveDepartmentId(departmentId?: number, department?: string) {
  if (departmentId) return departmentId;
  if (!department) throw new ApiError(400, 'Укажите отдел');
  const item = await prisma.department.upsert({ where: { name: department }, update: {}, create: { name: department } });
  return item.id;
}

export async function getAllEmployees(req: AuthRequest, res: Response): Promise<void> {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;
  const where: Prisma.EmployeeWhereInput = {
    ...(departmentId ? { departmentId } : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { position: { contains: search, mode: 'insensitive' } },
            { department: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const data = await prisma.employee.findMany({
    where,
    include: { department: true, equipment: true },
    orderBy: { fullName: 'asc' },
  });

  res.json({ data });
}

export async function getEmployeeById(req: AuthRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: true,
      equipment: { include: { category: true, location: true } },
      issuances: {
        include: { equipment: { include: { category: true } } },
        orderBy: { issuedAt: 'desc' },
      },
    },
  });

  if (!employee) throw new ApiError(404, 'Сотрудник не найден');
  res.json(employee);
}

export async function createEmployee(req: AuthRequest, res: Response): Promise<void> {
  const body = employeeSchema.parse(req.body);
  const departmentId = await resolveDepartmentId(body.departmentId, body.department);
  const employee = await prisma.employee.create({
    data: { fullName: body.fullName, departmentId, position: body.position, email: body.email, phone: body.phone },
    include: { department: true },
  });
  await auditLog(req, 'employee.create', 'Employee', employee.id, { fullName: employee.fullName });
  res.status(201).json(employee);
}

export async function updateEmployee(req: AuthRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Сотрудник не найден');

  const body = employeeSchema.partial().parse(req.body);
  const departmentId =
    body.departmentId || body.department ? await resolveDepartmentId(body.departmentId, body.department) : existing.departmentId;

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      fullName: body.fullName ?? existing.fullName,
      departmentId,
      position: body.position ?? existing.position,
      email: body.email ?? existing.email,
      phone: body.phone ?? existing.phone,
    },
    include: { department: true },
  });
  await auditLog(req, 'employee.update', 'Employee', employee.id, { fullName: employee.fullName });
  res.json(employee);
}

export async function deleteEmployee(req: AuthRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const active = await prisma.issuance.count({ where: { employeeId: id, returnedAt: null } });
  if (active) throw new ApiError(400, 'Нельзя удалить сотрудника с активной выдачей');
  await prisma.employee.delete({ where: { id } });
  await auditLog(req, 'employee.delete', 'Employee', id);
  res.json({ message: 'Сотрудник удалён' });
}

export async function getEmployeeEquipment(req: AuthRequest, res: Response): Promise<void> {
  const data = await prisma.equipment.findMany({
    where: { currentHolderId: Number(req.params.id) },
    include: { category: true, location: true },
    orderBy: { name: 'asc' },
  });
  res.json({ data });
}

export async function getEmployeeHistory(req: AuthRequest, res: Response): Promise<void> {
  const data = await prisma.issuance.findMany({
    where: { employeeId: Number(req.params.id) },
    include: { equipment: { include: { category: true } }, issuedBy: { select: { username: true } } },
    orderBy: { issuedAt: 'desc' },
  });
  res.json({ data });
}
