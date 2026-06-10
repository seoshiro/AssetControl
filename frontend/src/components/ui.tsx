import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlass } from '@phosphor-icons/react';

type BaseProps = {
  children: ReactNode;
  className?: string;
};

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(' ');

export function StatCard({
  title,
  value,
  icon,
  tone = 'blue',
  meta,
}: {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: 'blue' | 'green' | 'violet' | 'red' | 'slate';
  meta?: ReactNode;
}) {
  const tones = {
    blue: 'tone-info',
    green: 'tone-success',
    violet: 'tone-warning',
    red: 'tone-danger',
    slate: 'tone-muted',
  };

  return (
    <article className={cx('group min-w-0 rounded-lg border p-4 shadow-panel transition duration-200 hover:border-surface-300', tones[tone])}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-surface-500">{title}</p>
        {icon && <div className="icon-tile icon-tile-md">{icon}</div>}
      </div>
      <div className="mt-4 metric-value">{value}</div>
      {meta && <div className="mt-2 text-xs text-surface-500">{meta}</div>}
    </article>
  );
}

export function DataCard({ children, className }: BaseProps) {
  return <section className={cx('card min-w-0 overflow-hidden', className)}>{children}</section>;
}

export function SectionCard({ title, description, children, className }: BaseProps & { title: string; description?: string }) {
  return (
    <DataCard className={className}>
      <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-surface-950">{title}</h2>
          {description && <p className="mt-1 text-sm text-surface-500">{description}</p>}
        </div>
      </div>
      {children}
    </DataCard>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cx('relative min-w-0', className)}>
      <MagnifyingGlass className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-surface-500" weight="regular" />
      <input className="input pl-9" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

export function FilterBar({ children, className }: BaseProps) {
  return <div className={cx('card flex min-w-0 flex-col gap-3 md:flex-row md:items-center', className)}>{children}</div>;
}

export function RoleBadge({ role }: { role?: string | null }) {
  const { t } = useTranslation();

  return (
    <span className="inline-flex max-w-full items-center rounded-md border border-primary-200 bg-primary-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-800">
      <span className="truncate">{t(`role.${role || 'USER'}`, { defaultValue: role || t('role.USER') })}</span>
    </span>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-surface-300 bg-surface-50 p-6 text-center">
      <p className="text-sm font-bold text-surface-800">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm text-surface-500">{description}</p>}
    </div>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation();

  return (
    <div className="card space-y-3">
      <p className="text-sm font-semibold text-surface-700">{label || t('common.loadingData')}</p>
      <div className="h-3 rounded bg-surface-200" />
      <div className="h-3 w-2/3 rounded bg-surface-200" />
      <div className="h-3 w-1/2 rounded bg-surface-200" />
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{message}</div>;
}
