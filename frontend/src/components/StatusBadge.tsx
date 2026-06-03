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
