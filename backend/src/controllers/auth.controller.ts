import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { ApiError } from '../utils/apiError';
import { auditLog } from '../utils/audit';

const loginSchema = z.object({
  username: z.string().min(2),
  password: z.string().min(6),
});

export async function login(req: AuthRequest, res: Response): Promise<void> {
  const { username, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !user.isActive) {
    throw new ApiError(401, 'Неверный логин или пароль');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    throw new ApiError(401, 'Неверный логин или пароль');
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn: '24h' }
  );

  req.user = { id: user.id, username: user.username, role: user.role };
  await auditLog(req, 'auth.login', 'User', user.id, { role: user.role });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  });
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    throw new ApiError(401, 'Не авторизован');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, username: true, email: true, role: true, createdAt: true },
  });

  if (!user) {
    throw new ApiError(404, 'Пользователь не найден');
  }

  res.json(user);
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  await auditLog(req, 'auth.logout', 'User', req.user?.id);
  res.json({ message: 'Выход выполнен' });
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) throw new ApiError(401, 'Не авторизован');

  const body = z
    .object({
      currentPassword: z.string().min(6),
      newPassword: z.string().min(8),
    })
    .parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw new ApiError(404, 'Пользователь не найден');

  const ok = await bcrypt.compare(body.currentPassword, user.passwordHash);
  if (!ok) throw new ApiError(400, 'Текущий пароль указан неверно');

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(body.newPassword, 10) },
  });

  await auditLog(req, 'auth.password_change', 'User', user.id);
  res.json({ message: 'Пароль обновлён' });
}
