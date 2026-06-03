import { NotificationType, Prisma } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

type Db = Prisma.TransactionClient | typeof prisma;

export async function auditLog(
  req: AuthRequest,
  action: string,
  entityType: string,
  entityId?: string | number | null,
  metadata?: Record<string, unknown>,
  db: Db = prisma
) {
  await db.auditLog.create({
    data: {
      userId: req.user?.id,
      action,
      entityType,
      entityId: entityId == null ? null : String(entityId),
      metadata: metadata as Prisma.InputJsonObject | undefined,
      ip: req.ip,
    },
  });
}

export async function notifyUsers(
  userIds: number[],
  title: string,
  message: string,
  type: NotificationType = NotificationType.INFO,
  db: Db = prisma
) {
  if (!userIds.length) return;

  await db.notification.createMany({
    data: [...new Set(userIds)].map((userId) => ({
      userId,
      title,
      message,
      type,
    })),
  });
}
