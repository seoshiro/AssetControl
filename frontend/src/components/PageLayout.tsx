import type { ReactNode } from 'react';

type BaseProps = {
  children: ReactNode;
  className?: string;
};

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(' ');

export function PageContainer({ children, className }: BaseProps) {
  return (
    <div className={cx('mx-auto w-full max-w-[1400px] min-w-0 space-y-5 px-4 sm:px-6 lg:px-0', className)}>
      {children}
    </div>
  );
}

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cx('flex min-w-0 flex-col gap-3 border-b border-surface-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <p className="section-title mb-2">control panel</p>
        <h1 className="page-title truncate">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-600">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function ContentCard({ children, className }: BaseProps) {
  return <section className={cx('card min-w-0 overflow-hidden transition duration-200 hover:border-surface-300', className)}>{children}</section>;
}

export function ScrollArea({ children, className }: BaseProps) {
  return <div className={cx('min-h-0 min-w-0 overflow-y-auto pr-2', className)}>{children}</div>;
}

export function TablePanel({ children, className }: BaseProps) {
  return (
    <div className={cx('min-w-0 overflow-hidden rounded-lg border border-surface-200 bg-surface-100/90 shadow-panel', className)}>
      <div className="max-h-[70vh] min-w-0 overflow-auto">{children}</div>
    </div>
  );
}
