import { FinancialStatus, PaymentType, Prisma } from '@prisma/client';

export function calculateDepreciationPercent(purchasePrice?: number | null, currentValue?: number | null) {
  const purchase = Number(purchasePrice || 0);
  const current = Number(currentValue || 0);
  if (purchase <= 0) return 0;
  const percent = ((purchase - current) / purchase) * 100;
  return Math.min(100, Math.max(0, Number(percent.toFixed(2))));
}

export function calculateFinancialStatus(input: {
  purchasePrice?: number | null;
  currentValue?: number | null;
  serviceCostTotal?: number | null;
  equipmentStatus?: string | null;
}) {
  const purchase = Number(input.purchasePrice || 0);
  const current = Number(input.currentValue || 0);
  const service = Number(input.serviceCostTotal || 0);
  const depreciation = calculateDepreciationPercent(purchase, current);

  if (input.equipmentStatus === 'WRITTEN_OFF') return FinancialStatus.WRITTEN_OFF;
  if (purchase > 0 && service / purchase >= 0.35) return FinancialStatus.EXPENSIVE_MAINTENANCE;
  if (depreciation >= 60) return FinancialStatus.DEPRECIATED;
  return FinancialStatus.NORMAL;
}

export function financialSnapshot(input: {
  purchasePrice?: number | null | Prisma.Decimal;
  currentValue?: number | null | Prisma.Decimal;
  serviceCostTotal?: number | null | Prisma.Decimal;
  equipmentStatus?: string | null;
}) {
  const purchasePrice = Number(input.purchasePrice || 0);
  const currentValue = Number(input.currentValue ?? input.purchasePrice ?? 0);
  const serviceCostTotal = Number(input.serviceCostTotal || 0);
  const depreciationPercent = calculateDepreciationPercent(purchasePrice, currentValue);
  const residualValue = currentValue;
  const financialStatus = calculateFinancialStatus({
    purchasePrice,
    currentValue,
    serviceCostTotal,
    equipmentStatus: input.equipmentStatus,
  });

  return { purchasePrice, currentValue, depreciationPercent, residualValue, serviceCostTotal, financialStatus };
}

export async function refreshEquipmentFinancials(
  tx: Pick<Prisma.TransactionClient, 'equipment' | 'equipmentFinancialOperation'>,
  equipmentId: number
) {
  const equipment = await tx.equipment.findUnique({ where: { id: equipmentId } });
  if (!equipment) return null;

  const serviceOps = await tx.equipmentFinancialOperation.findMany({
    where: { equipmentId, type: { in: [PaymentType.REPAIR, PaymentType.SERVICE] } },
    select: { amount: true },
  });
  const serviceCostTotal = serviceOps.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const snapshot = financialSnapshot({
    purchasePrice: equipment.purchasePrice,
    currentValue: equipment.currentValue ?? equipment.purchasePrice,
    serviceCostTotal,
    equipmentStatus: equipment.status,
  });

  return tx.equipment.update({
    where: { id: equipmentId },
    data: {
      currentValue: snapshot.currentValue,
      depreciationPercent: snapshot.depreciationPercent,
      residualValue: snapshot.residualValue,
      serviceCostTotal: snapshot.serviceCostTotal,
      financialStatus: snapshot.financialStatus,
    },
  });
}
