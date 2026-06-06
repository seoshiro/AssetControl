interface StatusBadgeProps {
  status: string;
}

export const statusConfig: Record<string, { label: string; classes: string }> = {
  AVAILABLE: {
    label: 'Доступно',
    classes: 'status-success',
  },
  IN_USE: {
    label: 'В использовании',
    classes: 'status-info',
  },
  REPAIR: {
    label: 'На ремонте',
    classes: 'status-warning',
  },
  RESERVED: {
    label: 'Резерв',
    classes: 'status-muted',
  },
  WRITTEN_OFF: {
    label: 'Списано',
    classes: 'status-danger',
  },
  LOST: {
    label: 'Потеряно',
    classes: 'status-danger',
  },
  ACTIVE: {
    label: 'Активно',
    classes: 'status-info',
  },
  RETURNED: {
    label: 'Возвращено',
    classes: 'status-muted',
  },
  OVERDUE: {
    label: 'Просрочено',
    classes: 'status-danger',
  },
  OPEN: {
    label: 'Открыта',
    classes: 'status-info',
  },
  IN_PROGRESS: {
    label: 'В работе',
    classes: 'status-warning',
  },
  DONE: {
    label: 'Готово',
    classes: 'status-success',
  },
  CANCELLED: {
    label: 'Отменено',
    classes: 'status-muted',
  },
  PLANNED: {
    label: 'План',
    classes: 'status-muted',
  },
  COMPLETED: {
    label: 'Завершено',
    classes: 'status-success',
  },
  NORMAL: {
    label: 'Норма',
    classes: 'status-success',
  },
  DEPRECIATED: {
    label: 'Высокий износ',
    classes: 'status-warning',
  },
  EXPENSIVE_MAINTENANCE: {
    label: 'Дорогой сервис',
    classes: 'status-danger',
  },
  PENDING: {
    label: 'Ожидает',
    classes: 'status-muted',
  },
  NOTIFIED: {
    label: 'Назначено',
    classes: 'status-info',
  },
  PICKED_UP: {
    label: 'Забрано',
    classes: 'status-warning',
  },
  DELIVERED: {
    label: 'Доставлено',
    classes: 'status-success',
  },
  PURCHASE: {
    label: 'Покупка',
    classes: 'status-info',
  },
  SERVICE: {
    label: 'Сервис',
    classes: 'status-warning',
  },
  RENT: {
    label: 'Аренда',
    classes: 'status-muted',
  },
  COMPENSATION: {
    label: 'Компенсация',
    classes: 'status-danger',
  },
  OTHER: {
    label: 'Прочее',
    classes: 'status-muted',
  },
};

export function getStatusLabel(status: string) {
  return statusConfig[status]?.label || status;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    classes: 'status-muted',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
