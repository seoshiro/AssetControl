import request from 'supertest';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import {
  EquipmentStatus,
  FinancialStatus,
  InventoryCheckStatus,
  InventoryItemStatus,
  IssuanceStatus,
  PaymentMethod,
  PaymentType,
  RepairPickupStatus,
  RepairPriority,
  RepairStatus,
  Role,
} from '@prisma/client';
import { config } from '../config';
import { createApp } from '../app';
import {
  buildAuditLog,
  buildEmployee,
  buildEquipment,
  buildInventoryCheck,
  buildInventoryItem,
  buildIssuance,
  buildRepairTicket,
  buildUser,
} from '../tests/factories';

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  auditLog: { create: vi.fn(), findMany: vi.fn() },
  notification: { createMany: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  equipment: { count: vi.fn(), groupBy: vi.fn(), aggregate: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  equipmentFinancialOperation: { aggregate: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  category: { findMany: vi.fn(), upsert: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  department: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  location: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  issuance: { count: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), groupBy: vi.fn() },
  repairTicket: { count: vi.fn(), aggregate: vi.fn(), findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  inventoryCheck: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  inventoryCheckItem: { create: vi.fn(), update: vi.fn() },
  employee: { findUnique: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(async (fn) => fn(prismaMock)),
}));

vi.mock('../lib/prisma', () => ({ default: prismaMock }));
vi.mock('bcryptjs', () => ({ default: { compare: vi.fn(async () => true), hash: vi.fn(async () => 'hash') }, compare: vi.fn(async () => true), hash: vi.fn(async () => 'hash') }));

const app = createApp();
const token = (role: Role = Role.ADMIN) => jwt.sign({ id: 1, username: 'admin', role }, config.jwtSecret);
const pdfParser = (res: NodeJS.ReadableStream, callback: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
};

const sampleEquipment = {
  id: 1,
  name: 'Ноутбук Dell Latitude',
  inventoryNumber: 'EQ-001',
  serialNumber: 'SN-001',
  status: EquipmentStatus.AVAILABLE,
  purchaseDate: new Date('2026-01-10'),
  purchasePrice: 420000,
  currentValue: 300000,
  depreciationPercent: 29,
  residualValue: 300000,
  serviceCostTotal: 15000,
  financialStatus: FinancialStatus.NORMAL,
  warrantyUntil: new Date('2027-01-10'),
  category: { name: 'Ноутбуки' },
  location: { name: 'Склад' },
  currentHolder: null,
};

const sampleEmployee = { id: 1, fullName: 'Иванов Иван', department: { name: 'IT отдел' } };

function expectPdf(res: request.Response, filenamePart: string) {
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toContain('application/pdf');
  expect(res.headers['content-disposition']).toContain(filenamePart);
  expect(Buffer.isBuffer(res.body)).toBe(true);
  expect(res.body.slice(0, 4).toString()).toBe('%PDF');
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
  prismaMock.user.findUnique.mockResolvedValue(buildUser({ email: null }));
  prismaMock.auditLog.create.mockResolvedValue({});
  prismaMock.notification.createMany.mockResolvedValue({ count: 0 });
});

describe('equipment control API', () => {
  it('logs in and returns JWT token', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('ADMIN');
  });

  it('returns current user via /me', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('admin');
  });

  it('blocks employee from creating equipment', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 2, username: 'employee', role: Role.EMPLOYEE, isActive: true });
    const res = await request(app).post('/api/equipment').set('Authorization', `Bearer ${token(Role.EMPLOYEE)}`).send({});
    expect(res.status).toBe(403);
  });

  it('creates equipment and audit log for manager role', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 1, username: 'manager', role: Role.MANAGER, isActive: true });
    prismaMock.equipment.create.mockResolvedValue({ id: 10, name: 'Test laptop', inventoryNumber: 'T-1', category: { name: 'Ноутбуки' } });
    const res = await request(app).post('/api/equipment').set('Authorization', `Bearer ${token(Role.MANAGER)}`).send({
      name: 'Test laptop',
      inventoryNumber: 'T-1',
      categoryId: 1,
      purchaseDate: '2026-05-01',
    });
    expect(res.status).toBe(201);
    expect(prismaMock.auditLog.create).toHaveBeenCalled();
  });

  it('does not issue equipment that is under repair', async () => {
    prismaMock.equipment.findUnique.mockResolvedValue({ id: 3, status: 'REPAIR' });
    const res = await request(app).post('/api/issuances').set('Authorization', `Bearer ${token()}`).send({ equipmentId: 3, employeeId: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('недоступно');
  });

  it('returns dashboard stats structure', async () => {
    prismaMock.equipment.count.mockResolvedValue(10);
    prismaMock.equipment.groupBy.mockResolvedValueOnce([{ status: 'AVAILABLE', _count: { id: 4 } }]).mockResolvedValueOnce([{ categoryId: 1, _count: { id: 10 } }]);
    prismaMock.equipment.aggregate.mockResolvedValue({ _sum: { purchasePrice: 1000, residualValue: 700, serviceCostTotal: 120 } });
    prismaMock.category.findMany.mockResolvedValue([{ id: 1, name: 'Ноутбуки' }]);
    prismaMock.issuance.findMany.mockResolvedValue([]);
    prismaMock.issuance.count.mockResolvedValue(0);
    prismaMock.issuance.groupBy.mockResolvedValue([]);
    prismaMock.employee.findMany.mockResolvedValue([]);
    prismaMock.auditLog.findMany.mockResolvedValue([]);
    prismaMock.repairTicket.count.mockResolvedValue(0);
    prismaMock.notification.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/dashboard/stats').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('statusStats');
    expect(res.body).toHaveProperty('timeline');
    expect(res.body.residualValue).toBe(700);
    expect(res.body.repairServiceCost).toBe(120);
  });

  it('returns equipment PDF for admin', async () => {
    prismaMock.equipment.findMany.mockResolvedValue([sampleEquipment]);

    const res = await request(app)
      .get('/api/reports/equipment.pdf')
      .set('Authorization', `Bearer ${token(Role.ADMIN)}`)
      .buffer()
      .parse(pdfParser);

    expectPdf(res, 'equipment-report-');
  });

  it('blocks employee from global equipment PDF', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 2, username: 'employee', role: Role.EMPLOYEE, isActive: true });

    const res = await request(app)
      .get('/api/reports/equipment.pdf')
      .set('Authorization', `Bearer ${token(Role.EMPLOYEE)}`);

    expect(res.status).toBe(403);
  });

  it('returns filtered equipment PDF for manager', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 3, username: 'manager', role: Role.MANAGER, isActive: true });
    prismaMock.equipment.findMany.mockResolvedValue([{ ...sampleEquipment, status: EquipmentStatus.REPAIR }]);

    const res = await request(app)
      .get('/api/reports/equipment.pdf?status=REPAIR&search=Dell')
      .set('Authorization', `Bearer ${token(Role.MANAGER)}`)
      .buffer()
      .parse(pdfParser);

    expectPdf(res, 'equipment-report-');
    expect(prismaMock.equipment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: EquipmentStatus.REPAIR }),
    }));
  });

  it('returns issuances PDF as application/pdf', async () => {
    prismaMock.issuance.findMany.mockResolvedValue([{
      id: 1,
      equipment: sampleEquipment,
      employee: sampleEmployee,
      issuedBy: { username: 'manager' },
      issuedAt: new Date('2026-02-01'),
      expectedReturnAt: new Date('2026-03-01'),
      returnedAt: null,
      status: IssuanceStatus.ACTIVE,
    }]);

    const res = await request(app)
      .get('/api/reports/issuances.pdf?overdue=false')
      .set('Authorization', `Bearer ${token(Role.ADMIN)}`)
      .buffer()
      .parse(pdfParser);

    expectPdf(res, 'issuances-report-');
  });

  it('returns repairs PDF as application/pdf', async () => {
    prismaMock.repairTicket.findMany.mockResolvedValue([{
      id: 1,
      equipment: sampleEquipment,
      createdBy: { username: 'admin' },
      assignedTo: null,
      status: RepairStatus.OPEN,
      priority: RepairPriority.HIGH,
      reason: 'Не включается',
      diagnosis: null,
      result: null,
      cost: 15000,
      createdAt: new Date('2026-04-01'),
      completedAt: null,
    }]);

    const res = await request(app)
      .get('/api/reports/repairs.pdf?priority=HIGH')
      .set('Authorization', `Bearer ${token(Role.ADMIN)}`)
      .buffer()
      .parse(pdfParser);

    expectPdf(res, 'repairs-report-');
  });

  it('returns inventory check PDF as application/pdf', async () => {
    prismaMock.inventoryCheck.findUnique.mockResolvedValue({
      id: 1,
      title: 'Плановая инвентаризация',
      status: InventoryCheckStatus.IN_PROGRESS,
      startedAt: new Date('2026-05-01'),
      completedAt: null,
      createdBy: { username: 'manager' },
      items: [{
        id: 1,
        equipment: sampleEquipment,
        expectedLocation: { name: 'Склад' },
        actualLocation: { name: 'Склад' },
        status: InventoryItemStatus.FOUND,
        comment: 'На месте',
      }],
    });

    const res = await request(app)
      .get('/api/reports/inventory/1.pdf')
      .set('Authorization', `Bearer ${token(Role.ADMIN)}`)
      .buffer()
      .parse(pdfParser);

    expectPdf(res, 'inventory-check-1-');
  });

  it('returns 404 for missing inventory PDF', async () => {
    prismaMock.inventoryCheck.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/reports/inventory/99.pdf')
      .set('Authorization', `Bearer ${token(Role.ADMIN)}`);

    expect(res.status).toBe(404);
  });

  it('returns audit log PDF for auditor', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 4, username: 'auditor', role: Role.AUDITOR, isActive: true });
    prismaMock.auditLog.findMany.mockResolvedValue([{
      id: 1,
      user: { id: 1, username: 'admin', role: Role.ADMIN },
      action: 'equipment.create',
      entityType: 'Equipment',
      entityId: '1',
      metadata: { inventoryNumber: 'EQ-001' },
      createdAt: new Date('2026-05-01'),
    }]);

    const res = await request(app)
      .get('/api/reports/audit-log.pdf?limit=50&action=equipment')
      .set('Authorization', `Bearer ${token(Role.AUDITOR)}`)
      .buffer()
      .parse(pdfParser);

    expectPdf(res, 'audit-log-report-');
  });

  it('blocks employee from audit log PDF', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 5, username: 'employee', role: Role.EMPLOYEE, isActive: true });

    const res = await request(app)
      .get('/api/reports/audit-log.pdf')
      .set('Authorization', `Bearer ${token(Role.EMPLOYEE)}`);

    expect(res.status).toBe(403);
  });

  it('blocks viewer from audit log PDF', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 6, username: 'viewer', role: Role.VIEWER, isActive: true });

    const res = await request(app)
      .get('/api/reports/audit-log.pdf')
      .set('Authorization', `Bearer ${token(Role.VIEWER)}`);

    expect(res.status).toBe(403);
  });

  it('keeps existing CSV exports working', async () => {
    prismaMock.equipment.findMany.mockResolvedValue([sampleEquipment]);

    const res = await request(app)
      .get('/api/reports/equipment.csv')
      .set('Authorization', `Bearer ${token(Role.ADMIN)}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('EQ-001');
  });

  it('does not expose passwordHash on successful login', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects login for unknown user', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const res = await request(app).post('/api/auth/login').send({ username: 'missing', password: 'password123' });

    expect(res.status).toBe(401);
  });

  it('rejects login for invalid password', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);

    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'badpass123' });

    expect(res.status).toBe(401);
  });

  it('puts id username and role into JWT payload', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'password123' });
    const decoded = jwt.verify(res.body.token, config.jwtSecret) as { id: number; username: string; role: Role };

    expect(decoded.id).toBe(1);
    expect(decoded.username).toBe('admin');
    expect(decoded.role).toBe(Role.ADMIN);
  });

  it('blocks requests without token', async () => {
    const res = await request(app).get('/api/equipment');

    expect(res.status).toBe(401);
  });

  it('blocks requests with invalid token', async () => {
    const res = await request(app).get('/api/equipment').set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
  });

  it('blocks inactive users even with valid token', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(buildUser({ isActive: false }));

    const res = await request(app).get('/api/equipment').set('Authorization', `Bearer ${token(Role.ADMIN)}`);

    expect(res.status).toBe(401);
  });

  it('allows admin to list users without password hashes', async () => {
    prismaMock.user.findMany.mockResolvedValue([buildUser({ passwordHash: undefined })]);

    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${token(Role.ADMIN)}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].passwordHash).toBeUndefined();
  });

  it('blocks manager from admin-only users endpoint', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(buildUser({ role: Role.MANAGER }));

    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${token(Role.MANAGER)}`);

    expect(res.status).toBe(403);
  });

  it('allows admin to create users and hashes password', async () => {
    prismaMock.user.create.mockResolvedValue(buildUser({ id: 5, username: 'new-user', passwordHash: undefined }));

    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token(Role.ADMIN)}`)
      .send({ username: 'new-user', password: 'password123', role: Role.VIEWER, isActive: true });

    expect(res.status).toBe(201);
    expect(prismaMock.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ passwordHash: 'hash' }),
    }));
  });

  it('allows manager to create equipment', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(buildUser({ role: Role.MANAGER }));
    prismaMock.equipment.create.mockResolvedValue(buildEquipment());

    const res = await request(app)
      .post('/api/equipment')
      .set('Authorization', `Bearer ${token(Role.MANAGER)}`)
      .send({ name: 'Ноутбук', inventoryNumber: 'EQ-X', categoryId: 1, purchaseDate: '2026-01-01' });

    expect(res.status).toBe(201);
  });

  it('allows inventory manager to create inventory check', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(buildUser({ role: Role.INVENTORY_MANAGER }));
    prismaMock.inventoryCheck.create.mockResolvedValue(buildInventoryCheck({ title: 'Проверка склада' }));

    const res = await request(app)
      .post('/api/inventory-checks')
      .set('Authorization', `Bearer ${token(Role.INVENTORY_MANAGER)}`)
      .send({ title: 'Проверка склада' });

    expect(res.status).toBe(201);
  });

  it('blocks inventory manager from creating equipment outside inventory scope', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(buildUser({ role: Role.INVENTORY_MANAGER }));

    const res = await request(app)
      .post('/api/equipment')
      .set('Authorization', `Bearer ${token(Role.INVENTORY_MANAGER)}`)
      .send({ name: 'Ноутбук', inventoryNumber: 'EQ-INV-MGR', categoryId: 1, purchaseDate: '2026-01-01' });

    expect(res.status).toBe(403);
  });

  it('blocks employee from audit log', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(buildUser({ role: Role.EMPLOYEE }));

    const res = await request(app).get('/api/audit-log').set('Authorization', `Bearer ${token(Role.EMPLOYEE)}`);

    expect(res.status).toBe(403);
  });

  it('blocks employee from global CSV reports', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(buildUser({ role: Role.EMPLOYEE }));

    const res = await request(app)
      .get('/api/reports/equipment.csv')
      .set('Authorization', `Bearer ${token(Role.EMPLOYEE)}`);

    expect(res.status).toBe(403);
  });

  it('allows auditor to view audit log', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(buildUser({ role: Role.AUDITOR }));
    prismaMock.auditLog.findMany.mockResolvedValue([buildAuditLog()]);

    const res = await request(app).get('/api/audit-log').set('Authorization', `Bearer ${token(Role.AUDITOR)}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].action).toBe('equipment.create');
  });

  it('blocks viewer from audit log', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(buildUser({ role: Role.VIEWER }));

    const res = await request(app).get('/api/audit-log').set('Authorization', `Bearer ${token(Role.VIEWER)}`);

    expect(res.status).toBe(403);
  });

  it('blocks auditor from changing equipment', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(buildUser({ role: Role.AUDITOR }));

    const res = await request(app)
      .post('/api/equipment')
      .set('Authorization', `Bearer ${token(Role.AUDITOR)}`)
      .send({ name: 'Ноутбук', inventoryNumber: 'EQ-X', categoryId: 1, purchaseDate: '2026-01-01' });

    expect(res.status).toBe(403);
  });

  it('allows viewer to read reports but not create equipment', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(buildUser({ role: Role.VIEWER }));
    prismaMock.equipment.findMany.mockResolvedValue([sampleEquipment]);

    const report = await request(app)
      .get('/api/reports/equipment.pdf')
      .set('Authorization', `Bearer ${token(Role.VIEWER)}`)
      .buffer()
      .parse(pdfParser);

    prismaMock.user.findUnique.mockResolvedValueOnce(buildUser({ role: Role.VIEWER }));
    const create = await request(app)
      .post('/api/equipment')
      .set('Authorization', `Bearer ${token(Role.VIEWER)}`)
      .send({ name: 'Ноутбук', inventoryNumber: 'EQ-X', categoryId: 1, purchaseDate: '2026-01-01' });

    expect(report.status).toBe(200);
    expect(create.status).toBe(403);
  });

  it('validates required equipment fields', async () => {
    const res = await request(app).post('/api/equipment').set('Authorization', `Bearer ${token()}`).send({ name: 'x' });

    expect(res.status).toBe(400);
  });

  it('resolves category by name when categoryId is absent', async () => {
    prismaMock.category.upsert.mockResolvedValue({ id: 9, name: 'Планшеты' });
    prismaMock.equipment.create.mockResolvedValue(buildEquipment({ categoryId: 9 }));

    const res = await request(app)
      .post('/api/equipment')
      .set('Authorization', `Bearer ${token()}`)
      .send({ name: 'Планшет', inventoryNumber: 'TAB-1', category: 'Планшеты', purchaseDate: '2026-01-01' });

    expect(res.status).toBe(201);
    expect(prismaMock.category.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { name: 'Планшеты' } }));
  });

  it('passes status filter to equipment query', async () => {
    prismaMock.equipment.count.mockResolvedValue(0);
    prismaMock.equipment.findMany.mockResolvedValue([]);

    await request(app).get('/api/equipment?status=REPAIR').set('Authorization', `Bearer ${token()}`);

    expect(prismaMock.equipment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: EquipmentStatus.REPAIR }),
    }));
  });

  it('passes category and location filters to equipment query', async () => {
    prismaMock.equipment.count.mockResolvedValue(0);
    prismaMock.equipment.findMany.mockResolvedValue([]);

    await request(app).get('/api/equipment?categoryId=2&locationId=3').set('Authorization', `Bearer ${token()}`);

    expect(prismaMock.equipment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ categoryId: 2, locationId: 3 }),
    }));
  });

  it('builds search query across equipment fields', async () => {
    prismaMock.equipment.count.mockResolvedValue(0);
    prismaMock.equipment.findMany.mockResolvedValue([]);

    await request(app).get('/api/equipment?search=Dell').set('Authorization', `Bearer ${token()}`);

    expect(prismaMock.equipment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ OR: expect.any(Array) }),
    }));
  });

  it('returns equipment details with audit logs', async () => {
    prismaMock.equipment.findUnique.mockResolvedValue(buildEquipment({ issuances: [buildIssuance()], repairs: [buildRepairTicket()] }));
    prismaMock.auditLog.findMany.mockResolvedValue([buildAuditLog()]);

    const res = await request(app).get('/api/equipment/1').set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.body.auditLogs).toHaveLength(1);
    expect(res.body.issuances).toHaveLength(1);
    expect(res.body.repairs).toHaveLength(1);
  });

  it('returns 404 for missing equipment details', async () => {
    prismaMock.equipment.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/equipment/404').set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(404);
  });

  it('updates only provided equipment fields', async () => {
    prismaMock.equipment.findUnique.mockResolvedValue(buildEquipment({ name: 'Old name' }));
    prismaMock.equipment.update.mockResolvedValue(buildEquipment({ name: 'New name' }));

    const res = await request(app)
      .put('/api/equipment/1')
      .set('Authorization', `Bearer ${token()}`)
      .send({ name: 'New name' });

    expect(res.status).toBe(200);
    expect(prismaMock.equipment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ name: 'New name', inventoryNumber: 'EQ-001' }),
    }));
  });

  it('does not delete equipment with issuance history', async () => {
    prismaMock.issuance.count.mockResolvedValue(1);

    const res = await request(app).delete('/api/equipment/1').set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(400);
    expect(prismaMock.equipment.delete).not.toHaveBeenCalled();
  });

  it('deletes equipment without history', async () => {
    prismaMock.issuance.count.mockResolvedValue(0);
    prismaMock.equipment.delete.mockResolvedValue(buildEquipment());

    const res = await request(app).delete('/api/equipment/1').set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(prismaMock.equipment.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('write-off changes equipment status to WRITTEN_OFF and clears holder', async () => {
    prismaMock.issuance.count.mockResolvedValue(0);
    prismaMock.equipment.update.mockResolvedValue(buildEquipment({ status: EquipmentStatus.WRITTEN_OFF }));

    const res = await request(app).post('/api/equipment/1/write-off').set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(prismaMock.equipment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: EquipmentStatus.WRITTEN_OFF, currentHolderId: null },
    }));
  });

  it('does not write off equipment with active issuance', async () => {
    prismaMock.issuance.count.mockResolvedValue(1);

    const res = await request(app).post('/api/equipment/1/write-off').set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(400);
    expect(prismaMock.equipment.update).not.toHaveBeenCalled();
  });

  it('mark-lost changes equipment status to LOST and clears holder', async () => {
    prismaMock.issuance.count.mockResolvedValue(0);
    prismaMock.equipment.update.mockResolvedValue(buildEquipment({ status: EquipmentStatus.LOST }));

    const res = await request(app).post('/api/equipment/1/mark-lost').set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(prismaMock.equipment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: EquipmentStatus.LOST, currentHolderId: null },
    }));
  });

  it('issues AVAILABLE equipment and moves it to IN_USE', async () => {
    prismaMock.equipment.findUnique.mockResolvedValue(buildEquipment({ status: EquipmentStatus.AVAILABLE }));
    prismaMock.employee.findUnique.mockResolvedValue(buildEmployee());
    prismaMock.issuance.create.mockResolvedValue(buildIssuance());
    prismaMock.equipment.update.mockResolvedValue(buildEquipment({ status: EquipmentStatus.IN_USE, currentHolderId: 1 }));
    prismaMock.user.findMany.mockResolvedValue([buildUser()]);

    const res = await request(app).post('/api/issuances').set('Authorization', `Bearer ${token()}`).send({ equipmentId: 1, employeeId: 1 });

    expect(res.status).toBe(201);
    expect(prismaMock.equipment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: EquipmentStatus.IN_USE, currentHolderId: 1 },
    }));
  });

  it('marks issuance as overdue when expected return is in the past', async () => {
    prismaMock.equipment.findUnique.mockResolvedValue(buildEquipment({ status: EquipmentStatus.AVAILABLE }));
    prismaMock.employee.findUnique.mockResolvedValue(buildEmployee());
    prismaMock.issuance.create.mockResolvedValue(buildIssuance({ status: IssuanceStatus.OVERDUE }));
    prismaMock.equipment.update.mockResolvedValue(buildEquipment());
    prismaMock.user.findMany.mockResolvedValue([buildUser()]);

    const res = await request(app)
      .post('/api/issuances')
      .set('Authorization', `Bearer ${token()}`)
      .send({ equipmentId: 1, employeeId: 1, expectedReturnAt: '2020-01-01' });

    expect(res.status).toBe(201);
    expect(prismaMock.issuance.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: IssuanceStatus.OVERDUE }),
    }));
  });

  it.each([EquipmentStatus.IN_USE, EquipmentStatus.REPAIR, EquipmentStatus.WRITTEN_OFF, EquipmentStatus.LOST])(
    'does not issue %s equipment',
    async (status) => {
      prismaMock.equipment.findUnique.mockResolvedValue(buildEquipment({ status }));

      const res = await request(app).post('/api/issuances').set('Authorization', `Bearer ${token()}`).send({ equipmentId: 1, employeeId: 1 });

      expect(res.status).toBe(400);
      expect(prismaMock.issuance.create).not.toHaveBeenCalled();
    }
  );

  it('returns 404 when issuing missing equipment', async () => {
    prismaMock.equipment.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/issuances').set('Authorization', `Bearer ${token()}`).send({ equipmentId: 99, employeeId: 1 });

    expect(res.status).toBe(404);
  });

  it('returns 404 when issuing to missing employee', async () => {
    prismaMock.equipment.findUnique.mockResolvedValue(buildEquipment({ status: EquipmentStatus.AVAILABLE }));
    prismaMock.employee.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/issuances').set('Authorization', `Bearer ${token()}`).send({ equipmentId: 1, employeeId: 99 });

    expect(res.status).toBe(404);
  });

  it('returns issuance and moves equipment back to AVAILABLE', async () => {
    prismaMock.issuance.findUnique.mockResolvedValue(buildIssuance());
    prismaMock.issuance.update.mockResolvedValue(buildIssuance({ status: IssuanceStatus.RETURNED, returnedAt: new Date() }));
    prismaMock.equipment.update.mockResolvedValue(buildEquipment({ status: EquipmentStatus.AVAILABLE, currentHolderId: null }));

    const res = await request(app).put('/api/issuances/1/return').set('Authorization', `Bearer ${token()}`).send({ returnComment: 'ok' });

    expect(res.status).toBe(200);
    expect(prismaMock.issuance.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: IssuanceStatus.RETURNED, returnComment: 'ok' }),
    }));
    expect(prismaMock.equipment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: EquipmentStatus.AVAILABLE, currentHolderId: null },
    }));
  });

  it('does not return an already returned issuance', async () => {
    prismaMock.issuance.findUnique.mockResolvedValue(buildIssuance({ returnedAt: new Date(), status: IssuanceStatus.RETURNED }));

    const res = await request(app).put('/api/issuances/1/return').set('Authorization', `Bearer ${token()}`).send({});

    expect(res.status).toBe(400);
  });

  it('lists overdue issuances by status or expected return date', async () => {
    prismaMock.issuance.findMany.mockResolvedValue([buildIssuance({ status: IssuanceStatus.OVERDUE })]);

    const res = await request(app).get('/api/issuances/overdue').set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(prismaMock.issuance.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ OR: expect.any(Array) }),
    }));
  });

  it('creates repair ticket and changes equipment to REPAIR', async () => {
    prismaMock.equipment.findUnique.mockResolvedValue(buildEquipment({ status: EquipmentStatus.AVAILABLE }));
    prismaMock.repairTicket.create.mockResolvedValue(buildRepairTicket());
    prismaMock.equipment.update.mockResolvedValue(buildEquipment({ status: EquipmentStatus.REPAIR }));

    const res = await request(app).post('/api/repairs').set('Authorization', `Bearer ${token()}`).send({ equipmentId: 1, priority: RepairPriority.HIGH, reason: 'Не включается' });

    expect(res.status).toBe(201);
    expect(prismaMock.equipment.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: EquipmentStatus.REPAIR } });
  });

  it.each([EquipmentStatus.WRITTEN_OFF, EquipmentStatus.LOST])('does not create repair for %s equipment', async (status) => {
    prismaMock.equipment.findUnique.mockResolvedValue(buildEquipment({ status }));

    const res = await request(app).post('/api/repairs').set('Authorization', `Bearer ${token()}`).send({ equipmentId: 1, reason: 'broken' });

    expect(res.status).toBe(400);
  });

  it('updates repair status to IN_PROGRESS', async () => {
    prismaMock.repairTicket.update.mockResolvedValue(buildRepairTicket({ status: RepairStatus.IN_PROGRESS }));

    const res = await request(app).put('/api/repairs/1/status').set('Authorization', `Bearer ${token()}`).send({ status: RepairStatus.IN_PROGRESS, diagnosis: 'Диагностика' });

    expect(res.status).toBe(200);
    expect(prismaMock.repairTicket.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: RepairStatus.IN_PROGRESS, diagnosis: 'Диагностика' },
    }));
    expect(prismaMock.equipment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: EquipmentStatus.REPAIR },
    }));
  });

  it('cancels repair and restores equipment availability', async () => {
    prismaMock.repairTicket.update.mockResolvedValue(buildRepairTicket({ status: RepairStatus.CANCELLED, equipmentId: 1 }));
    prismaMock.issuance.findFirst.mockResolvedValue(null);

    const res = await request(app).put('/api/repairs/1/status').set('Authorization', `Bearer ${token()}`).send({ status: RepairStatus.CANCELLED });

    expect(res.status).toBe(200);
    expect(prismaMock.equipment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: EquipmentStatus.AVAILABLE },
    }));
  });

  it('completes repair and sets equipment AVAILABLE without active issuance', async () => {
    prismaMock.repairTicket.findUnique.mockResolvedValue(buildRepairTicket());
    prismaMock.issuance.findFirst.mockResolvedValue(null);
    prismaMock.repairTicket.update.mockResolvedValue(buildRepairTicket({ status: RepairStatus.DONE, completedAt: new Date() }));
    prismaMock.equipment.update.mockResolvedValue(buildEquipment({ status: EquipmentStatus.AVAILABLE }));

    const res = await request(app).put('/api/repairs/1/complete').set('Authorization', `Bearer ${token()}`).send({ result: 'Готово', cost: 1000 });

    expect(res.status).toBe(200);
    expect(prismaMock.repairTicket.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: RepairStatus.DONE, completedAt: expect.any(Date) }),
    }));
    expect(prismaMock.equipment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: EquipmentStatus.AVAILABLE },
    }));
  });

  it('completes repair and keeps equipment IN_USE when active issuance exists', async () => {
    prismaMock.repairTicket.findUnique.mockResolvedValue(buildRepairTicket());
    prismaMock.issuance.findFirst.mockResolvedValue(buildIssuance());
    prismaMock.repairTicket.update.mockResolvedValue(buildRepairTicket({ status: RepairStatus.DONE, completedAt: new Date() }));
    prismaMock.equipment.update.mockResolvedValue(buildEquipment({ status: EquipmentStatus.IN_USE }));

    const res = await request(app).put('/api/repairs/1/complete').set('Authorization', `Bearer ${token()}`).send({ result: 'Готово' });

    expect(res.status).toBe(200);
    expect(prismaMock.equipment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: EquipmentStatus.IN_USE },
    }));
  });

  it('creates inventory item with FOUND status by default', async () => {
    prismaMock.inventoryCheckItem.create.mockResolvedValue(buildInventoryItem({ status: InventoryItemStatus.FOUND }));

    const res = await request(app).post('/api/inventory-checks/1/items').set('Authorization', `Bearer ${token()}`).send({ equipmentId: 1 });

    expect(res.status).toBe(201);
    expect(prismaMock.inventoryCheckItem.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: InventoryItemStatus.FOUND }),
    }));
  });

  it.each([InventoryItemStatus.MISSING, InventoryItemStatus.MOVED, InventoryItemStatus.DAMAGED])('updates inventory item status to %s', async (status) => {
    prismaMock.inventoryCheckItem.update.mockResolvedValue(buildInventoryItem({ status, comment: 'note' }));

    const res = await request(app)
      .put('/api/inventory-checks/1/items/2')
      .set('Authorization', `Bearer ${token()}`)
      .send({ status, actualLocationId: 2, comment: 'note' });

    expect(res.status).toBe(200);
    expect(prismaMock.inventoryCheckItem.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status, actualLocationId: 2, comment: 'note' }),
    }));
  });

  it('completes inventory check and fills completedAt', async () => {
    prismaMock.inventoryCheck.update.mockResolvedValue(buildInventoryCheck({ status: InventoryCheckStatus.COMPLETED, completedAt: new Date(), items: [buildInventoryItem()] }));

    const res = await request(app).post('/api/inventory-checks/1/complete').set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(prismaMock.inventoryCheck.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: InventoryCheckStatus.COMPLETED, completedAt: expect.any(Date) }),
    }));
  });

  it('returns inventory check with items', async () => {
    prismaMock.inventoryCheck.findUnique.mockResolvedValue(buildInventoryCheck({ items: [buildInventoryItem()] }));

    const res = await request(app).get('/api/inventory-checks/1').set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it('filters audit log by action entity and date range', async () => {
    prismaMock.auditLog.findMany.mockResolvedValue([buildAuditLog()]);

    const res = await request(app)
      .get('/api/audit-log?action=equipment&entityType=Equipment&dateFrom=2026-01-01&dateTo=2026-12-31')
      .set('Authorization', `Bearer ${token(Role.ADMIN)}`);

    expect(res.status).toBe(200);
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        action: expect.objectContaining({ contains: 'equipment' }),
        entityType: 'Equipment',
        createdAt: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
      }),
    }));
  });

  it('equipment CSV includes business columns', async () => {
    prismaMock.equipment.findMany.mockResolvedValue([sampleEquipment]);

    const res = await request(app).get('/api/reports/equipment.csv').set('Authorization', `Bearer ${token()}`);

    expect(res.text).toContain('inventoryNumber');
    expect(res.text).toContain('purchasePrice');
    expect(res.text).toContain('warrantyUntil');
  });

  it('issuances CSV includes return columns', async () => {
    prismaMock.issuance.findMany.mockResolvedValue([buildIssuance()]);

    const res = await request(app).get('/api/reports/issuances.csv').set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('expectedReturnAt');
    expect(res.text).toContain('returnedAt');
  });

  it('repairs CSV includes priority status and cost', async () => {
    prismaMock.repairTicket.findMany.mockResolvedValue([buildRepairTicket()]);

    const res = await request(app).get('/api/reports/repairs.csv').set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('priority');
    expect(res.text).toContain('cost');
  });

  it('equipment PDF is available to manager and auditor', async () => {
    for (const role of [Role.MANAGER, Role.AUDITOR]) {
      prismaMock.user.findUnique.mockResolvedValueOnce(buildUser({ role }));
      prismaMock.equipment.findMany.mockResolvedValueOnce([sampleEquipment]);
      const res = await request(app).get('/api/reports/equipment.pdf').set('Authorization', `Bearer ${token(role)}`).buffer().parse(pdfParser);
      expect(res.status).toBe(200);
      expect(res.body.slice(0, 4).toString()).toBe('%PDF');
    }
  });

  it('reports accept filters without breaking PDF generation', async () => {
    prismaMock.equipment.findMany.mockResolvedValue([sampleEquipment]);

    const res = await request(app)
      .get('/api/reports/equipment.pdf?status=AVAILABLE&categoryId=1&locationId=1&search=Dell')
      .set('Authorization', `Bearer ${token()}`)
      .buffer()
      .parse(pdfParser);

    expectPdf(res, 'equipment-report-');
    expect(prismaMock.equipment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: EquipmentStatus.AVAILABLE, categoryId: 1, locationId: 1 }),
    }));
  });

  it('returns finance summary for auditor with calculated totals', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(buildUser({ role: Role.AUDITOR }));
    prismaMock.equipment.findMany.mockResolvedValue([
      { ...sampleEquipment, financialStatus: FinancialStatus.EXPENSIVE_MAINTENANCE, depreciationPercent: 65 },
    ]);
    prismaMock.equipmentFinancialOperation.aggregate.mockResolvedValue({ _sum: { amount: 25000 } });

    const res = await request(app).get('/api/finance/summary').set('Authorization', `Bearer ${token(Role.AUDITOR)}`);

    expect(res.status).toBe(200);
    expect(res.body.totalPurchaseValue).toBe(420000);
    expect(res.body.repairAndServiceCost).toBe(25000);
    expect(res.body.highDepreciationCount).toBe(1);
    expect(res.body.expensiveMaintenanceCount).toBe(1);
  });

  it('blocks employee from finance module', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(buildUser({ role: Role.EMPLOYEE }));

    const res = await request(app).get('/api/finance/summary').set('Authorization', `Bearer ${token(Role.EMPLOYEE)}`);

    expect(res.status).toBe(403);
  });

  it('hides financial operations from viewer equipment finance details', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(buildUser({ role: Role.VIEWER }));
    prismaMock.equipment.findUnique.mockResolvedValue(buildEquipment());

    const res = await request(app).get('/api/finance/equipment/1').set('Authorization', `Bearer ${token(Role.VIEWER)}`);

    expect(res.status).toBe(200);
    expect(res.body.detailsHidden).toBe(true);
    expect(res.body.operations).toHaveLength(0);
    expect(prismaMock.equipmentFinancialOperation.findMany).not.toHaveBeenCalled();
  });

  it('creates financial operation and refreshes equipment finance fields', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(buildUser({ role: Role.MANAGER }));
    prismaMock.equipment.findUnique.mockResolvedValue(buildEquipment());
    prismaMock.equipmentFinancialOperation.create.mockResolvedValue({
      id: 7,
      equipmentId: 1,
      type: PaymentType.REPAIR,
      method: PaymentMethod.INVOICE,
      amount: 12000,
      operationDate: new Date('2026-05-01'),
      comment: 'Диагностика',
      createdBy: { username: 'manager' },
    });
    prismaMock.equipmentFinancialOperation.findMany.mockResolvedValue([{ amount: 12000 }]);
    prismaMock.equipment.update.mockResolvedValue(buildEquipment({ serviceCostTotal: 12000 }));

    const res = await request(app)
      .post('/api/finance/equipment/1/operations')
      .set('Authorization', `Bearer ${token(Role.MANAGER)}`)
      .send({ type: PaymentType.REPAIR, method: PaymentMethod.INVOICE, amount: 12000, comment: 'Диагностика' });

    expect(res.status).toBe(201);
    expect(prismaMock.equipmentFinancialOperation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ equipmentId: 1, amount: 12000, type: PaymentType.REPAIR }),
    }));
    expect(prismaMock.equipment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ serviceCostTotal: 12000 }),
    }));
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'finance.operation_create' }),
    }));
  });

  it('lets repair coordinator list only assigned pickup tasks', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(buildUser({ id: 9, role: Role.REPAIR_COORDINATOR }));
    prismaMock.repairTicket.findMany.mockResolvedValue([buildRepairTicket({
      assignedCoordinatorId: 9,
      pickupStatus: RepairPickupStatus.NOTIFIED,
      pickupDueDate: new Date('2026-06-01'),
      assignedCoordinator: { id: 9, username: 'repair_coordinator', role: Role.REPAIR_COORDINATOR },
    })]);

    const res = await request(app).get('/api/repair-pickups').set('Authorization', `Bearer ${token(Role.REPAIR_COORDINATOR)}`);

    expect(res.status).toBe(200);
    expect(prismaMock.repairTicket.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { assignedCoordinatorId: 9 },
    }));
  });

  it('allows managers to list active repair coordinators', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(buildUser({ role: Role.MANAGER }));
    prismaMock.user.findMany.mockResolvedValue([{ id: 9, username: 'repair_coordinator', role: Role.REPAIR_COORDINATOR }]);

    const res = await request(app).get('/api/repair-pickups/coordinators').set('Authorization', `Bearer ${token(Role.MANAGER)}`);

    expect(res.status).toBe(200);
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { role: Role.REPAIR_COORDINATOR, isActive: true },
    }));
  });

  it('blocks employees from listing repair coordinators', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(buildUser({ role: Role.EMPLOYEE }));

    const res = await request(app).get('/api/repair-pickups/coordinators').set('Authorization', `Bearer ${token(Role.EMPLOYEE)}`);

    expect(res.status).toBe(403);
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });

  it('marks pickup as delivered and moves repair to IN_PROGRESS', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(buildUser({ id: 9, role: Role.REPAIR_COORDINATOR }));
    prismaMock.repairTicket.findUnique.mockResolvedValue(buildRepairTicket({
      id: 4,
      assignedCoordinatorId: 9,
      pickupStatus: RepairPickupStatus.PICKED_UP,
      assignedCoordinator: { id: 9, username: 'repair_coordinator', role: Role.REPAIR_COORDINATOR },
    }));
    prismaMock.repairTicket.update.mockResolvedValue(buildRepairTicket({
      id: 4,
      assignedCoordinatorId: 9,
      pickupStatus: RepairPickupStatus.DELIVERED,
      status: RepairStatus.IN_PROGRESS,
      assignedCoordinator: { id: 9, username: 'repair_coordinator', role: Role.REPAIR_COORDINATOR },
    }));
    prismaMock.user.findMany.mockResolvedValue([buildUser({ id: 1, role: Role.ADMIN })]);

    const res = await request(app)
      .put('/api/repair-pickups/4/status')
      .set('Authorization', `Bearer ${token(Role.REPAIR_COORDINATOR)}`)
      .send({ status: RepairPickupStatus.DELIVERED, comment: 'Доставлено' });

    expect(res.status).toBe(200);
    expect(prismaMock.repairTicket.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ pickupStatus: RepairPickupStatus.DELIVERED, status: RepairStatus.IN_PROGRESS }),
    }));
    expect(prismaMock.notification.createMany).toHaveBeenCalled();
  });

  it('dashboard fills missing statuses with zero values', async () => {
    prismaMock.equipment.count.mockResolvedValue(2);
    prismaMock.equipment.groupBy.mockResolvedValueOnce([{ status: EquipmentStatus.AVAILABLE, _count: { id: 2 } }]).mockResolvedValueOnce([]);
    prismaMock.equipment.aggregate.mockResolvedValue({ _sum: { purchasePrice: 1000, residualValue: 600, serviceCostTotal: 50 } });
    prismaMock.category.findMany.mockResolvedValue([]);
    prismaMock.issuance.findMany.mockResolvedValue([]);
    prismaMock.issuance.count.mockResolvedValue(0);
    prismaMock.issuance.groupBy.mockResolvedValue([]);
    prismaMock.employee.findMany.mockResolvedValue([]);
    prismaMock.auditLog.findMany.mockResolvedValue([]);
    prismaMock.repairTicket.count.mockResolvedValue(0);
    prismaMock.notification.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/dashboard/stats').set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.body.available).toBe(2);
    expect(res.body.repair).toBe(0);
    expect(res.body.lost).toBe(0);
  });

  it('dashboard counts overdue issuances and critical repairs', async () => {
    prismaMock.equipment.count.mockResolvedValue(0);
    prismaMock.equipment.groupBy.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    prismaMock.equipment.aggregate.mockResolvedValue({ _sum: { purchasePrice: 0, residualValue: 0, serviceCostTotal: 0 } });
    prismaMock.category.findMany.mockResolvedValue([]);
    prismaMock.issuance.findMany.mockResolvedValue([]);
    prismaMock.issuance.count.mockResolvedValue(3);
    prismaMock.issuance.groupBy.mockResolvedValue([]);
    prismaMock.employee.findMany.mockResolvedValue([]);
    prismaMock.auditLog.findMany.mockResolvedValue([]);
    prismaMock.repairTicket.count.mockResolvedValueOnce(4).mockResolvedValueOnce(1);
    prismaMock.notification.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/dashboard/stats').set('Authorization', `Bearer ${token()}`);

    expect(res.body.overdueIssuances).toBe(3);
    expect(res.body.activeRepairs).toBe(4);
    expect(res.body.criticalRepairs).toBe(1);
  });
});
