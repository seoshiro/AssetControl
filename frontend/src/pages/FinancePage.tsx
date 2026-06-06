import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CurrencyCircleDollar, Plus } from '@phosphor-icons/react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import { ContentCard, PageContainer, PageHeader, ScrollArea } from '../components/PageLayout';
import { EmptyState, ErrorState, StatCard } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const paymentTypes = ['PURCHASE', 'REPAIR', 'SERVICE', 'RENT', 'COMPENSATION', 'OTHER'];
const paymentMethods = ['CASH', 'CARD', 'BANK_TRANSFER', 'INVOICE', 'INTERNAL_ACCOUNT'];
const paymentTypeLabels: Record<string, string> = {
  PURCHASE: 'Покупка',
  REPAIR: 'Ремонт',
  SERVICE: 'Сервис',
  RENT: 'Аренда',
  COMPENSATION: 'Компенсация',
  OTHER: 'Прочее',
};
const paymentMethodLabels: Record<string, string> = {
  CASH: 'Наличные',
  CARD: 'Карта',
  BANK_TRANSFER: 'Банковский перевод',
  INVOICE: 'Счёт',
  INTERNAL_ACCOUNT: 'Внутренний счёт',
};

function money(value: unknown) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₸`;
}

function shortDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('ru-RU') : 'не указано';
}

export default function FinancePage() {
  const [params] = useSearchParams();
  const { canManageFinance } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: 'REPAIR',
    method: 'INVOICE',
    amount: '',
    operationDate: new Date().toISOString().slice(0, 10),
    comment: '',
  });

  const selectedEquipment = useMemo(
    () => equipment.find((item) => String(item.id) === selectedId),
    [equipment, selectedId]
  );

  const fetchSummary = async () => {
    const [summaryResponse, equipmentResponse] = await Promise.all([
      api.get('/finance/summary'),
      api.get('/equipment', { params: { limit: 100 } }),
    ]);
    setSummary(summaryResponse.data);
    setEquipment(equipmentResponse.data.data);
    const requestedEquipmentId = params.get('equipmentId');
    if (requestedEquipmentId) {
      setSelectedId(requestedEquipmentId);
    } else if (!selectedId && equipmentResponse.data.data[0]) {
      setSelectedId(String(equipmentResponse.data.data[0].id));
    }
  };

  const fetchDetails = async (id: string) => {
    if (!id) return;
    const response = await api.get(`/finance/equipment/${id}`);
    setDetails(response.data);
  };

  useEffect(() => {
    fetchSummary()
      .catch(() => setError('Не удалось загрузить финансовые данные.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchDetails(selectedId).catch(() => setError('Не удалось загрузить операции по оборудованию.'));
    }
  }, [selectedId]);

  const createOperation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId) return;
    setSaving(true);
    setError('');
    try {
      await api.post(`/finance/equipment/${selectedId}/operations`, {
        ...form,
        amount: Number(form.amount),
      });
      setForm({ ...form, amount: '', comment: '' });
      await fetchSummary();
      await fetchDetails(selectedId);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Не удалось добавить финансовую операцию.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <ContentCard>Загрузка финансового модуля...</ContentCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-5">
      <PageHeader
        title="Финансы оборудования"
        description="Балансовая стоимость, остаточная стоимость, износ и затраты на ремонт по активам."
        actions={
          <div className="hidden items-center gap-2 text-sm text-surface-500 md:flex">
            <CurrencyCircleDollar className="h-4 w-4" weight="regular" />
            Финансовый контроль активов
          </div>
        }
      />

      {error && <ErrorState message={error} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Покупная стоимость" value={money(summary?.totalPurchaseValue)} tone="blue" />
        <StatCard title="Остаточная стоимость" value={money(summary?.totalResidualValue)} tone="green" />
        <StatCard title="Ремонт и сервис" value={money(summary?.repairAndServiceCost)} tone="violet" />
        <StatCard title="Высокий износ" value={summary?.highDepreciationCount || 0} tone="red" />
        <StatCard title="Дорогой сервис" value={summary?.expensiveMaintenanceCount || 0} tone="red" />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <ContentCard className="self-start">
          <h2 className="mb-4 text-lg font-extrabold text-surface-950">Оборудование и финансовый статус</h2>
          <ScrollArea className="max-h-[520px]">
            <div className="space-y-2">
              {equipment.map((item) => (
                <button
                  key={item.id}
                  className={`w-full rounded-md border px-3 py-2 text-left transition ${
                    String(item.id) === selectedId
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-surface-200 bg-surface-50 hover:border-surface-300'
                  }`}
                  onClick={() => setSelectedId(String(item.id))}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-surface-950">{item.name}</p>
                      <p className="truncate font-mono text-xs text-surface-500">{item.inventoryNumber}</p>
                    </div>
                    <StatusBadge status={item.financialStatus || 'NORMAL'} />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-surface-500">
                    <span>Покупка: <b className="text-surface-900">{money(item.purchasePrice)}</b></span>
                    <span>Остаток: <b className="text-surface-900">{money(item.residualValue)}</b></span>
                    <span>Износ: <b className="text-surface-900">{Number(item.depreciationPercent || 0).toFixed(0)}%</b></span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </ContentCard>

        <ContentCard>
          <h2 className="mb-4 text-lg font-extrabold text-surface-950">Карточка актива</h2>
          {selectedEquipment ? (
            <div className="space-y-4">
              <div>
                <p className="font-bold text-surface-950">{selectedEquipment.name}</p>
                <p className="font-mono text-xs text-surface-500">{selectedEquipment.inventoryNumber}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border border-surface-200 bg-surface-200/40 p-3">
                  <p className="text-xs text-surface-500">Текущая стоимость</p>
                  <p className="font-bold">{money(details?.summary?.currentValue ?? selectedEquipment.currentValue)}</p>
                </div>
                <div className="rounded-md border border-surface-200 bg-surface-200/40 p-3">
                  <p className="text-xs text-surface-500">Сервис</p>
                  <p className="font-bold">{money(details?.summary?.serviceCostTotal ?? selectedEquipment.serviceCostTotal)}</p>
                </div>
              </div>

              {canManageFinance && (
                <form onSubmit={createOperation} className="space-y-3 rounded-md border border-surface-200 bg-surface-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-surface-500">Новая операция</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="finance-operation-type">Тип операции</label>
                      <select id="finance-operation-type" className="input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                        {paymentTypes.map((type) => <option key={type} value={type}>{paymentTypeLabels[type]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="finance-payment-method">Способ оплаты</label>
                      <select id="finance-payment-method" className="input" value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })}>
                        {paymentMethods.map((method) => <option key={method} value={method}>{paymentMethodLabels[method]}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="finance-operation-amount">Сумма</label>
                      <input id="finance-operation-amount" className="input" type="number" min="0" step="0.01" required placeholder="0.00" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
                    </div>
                    <div>
                      <label className="label" htmlFor="finance-operation-date">Дата операции</label>
                      <input id="finance-operation-date" className="input" type="date" value={form.operationDate} onChange={(event) => setForm({ ...form, operationDate: event.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="finance-operation-comment">Комментарий</label>
                    <input id="finance-operation-comment" className="input" placeholder="Например: диагностика или плановый сервис" value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} />
                  </div>
                  <button className="btn-primary w-full" disabled={saving}>
                    <Plus className="h-4 w-4" weight="regular" />
                    {saving ? 'Сохранение...' : 'Добавить операцию'}
                  </button>
                </form>
              )}

              <div>
                <h3 className="mb-2 text-sm font-bold text-surface-950">Последние операции</h3>
                {details?.detailsHidden ? (
                  <EmptyState title="Детализация скрыта" description="Для этой роли доступны только итоговые финансовые показатели." />
                ) : details?.operations?.length ? (
                  <div className="space-y-2">
                    {details.operations.map((operation: any) => (
                      <div key={operation.id} className="rounded-md border border-surface-200 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <StatusBadge status={operation.type} />
                          <b className="text-sm">{money(operation.amount)}</b>
                        </div>
                        <p className="mt-1 text-xs text-surface-500">
                          {operation.method} · {shortDate(operation.operationDate)} · {operation.createdBy?.username || 'system'}
                        </p>
                        {operation.comment && <p className="mt-1 break-words text-xs text-surface-600">{operation.comment}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="Операций пока нет" description="После покупки, ремонта или сервиса здесь появится история затрат." />
                )}
              </div>
            </div>
          ) : (
            <EmptyState title="Нет оборудования" description="Добавьте оборудование, чтобы увидеть финансовые показатели." />
          )}
        </ContentCard>
      </div>
    </PageContainer>
  );
}
