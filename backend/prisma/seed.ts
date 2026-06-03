import {
  EquipmentStatus,
  InventoryCheckStatus,
  InventoryItemStatus,
  IssuanceStatus,
  NotificationType,
  PrismaClient,
  RepairPriority,
  RepairStatus,
  Role,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

async function main() {
  console.log('Seeding enterprise equipment demo database...');

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      attachments,
      notifications,
      audit_logs,
      inventory_check_items,
      inventory_checks,
      repair_tickets,
      issuances,
      equipment,
      employees,
      locations,
      departments,
      categories,
      users
    RESTART IDENTITY CASCADE
  `);

  const passwordHash = await bcrypt.hash('password123', 10);
  const users = await Promise.all([
    prisma.user.create({ data: { username: 'admin', email: 'admin@example.local', passwordHash, role: Role.ADMIN } }),
    prisma.user.create({ data: { username: 'manager', email: 'manager@example.local', passwordHash, role: Role.MANAGER } }),
    prisma.user.create({ data: { username: 'inventory_manager', email: 'inventory@example.local', passwordHash, role: Role.INVENTORY_MANAGER } }),
    prisma.user.create({ data: { username: 'employee', email: 'employee@example.local', passwordHash, role: Role.EMPLOYEE } }),
    prisma.user.create({ data: { username: 'auditor', email: 'auditor@example.local', passwordHash, role: Role.AUDITOR } }),
    prisma.user.create({ data: { username: 'viewer', email: 'viewer@example.local', passwordHash, role: Role.VIEWER } }),
  ]);
  const [admin, manager, inventoryManager, employeeUser, auditor, viewer] = users;

  const departments = await Promise.all(
    [
      ['IT отдел', 'Инфраструктура, рабочие станции, серверы'],
      ['Бухгалтерия', 'Финансовый учёт и отчётность'],
      ['HR', 'Кадровые процессы и обучение'],
      ['Производственный отдел', 'Рабочие зоны и производственное оборудование'],
      ['Склад', 'Хранение и первичная приёмка'],
      ['Администрация', 'Руководство и общие сервисы'],
    ].map(([name, description]) => prisma.department.create({ data: { name, description } }))
  );

  const categories = await Promise.all(
    [
      ['Ноутбуки', 'Мобильные рабочие станции сотрудников'],
      ['Мониторы', 'Дисплеи и рабочие комплекты'],
      ['Принтеры', 'Печатающая техника и МФУ'],
      ['Сетевое оборудование', 'Коммутаторы, роутеры, точки доступа'],
      ['Серверы', 'Серверное и инфраструктурное оборудование'],
      ['Периферия', 'Клавиатуры, мыши, гарнитуры, док-станции'],
    ].map(([name, description]) => prisma.category.create({ data: { name, description } }))
  );

  const locations = await Promise.all(
    [
      ['Кабинет 101', '101', '1', 'IT отдел и поддержка пользователей'],
      ['Кабинет 205', '205', '2', 'Бухгалтерия'],
      ['Серверная', 'S-1', '1', 'Ограниченный доступ, климат-контроль'],
      ['Склад', 'W-1', '1', 'Зона хранения доступного оборудования'],
      ['Ремонтная зона', 'R-1', '1', 'Диагностика и ремонт'],
      ['Конференц-зал', '301', '3', 'Презентации и совещания'],
    ].map(([name, room, floor, description]) => prisma.location.create({ data: { name, room, floor, description } }))
  );

  const employees = await Promise.all(
    [
      ['Иванов Иван Иванович', 0, 'Системный администратор', 'ivanov@example.local', '+7 701 100 10 01'],
      ['Петрова Мария Сергеевна', 1, 'Главный бухгалтер', 'petrova@example.local', '+7 701 100 10 02'],
      ['Сидоров Алексей Петрович', 0, 'Разработчик', 'sidorov@example.local', '+7 701 100 10 03'],
      ['Козлова Елена Дмитриевна', 2, 'HR менеджер', 'kozlova@example.local', '+7 701 100 10 04'],
      ['Морозов Дмитрий Владимирович', 3, 'Начальник смены', 'morozov@example.local', '+7 701 100 10 05'],
      ['Ахметова Динара Муратовна', 5, 'Офис-менеджер', 'akhmetova@example.local', '+7 701 100 10 06'],
      ['Ким Андрей Валерьевич', 4, 'Кладовщик', 'kim@example.local', '+7 701 100 10 07'],
      ['Смирнова Ольга Павловна', 1, 'Бухгалтер', 'smirnova@example.local', '+7 701 100 10 08'],
      ['Жумабаев Нурлан Серикович', 3, 'Инженер производства', 'zhumabaev@example.local', '+7 701 100 10 09'],
      ['Васильева Анна Игоревна', 2, 'Рекрутер', 'vasileva@example.local', '+7 701 100 10 10'],
    ].map(([fullName, departmentIndex, position, email, phone]) =>
      prisma.employee.create({
        data: {
          fullName: String(fullName),
          departmentId: departments[Number(departmentIndex)].id,
          position: String(position),
          email: String(email),
          phone: String(phone),
        },
      })
    )
  );

  const categoryByName = Object.fromEntries(categories.map((category) => [category.name, category]));
  const locationByName = Object.fromEntries(locations.map((location) => [location.name, location]));

  const equipmentSeed = [
    ['Ноутбук Dell Latitude 5540', 'EQ-2026-001', 'DL-5540-A1', 'Ноутбуки', EquipmentStatus.IN_USE, 420000, 'Кабинет 101', 0],
    ['Ноутбук Lenovo ThinkPad T14', 'EQ-2026-002', 'LN-T14-B2', 'Ноутбуки', EquipmentStatus.IN_USE, 395000, 'Кабинет 205', 1],
    ['Ноутбук HP ProBook 450', 'EQ-2026-003', 'HP-PB450-C3', 'Ноутбуки', EquipmentStatus.AVAILABLE, 350000, 'Склад', null],
    ['Ноутбук Asus ExpertBook', 'EQ-2026-004', 'AS-EX-B4', 'Ноутбуки', EquipmentStatus.REPAIR, 330000, 'Ремонтная зона', null],
    ['Ноутбук Acer TravelMate', 'EQ-2026-005', 'AC-TM-C5', 'Ноутбуки', EquipmentStatus.LOST, 280000, 'Кабинет 101', null],
    ['Монитор Samsung 27 4K', 'EQ-2026-006', 'SM-27-4K-01', 'Мониторы', EquipmentStatus.IN_USE, 160000, 'Кабинет 101', 2],
    ['Монитор LG UltraFine 27', 'EQ-2026-007', 'LG-UF-27-02', 'Мониторы', EquipmentStatus.IN_USE, 155000, 'Кабинет 205', 1],
    ['Монитор Dell P2422H', 'EQ-2026-008', 'DL-P24-03', 'Мониторы', EquipmentStatus.AVAILABLE, 98000, 'Склад', null],
    ['Монитор Philips 24', 'EQ-2026-009', 'PH-24-04', 'Мониторы', EquipmentStatus.AVAILABLE, 92000, 'Склад', null],
    ['Принтер HP LaserJet Pro', 'EQ-2026-010', 'HP-LJ-10', 'Принтеры', EquipmentStatus.AVAILABLE, 145000, 'Кабинет 205', null],
    ['МФУ Canon imageRUNNER', 'EQ-2026-011', 'CN-IR-11', 'Принтеры', EquipmentStatus.REPAIR, 480000, 'Ремонтная зона', null],
    ['Принтер Epson L3250', 'EQ-2026-012', 'EP-L3250-12', 'Принтеры', EquipmentStatus.IN_USE, 115000, 'HR', 3],
    ['Коммутатор Cisco Catalyst 2960', 'EQ-2026-013', 'CS-2960-13', 'Сетевое оборудование', EquipmentStatus.WRITTEN_OFF, 260000, 'Склад', null],
    ['Коммутатор MikroTik CRS326', 'EQ-2026-014', 'MT-CRS-14', 'Сетевое оборудование', EquipmentStatus.AVAILABLE, 210000, 'Серверная', null],
    ['Маршрутизатор MikroTik RB4011', 'EQ-2026-015', 'MT-RB-15', 'Сетевое оборудование', EquipmentStatus.IN_USE, 190000, 'Серверная', null],
    ['Точка доступа UniFi U6 Pro', 'EQ-2026-016', 'UF-U6-16', 'Сетевое оборудование', EquipmentStatus.AVAILABLE, 105000, 'Склад', null],
    ['Сервер Dell PowerEdge R740', 'EQ-2026-017', 'DL-R740-17', 'Серверы', EquipmentStatus.IN_USE, 2450000, 'Серверная', null],
    ['NAS Synology RS1221+', 'EQ-2026-018', 'SY-RS-18', 'Серверы', EquipmentStatus.IN_USE, 780000, 'Серверная', null],
    ['ИБП APC Smart-UPS 1500', 'EQ-2026-019', 'APC-1500-19', 'Серверы', EquipmentStatus.REPAIR, 310000, 'Ремонтная зона', null],
    ['Мини-сервер Intel NUC', 'EQ-2026-020', 'NUC-20', 'Серверы', EquipmentStatus.AVAILABLE, 260000, 'Склад', null],
    ['Клавиатура Logitech MX Keys', 'EQ-2026-021', 'LG-MXK-21', 'Периферия', EquipmentStatus.IN_USE, 52000, 'Кабинет 101', 0],
    ['Мышь Logitech MX Master 3', 'EQ-2026-022', 'LG-MXM-22', 'Периферия', EquipmentStatus.IN_USE, 48000, 'Кабинет 101', 0],
    ['Док-станция Dell WD19', 'EQ-2026-023', 'DL-WD19-23', 'Периферия', EquipmentStatus.AVAILABLE, 89000, 'Склад', null],
    ['Гарнитура Jabra Evolve2', 'EQ-2026-024', 'JB-E2-24', 'Периферия', EquipmentStatus.IN_USE, 75000, 'Кабинет 205', 7],
    ['Проектор Epson EB-X51', 'EQ-2026-025', 'EP-EBX-25', 'Периферия', EquipmentStatus.AVAILABLE, 320000, 'Конференц-зал', null],
    ['Ноутбук MacBook Air M2', 'EQ-2026-026', 'MBA-M2-26', 'Ноутбуки', EquipmentStatus.RESERVED, 610000, 'Склад', null],
    ['Монитор AOC 24B2XH', 'EQ-2026-027', 'AOC-24-27', 'Мониторы', EquipmentStatus.IN_USE, 83000, 'Производственный отдел', 8],
    ['Принтер Zebra ZD421', 'EQ-2026-028', 'ZB-ZD-28', 'Принтеры', EquipmentStatus.IN_USE, 230000, 'Склад', 6],
    ['Firewall Fortigate 60F', 'EQ-2026-029', 'FG-60F-29', 'Сетевое оборудование', EquipmentStatus.AVAILABLE, 640000, 'Серверная', null],
    ['Сервер HPE ProLiant DL360', 'EQ-2026-030', 'HP-DL360-30', 'Серверы', EquipmentStatus.AVAILABLE, 2200000, 'Склад', null],
    ['Камера Logitech Brio', 'EQ-2026-031', 'LG-BRIO-31', 'Периферия', EquipmentStatus.IN_USE, 69000, 'Конференц-зал', 5],
    ['Планшет Samsung Tab S8', 'EQ-2026-032', 'SM-TABS8-32', 'Периферия', EquipmentStatus.IN_USE, 285000, 'HR', 9],
    ['Ноутбук Lenovo V15', 'EQ-2026-033', 'LN-V15-33', 'Ноутбуки', EquipmentStatus.AVAILABLE, 260000, 'Склад', null],
    ['Монитор ViewSonic 27', 'EQ-2026-034', 'VS-27-34', 'Мониторы', EquipmentStatus.AVAILABLE, 112000, 'Склад', null],
    ['Коммутатор TP-Link JetStream', 'EQ-2026-035', 'TPL-JS-35', 'Сетевое оборудование', EquipmentStatus.AVAILABLE, 175000, 'Склад', null],
    ['Сканер Canon DR-C225', 'EQ-2026-036', 'CN-DR-36', 'Периферия', EquipmentStatus.IN_USE, 140000, 'Бухгалтерия', 1],
  ];

  const equipment = await Promise.all(
    equipmentSeed.map(([name, inventoryNumber, serialNumber, categoryName, status, price, locationName, holderIndex], index) =>
      prisma.equipment.create({
        data: {
          name: String(name),
          inventoryNumber: String(inventoryNumber),
          serialNumber: String(serialNumber),
          categoryId: categoryByName[String(categoryName)].id,
          status: status as EquipmentStatus,
          purchaseDate: daysAgo(120 + index * 7),
          purchasePrice: Number(price),
          warrantyUntil: daysFromNow(180 + index * 5),
          locationId: locationByName[String(locationName)]?.id,
          currentHolderId: holderIndex === null ? null : employees[Number(holderIndex)].id,
          description: `Demo asset: ${name}. Inventory card with lifecycle history for local defense demo.`,
        },
      })
    )
  );

  const issuanceData = [
    [0, 0, 35, 20, null, IssuanceStatus.ACTIVE],
    [1, 1, 62, -8, null, IssuanceStatus.OVERDUE],
    [5, 2, 25, 45, null, IssuanceStatus.ACTIVE],
    [6, 1, 18, 36, null, IssuanceStatus.ACTIVE],
    [11, 3, 44, 14, null, IssuanceStatus.OVERDUE],
    [20, 0, 34, 60, null, IssuanceStatus.ACTIVE],
    [21, 0, 34, 60, null, IssuanceStatus.ACTIVE],
    [23, 7, 12, 40, null, IssuanceStatus.ACTIVE],
    [26, 8, 30, 15, null, IssuanceStatus.OVERDUE],
    [27, 6, 15, 50, null, IssuanceStatus.ACTIVE],
    [30, 5, 10, 20, null, IssuanceStatus.ACTIVE],
    [31, 9, 9, 25, null, IssuanceStatus.ACTIVE],
    [35, 1, 8, 30, null, IssuanceStatus.ACTIVE],
    [22, 4, 90, 20, 55, IssuanceStatus.RETURNED],
    [24, 5, 75, 10, 71, IssuanceStatus.RETURNED],
    [8, 2, 70, 18, 42, IssuanceStatus.RETURNED],
  ];

  await Promise.all(
    issuanceData.map(([equipmentIndex, employeeIndex, issuedAgo, expectedIn, returnedAgo, status]) =>
      prisma.issuance.create({
        data: {
          equipmentId: equipment[Number(equipmentIndex)].id,
          employeeId: employees[Number(employeeIndex)].id,
          issuedById: manager.id,
          issuedAt: daysAgo(Number(issuedAgo)),
          expectedReturnAt: daysFromNow(Number(expectedIn)),
          returnedAt: returnedAgo === null ? null : daysAgo(Number(returnedAgo)),
          returnComment: returnedAgo === null ? null : 'Возврат после планового использования',
          status: status as IssuanceStatus,
        },
      })
    )
  );

  await Promise.all([
    prisma.repairTicket.create({
      data: {
        equipmentId: equipment[3].id,
        createdById: manager.id,
        assignedToId: admin.id,
        status: RepairStatus.IN_PROGRESS,
        priority: RepairPriority.HIGH,
        reason: 'Периодически выключается при нагрузке',
        diagnosis: 'Предварительно: перегрев и деградация аккумулятора',
        cost: 45000,
        createdAt: daysAgo(6),
      },
    }),
    prisma.repairTicket.create({
      data: {
        equipmentId: equipment[10].id,
        createdById: manager.id,
        status: RepairStatus.OPEN,
        priority: RepairPriority.CRITICAL,
        reason: 'Ошибка узла печати, недоступен для бухгалтерии',
        cost: 68000,
        createdAt: daysAgo(2),
      },
    }),
    prisma.repairTicket.create({
      data: {
        equipmentId: equipment[18].id,
        createdById: admin.id,
        assignedToId: admin.id,
        status: RepairStatus.IN_PROGRESS,
        priority: RepairPriority.MEDIUM,
        reason: 'ИБП не держит нагрузку после отключения питания',
        diagnosis: 'Необходима замена батарейного блока',
        cost: 82000,
        createdAt: daysAgo(9),
      },
    }),
    prisma.repairTicket.create({
      data: {
        equipmentId: equipment[7].id,
        createdById: admin.id,
        status: RepairStatus.DONE,
        priority: RepairPriority.LOW,
        reason: 'Проверка изображения перед повторной выдачей',
        diagnosis: 'Дефектов не найдено',
        result: 'Возвращено на склад',
        cost: 0,
        createdAt: daysAgo(24),
        completedAt: daysAgo(22),
      },
    }),
  ]);

  const inventoryCheck = await prisma.inventoryCheck.create({
    data: {
      title: 'Плановая инвентаризация май 2026',
      status: InventoryCheckStatus.IN_PROGRESS,
      startedAt: daysAgo(3),
      createdById: manager.id,
    },
  });

  await Promise.all(
    equipment.slice(0, 18).map((item, index) =>
      prisma.inventoryCheckItem.create({
        data: {
          inventoryCheckId: inventoryCheck.id,
          equipmentId: item.id,
          expectedLocationId: item.locationId,
          actualLocationId: index === 4 ? null : item.locationId,
          status:
            index === 4
              ? InventoryItemStatus.MISSING
              : index === 10
                ? InventoryItemStatus.DAMAGED
                : index === 13
                  ? InventoryItemStatus.MOVED
                  : InventoryItemStatus.FOUND,
          comment:
            index === 4
              ? 'Оборудование отмечено как потерянное'
              : index === 10
                ? 'Требуется ремонт узла печати'
                : index === 13
                  ? 'Фактически находится в серверной'
                  : null,
        },
      })
    )
  );

  await prisma.auditLog.createMany({
    data: [
      { userId: admin.id, action: 'auth.login', entityType: 'User', entityId: String(admin.id), metadata: { role: 'ADMIN' }, createdAt: daysAgo(1) },
      { userId: manager.id, action: 'equipment.create', entityType: 'Equipment', entityId: String(equipment[0].id), metadata: { inventoryNumber: equipment[0].inventoryNumber }, createdAt: daysAgo(20) },
      { userId: manager.id, action: 'issuance.create', entityType: 'Issuance', entityId: '1', metadata: { equipment: equipment[0].inventoryNumber, employee: employees[0].fullName }, createdAt: daysAgo(18) },
      { userId: manager.id, action: 'issuance.return', entityType: 'Issuance', entityId: '14', metadata: { comment: 'Возврат после планового использования' }, createdAt: daysAgo(12) },
      { userId: admin.id, action: 'repair.create', entityType: 'RepairTicket', entityId: '1', metadata: { priority: 'HIGH' }, createdAt: daysAgo(6) },
      { userId: manager.id, action: 'inventory.start', entityType: 'InventoryCheck', entityId: String(inventoryCheck.id), metadata: { title: inventoryCheck.title }, createdAt: daysAgo(3) },
      { userId: auditor.id, action: 'report.export', entityType: 'Report', entityId: 'equipment.csv', metadata: { format: 'csv' }, createdAt: daysAgo(1) },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { userId: admin.id, title: 'Критичный ремонт', message: 'МФУ Canon imageRUNNER требует ремонта узла печати.', type: NotificationType.ERROR, createdAt: daysAgo(2) },
      { userId: manager.id, title: 'Просроченные выдачи', message: 'Найдено 3 просроченные выдачи оборудования.', type: NotificationType.WARNING, createdAt: daysAgo(1) },
      { userId: inventoryManager.id, title: 'Инвентаризация доступна', message: 'Вы можете создавать проверки и отмечать состояние оборудования.', type: NotificationType.INFO, createdAt: daysAgo(2) },
      { userId: manager.id, title: 'Инвентаризация в работе', message: 'Плановая инвентаризация май 2026 ожидает завершения.', type: NotificationType.INFO, createdAt: daysAgo(3) },
      { userId: employeeUser.id, title: 'Оборудование закреплено', message: 'За вами закреплено demo-оборудование для просмотра в системе.', type: NotificationType.SUCCESS, createdAt: daysAgo(4) },
      { userId: auditor.id, title: 'Доступ к журналу аудита', message: 'Вы можете просматривать отчёты и историю действий.', type: NotificationType.INFO, createdAt: daysAgo(5) },
      { userId: viewer.id, title: 'Режим просмотра', message: 'Вы можете просматривать данные без изменения записей.', type: NotificationType.INFO, createdAt: daysAgo(5) },
    ],
  });

  console.log(`Seed completed: ${users.length} users, ${equipment.length} equipment units, ${employees.length} employees.`);
}

main()
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
