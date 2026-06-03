import {
  EquipmentStatus,
  InventoryCheckStatus,
  InventoryItemStatus,
  IssuanceStatus,
  RepairPriority,
  RepairStatus,
  Role,
} from '@prisma/client';

export function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    username: 'admin',
    email: 'admin@example.local',
    role: Role.ADMIN,
    isActive: true,
    passwordHash: 'hash',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

export function buildEmployee(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    fullName: 'Иванов Иван Иванович',
    departmentId: 1,
    position: 'Системный администратор',
    email: 'ivanov@example.local',
    phone: '+7 701 100 10 01',
    department: { id: 1, name: 'IT отдел' },
    ...overrides,
  };
}

export function buildEquipment(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Ноутбук Dell Latitude',
    inventoryNumber: 'EQ-001',
    serialNumber: 'SN-001',
    status: EquipmentStatus.AVAILABLE,
    purchaseDate: new Date('2026-01-10'),
    purchasePrice: 420000,
    warrantyUntil: new Date('2027-01-10'),
    categoryId: 1,
    locationId: 1,
    currentHolderId: null,
    description: 'Demo equipment',
    category: { id: 1, name: 'Ноутбуки' },
    location: { id: 1, name: 'Склад' },
    currentHolder: null,
    issuances: [],
    repairs: [],
    auditLogs: [],
    ...overrides,
  };
}

export function buildIssuance(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    equipmentId: 1,
    employeeId: 1,
    issuedById: 1,
    issuedAt: new Date('2026-02-01'),
    expectedReturnAt: new Date('2026-03-01'),
    returnedAt: null,
    returnComment: null,
    status: IssuanceStatus.ACTIVE,
    equipment: buildEquipment(),
    employee: buildEmployee(),
    issuedBy: { id: 1, username: 'manager' },
    ...overrides,
  };
}

export function buildRepairTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    equipmentId: 1,
    createdById: 1,
    assignedToId: null,
    status: RepairStatus.OPEN,
    priority: RepairPriority.HIGH,
    reason: 'Не включается',
    diagnosis: null,
    result: null,
    cost: 15000,
    createdAt: new Date('2026-04-01'),
    completedAt: null,
    equipment: buildEquipment(),
    createdBy: { id: 1, username: 'admin' },
    assignedTo: null,
    ...overrides,
  };
}

export function buildInventoryCheck(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: 'Плановая инвентаризация',
    status: InventoryCheckStatus.IN_PROGRESS,
    startedAt: new Date('2026-05-01'),
    completedAt: null,
    createdById: 1,
    createdBy: { username: 'manager' },
    items: [],
    _count: { items: 0 },
    ...overrides,
  };
}

export function buildInventoryItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    inventoryCheckId: 1,
    equipmentId: 1,
    expectedLocationId: 1,
    actualLocationId: 1,
    status: InventoryItemStatus.FOUND,
    comment: null,
    equipment: buildEquipment(),
    expectedLocation: { id: 1, name: 'Склад' },
    actualLocation: { id: 1, name: 'Склад' },
    ...overrides,
  };
}

export function buildAuditLog(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: 1,
    action: 'equipment.create',
    entityType: 'Equipment',
    entityId: '1',
    metadata: { inventoryNumber: 'EQ-001' },
    ip: '127.0.0.1',
    createdAt: new Date('2026-05-01'),
    user: { id: 1, username: 'admin', role: Role.ADMIN },
    ...overrides,
  };
}
