import { Monitor, Moon, SignOut, Sun, UserCircle } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { ThemeMode, useTheme } from '../context/ThemeContext';
import { ContentCard, PageContainer, PageHeader } from '../components/PageLayout';
import { RoleBadge } from '../components/ui';

const roleDescriptions: Record<string, string> = {
  ADMIN: 'Полный доступ к системе, пользователям, отчётам, audit log и критичным операциям.',
  MANAGER: 'Управление оборудованием, выдачами, ремонтами, инвентаризациями и отчётами.',
  INVENTORY_MANAGER: 'Операционный учёт оборудования, инвентаризации, выдачи и ремонтные заявки.',
  EMPLOYEE: 'Просмотр собственных данных, уведомлений и закреплённого оборудования.',
  AUDITOR: 'Просмотр отчётов, истории действий и audit log без изменения данных.',
  VIEWER: 'Ограниченный режим просмотра для демонстрации и контроля.',
};

const themeOptions: Array<{ mode: ThemeMode; label: string; icon: typeof Sun }> = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'system', label: 'System', icon: Monitor },
];

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { mode, resolvedTheme, setMode } = useTheme();

  return (
    <PageContainer>
      <PageHeader title="Профиль" description="Данные активной сессии, роль и персональные настройки интерфейса." />

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ContentCard>
          <div className="flex min-w-0 items-start gap-4">
            <div className="icon-tile icon-tile-lg">
              <UserCircle className="h-8 w-8" weight="regular" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-display text-2xl font-semibold text-surface-950">{user?.username}</h2>
              <p className="mt-1 truncate text-sm text-surface-600">{user?.email || `login: ${user?.username}`}</p>
              <div className="mt-3">
                <RoleBadge role={user?.role} />
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-surface-200 bg-surface-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-500">Роль</p>
              <p className="mt-2 text-sm text-surface-700">{roleDescriptions[user?.role || ''] || 'Права доступа определяются ролью пользователя.'}</p>
            </div>
            <div className="rounded-lg border border-surface-200 bg-surface-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-500">Активная сессия</p>
              <p className="mt-2 text-sm text-surface-700">Demo-аккаунт работает через JWT и локальное хранилище браузера.</p>
            </div>
          </div>

          <button type="button" onClick={logout} className="btn-secondary mt-6">
            <SignOut className="h-4 w-4" weight="regular" />
            Выйти из системы
          </button>
        </ContentCard>

        <ContentCard>
          <h2 className="text-base font-semibold text-surface-950">Настройки интерфейса</h2>
          <p className="mt-1 text-sm text-surface-500">Тема сохраняется локально и применяется после перезагрузки.</p>

          <div className="mt-5 space-y-2">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const active = mode === option.mode;
              return (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => setMode(option.mode)}
                  className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition ${
                    active
                      ? 'border-primary-300 bg-primary-50 text-primary-900'
                      : 'border-surface-200 bg-surface-50 text-surface-700 hover:bg-surface-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" weight="regular" />
                    {option.label}
                  </span>
                  {active && <span className="text-xs text-surface-500">активно</span>}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-surface-500">Сейчас применяется: {resolvedTheme === 'dark' ? 'Dark' : 'Light'}.</p>
        </ContentCard>
      </div>
    </PageContainer>
  );
}
