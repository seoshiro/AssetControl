import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarBlank, ClipboardText, CurrencyCircleDollar, MapPin, Toolbox, UserCircle } from '@phosphor-icons/react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { ContentCard, PageContainer, ScrollArea } from '../components/PageLayout';

export default function EquipmentDetailsPage() {
  const { id } = useParams();
  const [item, setItem] = useState<any>(null);
  const { canManage, canViewFinance } = useAuth();

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

  if (!item) return <PageContainer><ContentCard>Загрузка карточки оборудования...</ContentCard></PageContainer>;

  return (
    <PageContainer>
      <Link to="/equipment" className="inline-flex items-center gap-2 text-sm font-bold text-surface-600 hover:text-surface-950">
        <ArrowLeft className="h-4 w-4" weight="regular" /> Назад к реестру
      </Link>

      <div className="grid min-h-0 min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <ContentCard>
          <div className="flex min-w-0 items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="page-title truncate">{item.name}</h1>
              <p className="mt-1 truncate font-mono text-sm text-surface-500">{item.inventoryNumber} · {item.serialNumber || 'без серийного номера'}</p>
            </div>
            <StatusBadge status={item.status} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
            <div className="rounded-md border border-surface-200 bg-surface-200/40 p-3"><p className="text-xs text-surface-500">Категория</p><p className="font-bold">{item.category?.name}</p></div>
            <div className="rounded-md border border-surface-200 bg-surface-200/40 p-3"><p className="text-xs text-surface-500">Стоимость</p><p className="font-bold">{Number(item.purchasePrice || 0).toLocaleString('ru-RU')} ₸</p></div>
            <div className="rounded-md border border-surface-200 bg-surface-200/40 p-3"><p className="text-xs text-surface-500">Гарантия</p><p className="font-bold">{item.warrantyUntil ? new Date(item.warrantyUntil).toLocaleDateString('ru-RU') : 'Не указана'}</p></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-sm">
            <div className="flex gap-2"><MapPin className="h-4 w-4 text-surface-400" weight="regular" /> {item.location?.name || 'Локация не указана'}</div>
            <div className="flex gap-2"><UserCircle className="h-4 w-4 text-surface-400" weight="regular" /> {item.currentHolder?.fullName || 'Не закреплено'}</div>
            <div className="flex gap-2"><CalendarBlank className="h-4 w-4 text-surface-400" weight="regular" /> {new Date(item.purchaseDate).toLocaleDateString('ru-RU')}</div>
          </div>

          {item.description && <p className="mt-5 max-w-3xl break-words text-sm text-surface-600">{item.description}</p>}
        </ContentCard>

        <ContentCard>
          <h2 className="font-extrabold mb-3">Действия и контроль</h2>
          <div className="space-y-2 text-sm">
            <Link to={`/issuances?equipmentId=${item.id}`} className="btn-secondary w-full justify-start">
              <ClipboardText className="h-4 w-4" weight="regular" /> Открыть выдачи
            </Link>
            <Link to={`/repairs?equipmentId=${item.id}`} className="btn-secondary w-full justify-start">
              <Toolbox className="h-4 w-4" weight="regular" /> Создать ремонт
            </Link>
            <Link to="/inventory-checks" className="btn-secondary w-full justify-start">
              <ClipboardText className="h-4 w-4" weight="regular" /> Инвентаризация
            </Link>
            {canViewFinance && (
              <Link to={`/finance?equipmentId=${item.id}`} className="btn-secondary w-full justify-start">
                <CurrencyCircleDollar className="h-4 w-4" weight="regular" /> Финансы актива
              </Link>
            )}
            {canManage && (
              <>
                <button className="btn-secondary w-full justify-start" onClick={() => equipmentAction('write-off', 'Списать оборудование?')}>
                  Списать оборудование
                </button>
                <button className="btn-danger w-full justify-start" onClick={() => equipmentAction('mark-lost', 'Отметить оборудование как потерянное?')}>
                  Отметить потерянным
                </button>
              </>
            )}
          </div>
          <div className="mt-4 rounded-md border border-surface-200 bg-surface-200/40 p-3">
            <p className="text-xs font-bold text-surface-500 uppercase">Контрольная карточка</p>
            <p className="text-sm text-surface-600 mt-1">Основной локальный сценарий: владелец, локация, выдачи, ремонты и audit log.</p>
          </div>
        </ContentCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {canViewFinance && (
          <ContentCard>
            <h2 className="text-lg font-extrabold mb-4">Финансы актива</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-surface-200 bg-surface-200/40 p-3"><p className="text-xs text-surface-500">Текущая стоимость</p><p className="font-bold">{Number(item.currentValue || 0).toLocaleString('ru-RU')} ₸</p></div>
              <div className="rounded-md border border-surface-200 bg-surface-200/40 p-3"><p className="text-xs text-surface-500">Остаточная стоимость</p><p className="font-bold">{Number(item.residualValue || 0).toLocaleString('ru-RU')} ₸</p></div>
              <div className="rounded-md border border-surface-200 bg-surface-200/40 p-3"><p className="text-xs text-surface-500">Износ</p><p className="font-bold">{Number(item.depreciationPercent || 0).toFixed(0)}%</p></div>
              <div className="rounded-md border border-surface-200 bg-surface-200/40 p-3"><p className="text-xs text-surface-500">Сервисные затраты</p><p className="font-bold">{Number(item.serviceCostTotal || 0).toLocaleString('ru-RU')} ₸</p></div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-surface-500">Финансовый статус:</span>
              <StatusBadge status={item.financialStatus || 'NORMAL'} />
            </div>
            {item.financialOperationsHidden ? (
              <p className="mt-3 text-xs text-surface-500">Детальные операции скрыты для этой роли, доступна только сводка.</p>
            ) : item.financialOperations?.length ? (
              <ScrollArea className="mt-3 max-h-[220px] space-y-2">
                {item.financialOperations.map((operation: any) => (
                  <div key={operation.id} className="rounded-md border border-surface-200 px-3 py-2">
                    <div className="flex items-center justify-between gap-2"><StatusBadge status={operation.type} /><b className="text-sm">{Number(operation.amount || 0).toLocaleString('ru-RU')} ₸</b></div>
                    <p className="mt-1 text-xs text-surface-500">{operation.method} · {new Date(operation.operationDate).toLocaleDateString('ru-RU')}</p>
                  </div>
                ))}
              </ScrollArea>
            ) : (
              <p className="mt-3 text-xs text-surface-500">Финансовых операций пока нет.</p>
            )}
          </ContentCard>
        )}

        <ContentCard>
          <h2 className="text-lg font-extrabold mb-4">История выдач</h2>
          <ScrollArea className="max-h-[420px] space-y-2">
            {item.issuances?.map((row: any) => (
              <div key={row.id} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-surface-200 px-3 py-2">
                <div className="min-w-0"><p className="truncate text-sm font-bold">{row.employee.fullName}</p><p className="truncate text-xs text-surface-500">{new Date(row.issuedAt).toLocaleDateString('ru-RU')} → {row.returnedAt ? new Date(row.returnedAt).toLocaleDateString('ru-RU') : 'активно'}</p></div>
                <StatusBadge status={row.status} />
              </div>
            ))}
          </ScrollArea>
        </ContentCard>

        <ContentCard>
          <h2 className="text-lg font-extrabold mb-4">Ремонты</h2>
          <ScrollArea className="max-h-[420px] space-y-2">
            {item.repairs?.map((row: any) => (
              <div key={row.id} className="rounded-md border border-surface-200 px-3 py-2">
                <div className="flex min-w-0 justify-between gap-3"><p className="min-w-0 truncate text-sm font-bold">{row.reason}</p><StatusBadge status={row.status} /></div>
                <p className="mt-1 break-words text-xs text-surface-500">{row.priority} · {row.result || row.diagnosis || 'Диагностика не завершена'}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-surface-500">
                  <span>Передача:</span>
                  <StatusBadge status={row.pickupStatus || 'PENDING'} />
                  <span className="truncate">координатор: {row.assignedCoordinator?.username || 'не назначен'}</span>
                </div>
              </div>
            ))}
          </ScrollArea>
        </ContentCard>
      </div>

      <ContentCard>
        <h2 className="text-lg font-extrabold mb-4">Audit log по оборудованию</h2>
        <ScrollArea className="max-h-[460px] space-y-2">
          {item.auditLogs?.map((row: any) => (
            <div key={row.id} className="flex min-w-0 flex-col gap-1 rounded-md border border-surface-200 bg-surface-200/40 px-3 py-2 text-sm sm:flex-row sm:justify-between">
              <span className="truncate font-bold">{row.action}</span>
              <span className="truncate text-surface-500">{row.user?.username || 'system'} · {new Date(row.createdAt).toLocaleString('ru-RU')}</span>
            </div>
          ))}
        </ScrollArea>
      </ContentCard>
    </PageContainer>
  );
}
