import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, canManageAssets } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { auditLog } from '../utils/audit';

const router = Router();
const dictionarySchema = z.object({ name: z.string().min(2), description: z.string().optional().nullable() });
const locationSchema = dictionarySchema.extend({ room: z.string().optional().nullable(), floor: z.string().optional().nullable() });

router.get('/categories', authenticate, asyncHandler(async (_req, res) => {
  const data = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  res.json({ data });
}));

router.post('/categories', authenticate, canManageAssets, asyncHandler(async (req, res) => {
  const body = dictionarySchema.parse(req.body);
  const item = await prisma.category.create({ data: body });
  await auditLog(req, 'category.create', 'Category', item.id, { name: item.name });
  res.status(201).json(item);
}));

router.put('/categories/:id', authenticate, canManageAssets, asyncHandler(async (req, res) => {
  const item = await prisma.category.update({ where: { id: Number(req.params.id) }, data: dictionarySchema.partial().parse(req.body) });
  await auditLog(req, 'category.update', 'Category', item.id, { name: item.name });
  res.json(item);
}));

router.delete('/categories/:id', authenticate, canManageAssets, asyncHandler(async (req, res) => {
  await prisma.category.delete({ where: { id: Number(req.params.id) } });
  await auditLog(req, 'category.delete', 'Category', req.params.id);
  res.json({ message: 'Категория удалена' });
}));

router.get('/departments', authenticate, asyncHandler(async (_req, res) => {
  const data = await prisma.department.findMany({ orderBy: { name: 'asc' } });
  res.json({ data });
}));

router.post('/departments', authenticate, canManageAssets, asyncHandler(async (req, res) => {
  const body = dictionarySchema.parse(req.body);
  const item = await prisma.department.create({ data: body });
  await auditLog(req, 'department.create', 'Department', item.id, { name: item.name });
  res.status(201).json(item);
}));

router.put('/departments/:id', authenticate, canManageAssets, asyncHandler(async (req, res) => {
  const item = await prisma.department.update({ where: { id: Number(req.params.id) }, data: dictionarySchema.partial().parse(req.body) });
  await auditLog(req, 'department.update', 'Department', item.id, { name: item.name });
  res.json(item);
}));

router.delete('/departments/:id', authenticate, canManageAssets, asyncHandler(async (req, res) => {
  await prisma.department.delete({ where: { id: Number(req.params.id) } });
  await auditLog(req, 'department.delete', 'Department', req.params.id);
  res.json({ message: 'Отдел удалён' });
}));

router.get('/locations', authenticate, asyncHandler(async (_req, res) => {
  const data = await prisma.location.findMany({ orderBy: [{ floor: 'asc' }, { name: 'asc' }] });
  res.json({ data });
}));

router.post('/locations', authenticate, canManageAssets, asyncHandler(async (req, res) => {
  const body = locationSchema.parse(req.body);
  const item = await prisma.location.create({ data: body });
  await auditLog(req, 'location.create', 'Location', item.id, { name: item.name });
  res.status(201).json(item);
}));

router.put('/locations/:id', authenticate, canManageAssets, asyncHandler(async (req, res) => {
  const item = await prisma.location.update({ where: { id: Number(req.params.id) }, data: locationSchema.partial().parse(req.body) });
  await auditLog(req, 'location.update', 'Location', item.id, { name: item.name });
  res.json(item);
}));

router.delete('/locations/:id', authenticate, canManageAssets, asyncHandler(async (req, res) => {
  await prisma.location.delete({ where: { id: Number(req.params.id) } });
  await auditLog(req, 'location.delete', 'Location', req.params.id);
  res.json({ message: 'Локация удалена' });
}));

export default router;
