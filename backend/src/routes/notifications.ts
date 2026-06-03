import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const data = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ data, unread: data.filter((item) => !item.readAt).length });
}));

router.put('/:id/read', authenticate, asyncHandler(async (req, res) => {
  const notification = await prisma.notification.findUnique({ where: { id: Number(req.params.id) } });
  if (!notification || notification.userId !== req.user!.id) throw new ApiError(404, 'Уведомление не найдено');
  const item = await prisma.notification.update({ where: { id: notification.id }, data: { readAt: new Date() } });
  res.json(item);
}));

router.put('/read-all', authenticate, asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user!.id, readAt: null }, data: { readAt: new Date() } });
  res.json({ message: 'Все уведомления прочитаны' });
}));

export default router;
