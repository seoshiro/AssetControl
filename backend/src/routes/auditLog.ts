import { Router } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticate, canViewAudit } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', authenticate, canViewAudit, asyncHandler(async (req, res) => {
  const where: Prisma.AuditLogWhereInput = {
    ...(req.query.userId ? { userId: Number(req.query.userId) } : {}),
    ...(req.query.action ? { action: { contains: String(req.query.action), mode: 'insensitive' } } : {}),
    ...(req.query.entityType ? { entityType: String(req.query.entityType) } : {}),
    ...(req.query.dateFrom || req.query.dateTo
      ? {
          createdAt: {
            ...(req.query.dateFrom ? { gte: new Date(String(req.query.dateFrom)) } : {}),
            ...(req.query.dateTo ? { lte: new Date(String(req.query.dateTo)) } : {}),
          },
        }
      : {}),
  };

  const data = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { id: true, username: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ data });
}));

export default router;
