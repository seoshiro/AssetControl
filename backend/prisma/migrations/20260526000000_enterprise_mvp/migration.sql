DROP TABLE IF EXISTS "attachments" CASCADE;
DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS "audit_logs" CASCADE;
DROP TABLE IF EXISTS "inventory_check_items" CASCADE;
DROP TABLE IF EXISTS "inventory_checks" CASCADE;
DROP TABLE IF EXISTS "repair_tickets" CASCADE;
DROP TABLE IF EXISTS "issuances" CASCADE;
DROP TABLE IF EXISTS "equipment" CASCADE;
DROP TABLE IF EXISTS "employees" CASCADE;
DROP TABLE IF EXISTS "locations" CASCADE;
DROP TABLE IF EXISTS "departments" CASCADE;
DROP TABLE IF EXISTS "categories" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

DROP TYPE IF EXISTS "NotificationType" CASCADE;
DROP TYPE IF EXISTS "InventoryItemStatus" CASCADE;
DROP TYPE IF EXISTS "InventoryCheckStatus" CASCADE;
DROP TYPE IF EXISTS "RepairPriority" CASCADE;
DROP TYPE IF EXISTS "RepairStatus" CASCADE;
DROP TYPE IF EXISTS "IssuanceStatus" CASCADE;
DROP TYPE IF EXISTS "EquipmentStatus" CASCADE;
DROP TYPE IF EXISTS "Role" CASCADE;

CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'INVENTORY_MANAGER', 'EMPLOYEE', 'AUDITOR', 'VIEWER');
CREATE TYPE "EquipmentStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'REPAIR', 'RESERVED', 'WRITTEN_OFF', 'LOST');
CREATE TYPE "IssuanceStatus" AS ENUM ('ACTIVE', 'RETURNED', 'OVERDUE');
CREATE TYPE "RepairStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');
CREATE TYPE "RepairPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "InventoryCheckStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "InventoryItemStatus" AS ENUM ('FOUND', 'MISSING', 'MOVED', 'DAMAGED');
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'ERROR');

CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "email" TEXT UNIQUE,
  "password_hash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "categories" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "description" TEXT
);

CREATE TABLE "departments" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "description" TEXT
);

CREATE TABLE "locations" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "room" TEXT,
  "floor" TEXT,
  "description" TEXT,
  CONSTRAINT "locations_name_room_key" UNIQUE ("name", "room")
);

CREATE TABLE "employees" (
  "id" SERIAL PRIMARY KEY,
  "full_name" TEXT NOT NULL,
  "department_id" INTEGER NOT NULL REFERENCES "departments"("id"),
  "position" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "equipment" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "inventory_number" TEXT NOT NULL UNIQUE,
  "serial_number" TEXT,
  "category_id" INTEGER NOT NULL REFERENCES "categories"("id"),
  "status" "EquipmentStatus" NOT NULL DEFAULT 'AVAILABLE',
  "purchase_date" TIMESTAMP(3) NOT NULL,
  "purchase_price" DECIMAL(12,2),
  "warranty_until" TIMESTAMP(3),
  "location_id" INTEGER REFERENCES "locations"("id"),
  "current_holder_id" INTEGER REFERENCES "employees"("id"),
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "issuances" (
  "id" SERIAL PRIMARY KEY,
  "equipment_id" INTEGER NOT NULL REFERENCES "equipment"("id"),
  "employee_id" INTEGER NOT NULL REFERENCES "employees"("id"),
  "issued_by_id" INTEGER REFERENCES "users"("id"),
  "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expected_return_at" TIMESTAMP(3),
  "returned_at" TIMESTAMP(3),
  "return_comment" TEXT,
  "status" "IssuanceStatus" NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE "repair_tickets" (
  "id" SERIAL PRIMARY KEY,
  "equipment_id" INTEGER NOT NULL REFERENCES "equipment"("id"),
  "created_by_id" INTEGER REFERENCES "users"("id"),
  "assigned_to_id" INTEGER REFERENCES "users"("id"),
  "status" "RepairStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "RepairPriority" NOT NULL DEFAULT 'MEDIUM',
  "reason" TEXT NOT NULL,
  "diagnosis" TEXT,
  "result" TEXT,
  "cost" DECIMAL(12,2),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3)
);

CREATE TABLE "inventory_checks" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "status" "InventoryCheckStatus" NOT NULL DEFAULT 'PLANNED',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "created_by_id" INTEGER REFERENCES "users"("id")
);

CREATE TABLE "inventory_check_items" (
  "id" SERIAL PRIMARY KEY,
  "inventory_check_id" INTEGER NOT NULL REFERENCES "inventory_checks"("id") ON DELETE CASCADE,
  "equipment_id" INTEGER NOT NULL REFERENCES "equipment"("id"),
  "expected_location_id" INTEGER REFERENCES "locations"("id"),
  "actual_location_id" INTEGER REFERENCES "locations"("id"),
  "status" "InventoryItemStatus" NOT NULL DEFAULT 'FOUND',
  "comment" TEXT,
  CONSTRAINT "inventory_check_items_check_equipment_key" UNIQUE ("inventory_check_id", "equipment_id")
);

CREATE TABLE "audit_logs" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER REFERENCES "users"("id"),
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT,
  "metadata" JSONB,
  "ip" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "notifications" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL DEFAULT 'INFO',
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "attachments" (
  "id" SERIAL PRIMARY KEY,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_path" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "uploaded_by_id" INTEGER REFERENCES "users"("id"),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "equipment_status_idx" ON "equipment"("status");
CREATE INDEX "equipment_category_id_idx" ON "equipment"("category_id");
CREATE INDEX "equipment_location_id_idx" ON "equipment"("location_id");
CREATE INDEX "issuances_status_idx" ON "issuances"("status");
CREATE INDEX "issuances_employee_id_idx" ON "issuances"("employee_id");
CREATE INDEX "issuances_equipment_id_idx" ON "issuances"("equipment_id");
CREATE INDEX "repair_tickets_status_idx" ON "repair_tickets"("status");
CREATE INDEX "repair_tickets_priority_idx" ON "repair_tickets"("priority");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");
CREATE INDEX "attachments_entity_type_entity_id_idx" ON "attachments"("entity_type", "entity_id");
