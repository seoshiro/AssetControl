-- AssetControl finance and repair pickup extension
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'REPAIR_COORDINATOR';

CREATE TYPE "FinancialStatus" AS ENUM ('NORMAL', 'DEPRECIATED', 'EXPENSIVE_MAINTENANCE', 'WRITTEN_OFF');
CREATE TYPE "PaymentType" AS ENUM ('PURCHASE', 'REPAIR', 'SERVICE', 'RENT', 'COMPENSATION', 'OTHER');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'INVOICE', 'INTERNAL_ACCOUNT');
CREATE TYPE "RepairPickupStatus" AS ENUM ('PENDING', 'NOTIFIED', 'IN_PROGRESS', 'PICKED_UP', 'DELIVERED', 'CANCELLED');

ALTER TABLE "equipment"
  ADD COLUMN "current_value" DECIMAL(12, 2),
  ADD COLUMN "depreciation_percent" DECIMAL(5, 2),
  ADD COLUMN "residual_value" DECIMAL(12, 2),
  ADD COLUMN "service_cost_total" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "financial_status" "FinancialStatus" NOT NULL DEFAULT 'NORMAL';

UPDATE "equipment"
SET
  "current_value" = COALESCE("purchase_price", 0),
  "residual_value" = COALESCE("purchase_price", 0),
  "depreciation_percent" = 0
WHERE "current_value" IS NULL;

ALTER TABLE "repair_tickets"
  ADD COLUMN "pickup_location_id" INTEGER,
  ADD COLUMN "destination_location_id" INTEGER,
  ADD COLUMN "assigned_coordinator_id" INTEGER,
  ADD COLUMN "pickup_status" "RepairPickupStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "pickup_comment" TEXT,
  ADD COLUMN "pickup_due_date" TIMESTAMP(3),
  ADD COLUMN "delivered_at" TIMESTAMP(3);

CREATE TABLE "equipment_financial_operations" (
  "id" SERIAL NOT NULL,
  "equipment_id" INTEGER NOT NULL,
  "type" "PaymentType" NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "operation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "comment" TEXT,
  "created_by_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "equipment_financial_operations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "equipment_financial_operations_equipment_id_idx" ON "equipment_financial_operations"("equipment_id");
CREATE INDEX "equipment_financial_operations_type_idx" ON "equipment_financial_operations"("type");
CREATE INDEX "equipment_financial_operations_method_idx" ON "equipment_financial_operations"("method");
CREATE INDEX "repair_tickets_pickup_status_idx" ON "repair_tickets"("pickup_status");
CREATE INDEX "repair_tickets_assigned_coordinator_id_idx" ON "repair_tickets"("assigned_coordinator_id");

ALTER TABLE "equipment_financial_operations"
  ADD CONSTRAINT "equipment_financial_operations_equipment_id_fkey"
  FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "equipment_financial_operations"
  ADD CONSTRAINT "equipment_financial_operations_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "repair_tickets"
  ADD CONSTRAINT "repair_tickets_pickup_location_id_fkey"
  FOREIGN KEY ("pickup_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "repair_tickets"
  ADD CONSTRAINT "repair_tickets_destination_location_id_fkey"
  FOREIGN KEY ("destination_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "repair_tickets"
  ADD CONSTRAINT "repair_tickets_assigned_coordinator_id_fkey"
  FOREIGN KEY ("assigned_coordinator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
