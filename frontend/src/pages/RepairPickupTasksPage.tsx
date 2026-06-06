import { useEffect, useState } from 'react';
import { Truck } from '@phosphor-icons/react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import { ContentCard, PageContainer, PageHeader, ScrollArea } from '../components/PageLayout';
import { EmptyState, ErrorState, StatCard } from '../components/ui';
import { useAuth } from '../context/AuthContext';

function shortDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('ru-RU') : 'не указано';
}

function isOverdue(task: any) {
  return task.pickupDueDate && !['DELIVERED', 'CANCELLED'].includes(task.pickupStatus) && new Date(task.pickupDueDate) < new Date();
}

export default function RepairPickupTasksPage() {
  const { user, canManage, isRepairCoordinator } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [statusDialog, setStatusDialog] = useState<{ task: any; status: string; title: string } | null>(null);
  const [statusComment, setStatusComment] = useState('');

  const fetchTasks = async () => {
    const response = await api.get('/repair-pickups');
    setTasks(response.data.data);
  };

  useEffect(() => {
    fetchTasks()
      .catch(() => setError('Не удалось загрузить задачи передачи в ремонт.'))
      .finally(() => setLoading(false));
  }, []);

  const openStatusDialog = (task: any, status: string, title: string) => {
    setStatusDialog({ task, status, title });
    setStatusComment(status === 'DELIVERED' ? 'Оборудование доставлено в ремонт' : task.pickupComment || '');
  };

  const submitStatusChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!statusDialog) return;
    const { task, status } = statusDialog;
    const comment = statusComment.trim() || undefined;
    setBusyId(task.id);
    setError('');
    try {
      await api.put(`/repair-pickups/${task.id}/status`, { status, comment });
      setStatusDialog(null);
      setStatusComment('');
      await fetchTasks();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Не удалось изменить статус задачи.');
    } finally {
      setBusyId(null);
    }
  };

  const canAct = (task: any) => canManage || (isRepairCoordinator && task.assignedCoordinator?.id === user?.id);
  const pendingCount = tasks.filter((task) => ['PENDING', 'NOTIFIED'].includes(task.pickupStatus)).length;
  const inProgressCount = tasks.filter((task) => ['IN_PROGRESS', 'PICKED_UP'].includes(task.pickupStatus)).length;
  const deliveredCount = tasks.filter((task) => task.pickupStatus === 'DELIVERED').length;
  const overdueCount = tasks.filter(isOverdue).length;

  if (loading) {
    return (
      <PageContainer>
        <ContentCard>Загрузка задач ремонта...</ContentCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-5">
      <PageHeader
        title={isRepairCoordinator ? 'Мои задачи ремонта' : 'Передача оборудования в ремонт'}
        description="Контроль того, кто забирает оборудование, куда его нужно доставить и выполнена ли передача."
        actions={
          <div className="hidden items-center gap-2 text-sm text-surface-500 md:flex">
            <Truck className="h-4 w-4" weight="regular" />
            Repair pickup workflow
          </div>
        }
      />

      {error && <ErrorState message={error} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Ожидают" value={pendingCount} tone="slate" />
        <StatCard title="В работе" value={inProgressCount} tone="violet" />
        <StatCard title="Доставлено" value={deliveredCount} tone="green" />
        <StatCard title="Просрочено" value={overdueCount} tone="red" />
      </div>

      <ContentCard>
        <ScrollArea className="max-h-[70vh]">
          {tasks.length === 0 ? (
            <EmptyState title="Задач нет" description="Назначьте координатора в ремонтной заявке, и задача появится здесь." />
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {tasks.map((task) => (
                <article key={task.id} className="rounded-lg border border-surface-200 bg-surface-50 p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-extrabold text-surface-950">{task.equipment?.name}</h2>
                      <p className="truncate font-mono text-xs text-surface-500">{task.equipment?.inventoryNumber}</p>
                    </div>
                    <StatusBadge status={task.pickupStatus} />
                  </div>

                  <p className="mt-3 break-words text-sm text-surface-700">{task.reason}</p>

                  <div className="mt-4 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                    <div className="rounded-md border border-surface-200 bg-surface-200/40 p-3">
                      <p className="text-xs text-surface-500">Забрать откуда</p>
                      <p className="font-bold">{task.pickupLocation?.name || task.equipment?.location?.name || 'не указано'}</p>
                    </div>
                    <div className="rounded-md border border-surface-200 bg-surface-200/40 p-3">
                      <p className="text-xs text-surface-500">Доставить куда</p>
                      <p className="font-bold">{task.destinationLocation?.name || 'ремонтная зона'}</p>
                    </div>
                    <div className="rounded-md border border-surface-200 bg-surface-200/40 p-3">
                      <p className="text-xs text-surface-500">Координатор</p>
                      <p className="font-bold">{task.assignedCoordinator?.username || 'не назначен'}</p>
                    </div>
                    <div className={`rounded-md border p-3 ${isOverdue(task) ? 'border-red-200 bg-red-50 text-red-900' : 'border-surface-200 bg-surface-200/40'}`}>
                      <p className="text-xs opacity-70">Срок передачи</p>
                      <p className="font-bold">{shortDate(task.pickupDueDate)}</p>
                    </div>
                  </div>

                  {task.pickupComment && <p className="mt-3 break-words text-xs text-surface-500">{task.pickupComment}</p>}

                  {canAct(task) && task.pickupStatus !== 'DELIVERED' && task.pickupStatus !== 'CANCELLED' && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {['PENDING', 'NOTIFIED'].includes(task.pickupStatus) && (
                        <button className="btn-secondary" disabled={busyId === task.id} onClick={() => openStatusDialog(task, 'IN_PROGRESS', 'Взять задачу в работу')}>
                          Взять в работу
                        </button>
                      )}
                      {task.pickupStatus === 'IN_PROGRESS' && (
                        <button className="btn-secondary" disabled={busyId === task.id} onClick={() => openStatusDialog(task, 'PICKED_UP', 'Подтвердить забор оборудования')}>
                          Забрал оборудование
                        </button>
                      )}
                      {task.pickupStatus === 'PICKED_UP' && (
                        <button className="btn-success" disabled={busyId === task.id} onClick={() => openStatusDialog(task, 'DELIVERED', 'Подтвердить доставку в ремонт')}>
                          Доставил в ремонт
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </ScrollArea>
      </ContentCard>

      {statusDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/45 p-4">
          <form onSubmit={submitStatusChange} className="w-full max-w-lg rounded-lg border border-surface-200 bg-surface-50 p-5 shadow-raised">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="section-title">Смена статуса</p>
                <h2 className="mt-2 text-lg font-extrabold text-surface-950">{statusDialog.title}</h2>
                <p className="mt-1 truncate font-mono text-xs text-surface-500">{statusDialog.task.equipment?.inventoryNumber}</p>
              </div>
              <StatusBadge status={statusDialog.status} />
            </div>

            <label className="label mt-5" htmlFor="pickup-status-comment">
              Комментарий к передаче
            </label>
            <textarea
              id="pickup-status-comment"
              className="input min-h-[112px] resize-y"
              placeholder="Например: оборудование принято в ремонтной зоне, передано инженеру"
              value={statusComment}
              onChange={(event) => setStatusComment(event.target.value)}
            />
            <p className="mt-2 text-xs text-surface-500">
              Комментарий сохранится в карточке задачи и поможет подтвердить действие на защите.
            </p>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setStatusDialog(null);
                  setStatusComment('');
                }}
                disabled={busyId === statusDialog.task.id}
              >
                Отмена
              </button>
              <button type="submit" className="btn-primary" disabled={busyId === statusDialog.task.id}>
                {busyId === statusDialog.task.id ? 'Сохранение...' : 'Подтвердить статус'}
              </button>
            </div>
          </form>
        </div>
      )}
    </PageContainer>
  );
}
