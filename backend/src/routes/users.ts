import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authenticate, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { auditLog } from '../utils/audit';

const router = Router();
const userSchema = z.object({
  username: z.string().min(2),
  email: z.string().email().optional().nullable(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(Role),
  isActive: z.boolean().default(true),
});

router.get('/', authenticate, requireAdmin, asyncHandler(async (_req, res) => {
  const data = await prisma.user.findMany({
    select: { id: true, username: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    orderBy: { id: 'asc' },
  });
  res.json({ data });
}));

router.post('/', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const body = userSchema.extend({ password: z.string().min(6) }).parse(req.body);
  const user = await prisma.user.create({
    data: {
      username: body.username,
      email: body.email,
      role: body.role,
      isActive: body.isActive,
      passwordHash: await bcrypt.hash(body.password, 10),
    },
    select: { id: true, username: true, email: true, role: true, isActive: true },
  });
  await auditLog(req, 'user.create', 'User', user.id, { role: user.role });
  res.status(201).json(user);
}));

router.put('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const body = userSchema.partial().parse(req.body);
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: {
      username: body.username,
      email: body.email,
      role: body.role,
      isActive: body.isActive,
      ...(body.password ? { passwordHash: await bcrypt.hash(body.password, 10) } : {}),
    },
    select: { id: true, username: true, email: true, role: true, isActive: true },
  });
  await auditLog(req, 'user.update', 'User', user.id, { role: user.role, isActive: user.isActive });
  res.json(user);
}));

router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  await prisma.user.update({ where: { id: Number(req.params.id) }, data: { isActive: false } });
  await auditLog(req, 'user.block', 'User', req.params.id);
  res.json({ message: 'Пользователь заблокирован' });
}));

export default router;
