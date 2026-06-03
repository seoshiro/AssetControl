import { Response } from 'express';
import { EquipmentStatus, IssuanceStatus, RepairPriority, RepairStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export async function getDashboardStats(_req: AuthRequest, res: Response): Promise<void> {
  const now = new Date();
  const since = new Date();
  since.setDate(now.getDate() - 29);

  const [
    total,
    byStatus,
    byCategory,
    byDepartment,
    aggregate,
    recentIssuances,
    recentAudit,
    overdueIssuances,
    activeRepairs,
    criticalRepairs,
    notifications,
    issuances30,
  ] = await Promise.all([
    prisma.equipment.count(),
    prisma.equipment.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.equipment.groupBy({ by: ['categoryId'], _count: { id: true } }),
    prisma.issuance.groupBy({ by: ['employeeId'], where: { returnedAt: null }, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 6 }),
    prisma.equipment.aggregate({ _sum: { purchasePrice: true } }),
    prisma.issuance.findMany({
      take: 6,
      orderBy: { issuedAt: 'desc' },
      include: { equipment: true, employee: { include: { department: true } } },
    }),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { username: true, role: true } } },
    }),
    prisma.issuance.count({
      where: { OR: [{ status: IssuanceStatus.OVERDUE }, { expectedReturnAt: { lt: now }, returnedAt: null }] },
    }),
    prisma.repairTicket.count({ where: { status: { in: [RepairStatus.OPEN, RepairStatus.IN_PROGRESS] } } }),
    prisma.repairTicket.count({ where: { priority: RepairPriority.CRITICAL, status: { notIn: [RepairStatus.DONE, RepairStatus.CANCELLED] } } }),
    prisma.notification.findMany({ take: 6, orderBy: { createdAt: 'desc' }, where: { readAt: null } }),
    prisma.issuance.findMany({ where: { issuedAt: { gte: since } }, select: { issuedAt: true, returnedAt: true } }),
  ]);

  const categories = await prisma.category.findMany({ where: { id: { in: byCategory.map((item) => item.categoryId) } } });
  const categoryById = Object.fromEntries(categories.map((category) => [category.id, category.name]));

  const employeeDepartments = await prisma.employee.findMany({
    where: { id: { in: byDepartment.map((item) => item.employeeId) } },
    include: { department: true },
  });
  const departmentCounts = new Map<string, number>();
  byDepartment.forEach((item) => {
    const employee = employeeDepartments.find((entry) => entry.id === item.employeeId);
    if (employee) departmentCounts.set(employee.department.name, (departmentCounts.get(employee.department.name) || 0) + item._count.id);
  });

  const timeline = Array.from({ length: 30 }).map((_, index) => {
    const day = new Date(since);
    day.setDate(since.getDate() + index);
    const key = day.toISOString().slice(0, 10);
    return {
      date: key,
      issued: issuances30.filter((item) => item.issuedAt.toISOString().slice(0, 10) === key).length,
      returned: issuances30.filter((item) => item.returnedAt?.toISOString().slice(0, 10) === key).length,
    };
  });

  const statusStats = Object.fromEntries(Object.values(EquipmentStatus).map((status) => [status, 0]));
  byStatus.forEach((item) => {
    statusStats[item.status] = item._count.id;
  });

  res.json({
    total,
    available: statusStats.AVAILABLE,
    inUse: statusStats.IN_USE,
    repair: statusStats.REPAIR,
    reserved: statusStats.RESERVED,
    writtenOff: statusStats.WRITTEN_OFF,
    lost: statusStats.LOST,
    totalValue: Number(aggregate._sum.purchasePrice || 0),
    overdueIssuances,
    activeRepairs,
    criticalRepairs,
    statusStats: Object.entries(statusStats).map(([status, count]) => ({ status, count })),
    categoryStats: byCategory.map((item) => ({ category: categoryById[item.categoryId] || 'Без категории', count: item._count.id })),
    departmentStats: [...departmentCounts.entries()].map(([department, count]) => ({ department, count })),
    recentIssuances,
    recentAudit,
    timeline,
    criticalNotifications: notifications,
  });
}
