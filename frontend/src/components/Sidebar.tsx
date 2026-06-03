import { NavLink } from 'react-router-dom';
import {
  Bell,
  ChartBar,
  ClipboardText,
  ClockCounterClockwise,
  Database,
  HouseLine,
  Info,
  Package,
  Repeat,
  ShieldCheck,
  SignOut,
  Toolbox,
  UserCircle,
  UsersThree,
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from './ui';

const navigation = [
  { name: 'Dashboard', path: '/', icon: HouseLine },
  { name: 'Оборудование', path: '/equipment', icon: Package },
  { name: 'Сотрудники', path: '/employees', icon: UsersThree },
  { name: 'Выдачи', path: '/issuances', icon: Repeat },
  { name: 'Ремонты', path: '/repairs', icon: Toolbox },
  { name: 'Инвентаризация', path: '/inventory-checks', icon: ClipboardText },
  { name: 'Отчёты', path: '/reports', icon: ChartBar },
  { name: 'Уведомления', path: '/notifications', icon: Bell },
  { name: 'О проекте', path: '/about', icon: Info },
];

const navClass = (isActive: boolean) =>
  `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
    isActive ? 'bg-surface-100 text-primary-900 ring-1 ring-surface-200' : 'text-surface-600 hover:bg-surface-100 hover:text-surface-950'
  }`;

interface SidebarProps {
  onNavigate?: () => void;
  variant?: 'desktop' | 'drawer';
}

export default function Sidebar({ onNavigate, variant = 'desktop' }: SidebarProps) {
  const { user, logout, isAdmin, canAudit, canViewReports } = useAuth();

  const roleLabel: Record<string, string> = {
    ADMIN: 'Администратор',
    MANAGER: 'Менеджер',
    INVENTORY_MANAGER: 'Инв. менеджер',
    EMPLOYEE: 'Сотрудник',
    AUDITOR: 'Аудитор',
    VIEWER: 'Наблюдатель',
  };

  return (
    <aside className={`${variant === 'desktop' ? 'fixed left-0 top-0 min-h-screen w-64' : 'h-[calc(100vh-57px)] w-full'} flex flex-col border-r border-surface-200 bg-surface-50 text-surface-900`}>
      <div className="border-b border-surface-200 p-6">
        <div className="font-display text-xl font-semibold leading-tight text-surface-950">AssetControl</div>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-surface-500">equipment registry</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navigation.filter((item) => item.path !== '/reports' || canViewReports).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.path} to={item.path} end={item.path === '/'} onClick={onNavigate} className={({ isActive }) => navClass(isActive)}>
              <Icon className="h-4 w-4" weight="regular" />
              {item.name}
            </NavLink>
          );
        })}

        {canAudit && (
          <NavLink to="/audit-log" onClick={onNavigate} className={({ isActive }) => navClass(isActive)}>
            <ClockCounterClockwise className="h-4 w-4" weight="regular" />
            Audit log
          </NavLink>
        )}

        {isAdmin && (
          <>
            <NavLink to="/admin/users" onClick={onNavigate} className={({ isActive }) => navClass(isActive)}>
              <ShieldCheck className="h-4 w-4" weight="regular" />
              Пользователи
            </NavLink>
            <NavLink to="/backup" onClick={onNavigate} className={({ isActive }) => navClass(isActive)}>
              <Database className="h-4 w-4" weight="regular" />
              Backup
            </NavLink>
          </>
        )}
      </nav>

      <div className="border-t border-surface-200 p-3">
        <NavLink
          to="/profile"
          onClick={onNavigate}
          className={({ isActive }) =>
            `mb-2 block rounded-md border px-3 py-3 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-200 ${
              isActive
                ? 'border-primary-300 bg-surface-100'
                : 'border-surface-200 bg-surface-50 hover:border-surface-300 hover:bg-surface-100'
            }`
          }
          aria-label="Открыть профиль"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="icon-tile icon-tile-sm">
              <UserCircle className="h-5 w-5" weight="regular" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-5 text-surface-950">{user?.username}</p>
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <p className="truncate text-xs text-surface-500">{roleLabel[user?.role || ''] || user?.role}</p>
                <RoleBadge role={user?.role} />
              </div>
            </div>
          </div>
        </NavLink>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-surface-600 transition hover:bg-surface-100 hover:text-surface-950">
          <SignOut className="h-4 w-4" weight="regular" />
          Выйти
        </button>
      </div>
    </aside>
  );
}
