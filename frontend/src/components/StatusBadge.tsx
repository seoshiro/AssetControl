import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

interface StatusBadgeProps {
  status: string;
}

export const statusConfig: Record<string, { classes: string }> = {
  AVAILABLE: {
    classes: 'status-success',
  },
  IN_USE: {
    classes: 'status-info',
  },
  REPAIR: {
    classes: 'status-warning',
  },
  RESERVED: {
    classes: 'status-muted',
  },
  WRITTEN_OFF: {
    classes: 'status-danger',
  },
  LOST: {
    classes: 'status-danger',
  },
  ACTIVE: {
    classes: 'status-info',
  },
  RETURNED: {
    classes: 'status-muted',
  },
  OVERDUE: {
    classes: 'status-danger',
  },
  OPEN: {
    classes: 'status-info',
  },
  IN_PROGRESS: {
    classes: 'status-warning',
  },
  DONE: {
    classes: 'status-success',
  },
  CANCELLED: {
    classes: 'status-muted',
  },
  PLANNED: {
    classes: 'status-muted',
  },
  COMPLETED: {
    classes: 'status-success',
  },
  NORMAL: {
    classes: 'status-success',
  },
  DEPRECIATED: {
    classes: 'status-warning',
  },
  EXPENSIVE_MAINTENANCE: {
    classes: 'status-danger',
  },
  PENDING: {
    classes: 'status-muted',
  },
  NOTIFIED: {
    classes: 'status-info',
  },
  PICKED_UP: {
    classes: 'status-warning',
  },
  DELIVERED: {
    classes: 'status-success',
  },
  PURCHASE: {
    classes: 'status-info',
  },
  SERVICE: {
    classes: 'status-warning',
  },
  RENT: {
    classes: 'status-muted',
  },
  COMPENSATION: {
    classes: 'status-danger',
  },
  OTHER: {
    classes: 'status-muted',
  },
};

export function getStatusLabel(status: string) {
  return i18n.t(`status.${status}`, { defaultValue: status });
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  const config = statusConfig[status] || {
    classes: 'status-muted',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${config.classes}`}
    >
      {t(`status.${status}`, { defaultValue: status })}
    </span>
  );
}
