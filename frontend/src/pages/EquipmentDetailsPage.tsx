import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CalendarBlank, ClipboardText, CurrencyCircleDollar, MapPin, Toolbox, UserCircle } from '@phosphor-icons/react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { ContentCard, PageContainer, ScrollArea } from '../components/PageLayout';
import { formatDate, formatDateTime, formatMoney } from '../i18n/format';

export default function EquipmentDetailsPage() {
  const { id } = useParams();
  const [item, setItem] = useState<any>(null);
  const { canManage, canViewFinance } = useAuth();
  const { t } = useTranslation();

  const fetchItem = () => {
    api.get(`/equipment/${id}`).then((res) => setItem(res.data));
  };

  useEffect(() => {
    fetchItem();
  }, [id]);

  const equipmentAction = async (path: string, message: string) => {
    if (!confirm(message)) return;
    await api.post(`/equipment/${id}/${path}`);
    fetchItem();
  };

  if (!item) return <PageContainer><ContentCard>{t('equipment.loadingCard')}</ContentCard></PageContainer>;

  return (
    <PageContainer>
      <Link to="/equipment" className="inline-flex items-center gap-2 text-sm font-bold text-surface-600 hover:text-surface-950">
        <ArrowLeft className="h-4 w-4" weight="regular" /> {t('equipment.backToRegistry')}
      </Link>

      <div className="grid min-h-0 min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <ContentCard>
          <div className="flex min-w-0 items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="page-title truncate">{item.name}</h1>
              <p className="mt-1 truncate font-mono text-sm text-surface-500">{item.inventoryNumber} · {item.serialNumber || t('equipment.noSerialFull')}</p>
            </div>
            <StatusBadge status={item.status} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
            <div className="rounded-md border border-surface-200 bg-surface-200/40 p-3"><p className="text-xs text-surface-500">{t('equipment.category')}</p><p className="font-bold">{item.category?.name}</p></div>
            <div className="rounded-md border border-surface-200 bg-surface-200/40 p-3"><p className="text-xs text-surface-500">{t('equipment.priceKzt')}</p><p className="font-bold">{formatMoney(item.purchasePrice)}</p></div>
            <div className="rounded-md border border-surface-200 bg-surface-200/40 p-3"><p className="text-xs text-surface-500">{t('equipment.warranty')}</p><p className="font-bold">{formatDate(item.warrantyUntil)}</p></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-sm">
            <div className="flex gap-2"><MapPin className="h-4 w-4 text-surface-400" weight="regular" /> {item.location?.name || t('equipment.locationNotSpecified')}</div>
            <div className="flex gap-2"><UserCircle className="h-4 w-4 text-surface-400" weight="regular" /> {item.currentHolder?.fullName || t('common.notAttached')}</div>
            <div className="flex gap-2"><CalendarBlank className="h-4 w-4 text-surface-400" weight="regular" /> {formatDate(item.purchaseDate)}</div>
          </div>

          {item.description && <p className="mt-5 max-w-3xl break-words text-sm text-surface-600">{item.description}</p>}
        </ContentCard>

        <ContentCard>
          <h2 className="font-extrabold mb-3">{t('equipment.actionsControl')}</h2>
          <div className="space-y-2 text-sm">
            <Link to={`/issuances?equipmentId=${item.id}`} className="btn-secondary w-full justify-start">
              <ClipboardText className="h-4 w-4" weight="regular" /> {t('equipment.openIssuances')}
            </Link>
            <Link to={`/repairs?equipmentId=${item.id}`} className="btn-secondary w-full justify-start">
              <Toolbox className="h-4 w-4" weight="regular" /> {t('equipment.createRepair')}
            </Link>
            <Link to="/inventory-checks" className="btn-secondary w-full justify-start">
              <ClipboardText className="h-4 w-4" weight="regular" /> {t('nav.inventory')}
            </Link>
            {canViewFinance && (
              <Link to={`/finance?equipmentId=${item.id}`} className="btn-secondary w-full justify-start">
                <CurrencyCircleDollar className="h-4 w-4" weight="regular" /> {t('equipment.assetFinance')}
              </Link>
            )}
            {canManage && (
              <>
                <button className="btn-secondary w-full justify-start" onClick={() => equipmentAction('write-off', t('equipment.writeOffConfirm'))}>
                  {t('equipment.writeOff')}
                </button>
                <button className="btn-danger w-full justify-start" onClick={() => equipmentAction('mark-lost', t('equipment.markLostConfirm'))}>
                  {t('equipment.markLost')}
                </button>
              </>
            )}
          </div>
          <div className="mt-4 rounded-md border border-surface-200 bg-surface-200/40 p-3">
            <p className="text-xs font-bold text-surface-500 uppercase">{t('equipment.controlCard')}</p>
            <p className="text-sm text-surface-600 mt-1">{t('equipment.controlCardText')}</p>
          </div>
        </ContentCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {canViewFinance && (
          <ContentCard>
            <h2 className="text-lg font-extrabold mb-4">{t('equipment.assetFinance')}</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-surface-200 bg-surface-200/40 p-3"><p className="text-xs text-surface-500">{t('equipment.currentValue')}</p><p className="font-bold">{formatMoney(item.currentValue)}</p></div>
              <div className="rounded-md border border-surface-200 bg-surface-200/40 p-3"><p className="text-xs text-surface-500">{t('finance.residualValue')}</p><p className="font-bold">{formatMoney(item.residualValue)}</p></div>
              <div className="rounded-md border border-surface-200 bg-surface-200/40 p-3"><p className="text-xs text-surface-500">{t('equipment.depreciation')}</p><p className="font-bold">{Number(item.depreciationPercent || 0).toFixed(0)}%</p></div>
              <div className="rounded-md border border-surface-200 bg-surface-200/40 p-3"><p className="text-xs text-surface-500">{t('equipment.serviceCosts')}</p><p className="font-bold">{formatMoney(item.serviceCostTotal)}</p></div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-surface-500">{t('equipment.financialStatus')}</span>
              <StatusBadge status={item.financialStatus || 'NORMAL'} />
            </div>
            {item.financialOperationsHidden ? (
              <p className="mt-3 text-xs text-surface-500">{t('equipment.financeHidden')}</p>
            ) : item.financialOperations?.length ? (
              <ScrollArea className="mt-3 max-h-[220px] space-y-2">
                {item.financialOperations.map((operation: any) => (
                  <div key={operation.id} className="rounded-md border border-surface-200 px-3 py-2">
                    <div className="flex items-center justify-between gap-2"><StatusBadge status={operation.type} /><b className="text-sm">{formatMoney(operation.amount)}</b></div>
                    <p className="mt-1 text-xs text-surface-500">{operation.method} · {formatDate(operation.operationDate)}</p>
                  </div>
                ))}
              </ScrollArea>
            ) : (
              <p className="mt-3 text-xs text-surface-500">{t('equipment.noFinancialOperations')}</p>
            )}
          </ContentCard>
        )}

        <ContentCard>
          <h2 className="text-lg font-extrabold mb-4">{t('equipment.issuanceHistory')}</h2>
          <ScrollArea className="max-h-[420px] space-y-2">
            {item.issuances?.map((row: any) => (
              <div key={row.id} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-surface-200 px-3 py-2">
                <div className="min-w-0"><p className="truncate text-sm font-bold">{row.employee.fullName}</p><p className="truncate text-xs text-surface-500">{formatDate(row.issuedAt)} → {row.returnedAt ? formatDate(row.returnedAt) : t('common.active')}</p></div>
                <StatusBadge status={row.status} />
              </div>
            ))}
          </ScrollArea>
        </ContentCard>

        <ContentCard>
          <h2 className="text-lg font-extrabold mb-4">{t('equipment.repairs')}</h2>
          <ScrollArea className="max-h-[420px] space-y-2">
            {item.repairs?.map((row: any) => (
              <div key={row.id} className="rounded-md border border-surface-200 px-3 py-2">
                <div className="flex min-w-0 justify-between gap-3"><p className="min-w-0 truncate text-sm font-bold">{row.reason}</p><StatusBadge status={row.status} /></div>
                <p className="mt-1 break-words text-xs text-surface-500">{t(`status.${row.priority}`, { defaultValue: row.priority })} · {row.result || row.diagnosis || t('equipment.diagnosticsPending')}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-surface-500">
                  <span>{t('equipment.pickup')}</span>
                  <StatusBadge status={row.pickupStatus || 'PENDING'} />
                  <span className="truncate">{t('equipment.coordinator')} {row.assignedCoordinator?.username || t('common.notAssigned')}</span>
                </div>
              </div>
            ))}
          </ScrollArea>
        </ContentCard>
      </div>

      <ContentCard>
        <h2 className="text-lg font-extrabold mb-4">{t('equipment.equipmentAuditLog')}</h2>
        <ScrollArea className="max-h-[460px] space-y-2">
          {item.auditLogs?.map((row: any) => (
            <div key={row.id} className="flex min-w-0 flex-col gap-1 rounded-md border border-surface-200 bg-surface-200/40 px-3 py-2 text-sm sm:flex-row sm:justify-between">
              <span className="truncate font-bold">{row.action}</span>
              <span className="truncate text-surface-500">{row.user?.username || t('common.system')} · {formatDateTime(row.createdAt)}</span>
            </div>
          ))}
        </ScrollArea>
      </ContentCard>
    </PageContainer>
  );
}
