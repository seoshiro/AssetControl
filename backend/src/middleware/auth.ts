import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config';
import prisma from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: Role;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Токен не предоставлен' });
    return;
  }

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], config.jwtSecret) as {
      id: number;
      username: string;
      role: Role;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Пользователь не найден или заблокирован' });
      return;
    }

    req.user = { id: user.id, username: user.username, role: user.role };
    next();
  } catch {
    res.status(401).json({ error: 'Невалидный токен' });
  }
}

export function requireRoles(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Доступ запрещён' });
      return;
    }
    next();
  };
}

export const requireAdmin = requireRoles(Role.ADMIN);
export const canManageAssets = requireRoles(Role.ADMIN, Role.MANAGER);
export const canManageInventory = requireRoles(Role.ADMIN, Role.MANAGER, Role.INVENTORY_MANAGER);
export const canViewAudit = requireRoles(Role.ADMIN, Role.AUDITOR);
export const canViewFinance = requireRoles(Role.ADMIN, Role.MANAGER, Role.INVENTORY_MANAGER, Role.AUDITOR, Role.VIEWER);
export const canManageFinance = requireRoles(Role.ADMIN, Role.MANAGER);
export const canManageRepairPickup = requireRoles(Role.ADMIN, Role.MANAGER);
export const canViewRepairPickup = requireRoles(Role.ADMIN, Role.MANAGER, Role.INVENTORY_MANAGER, Role.REPAIR_COORDINATOR, Role.AUDITOR);
