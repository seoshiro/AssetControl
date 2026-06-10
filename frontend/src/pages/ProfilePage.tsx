import { Monitor, Moon, SignOut, Sun, UserCircle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ThemeMode, useTheme } from '../context/ThemeContext';
import { ContentCard, PageContainer, PageHeader } from '../components/PageLayout';
import { RoleBadge } from '../components/ui';
import LanguageSwitcher from '../components/LanguageSwitcher';

const themeOptions: Array<{ mode: ThemeMode; icon: typeof Sun }> = [
  { mode: 'light', icon: Sun },
  { mode: 'dark', icon: Moon },
  { mode: 'system', icon: Monitor },
];

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { mode, resolvedTheme, setMode } = useTheme();
  const { t } = useTranslation();

  return (
    <PageContainer>
      <PageHeader title={t('profile.title')} description={t('profile.description')} />

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ContentCard>
          <div className="flex min-w-0 items-start gap-4">
            <div className="icon-tile icon-tile-lg">
              <UserCircle className="h-8 w-8" weight="regular" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-display text-2xl font-semibold text-surface-950">{user?.username}</h2>
              <p className="mt-1 truncate text-sm text-surface-600">{user?.email || t('profile.loginFallback', { username: user?.username })}</p>
              <div className="mt-3">
                <RoleBadge role={user?.role} />
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-surface-200 bg-surface-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-500">{t('common.role')}</p>
              <p className="mt-2 text-sm text-surface-700">{t(`roleDescription.${user?.role || 'fallback'}`, { defaultValue: t('roleDescription.fallback') })}</p>
            </div>
            <div className="rounded-lg border border-surface-200 bg-surface-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-500">{t('profile.activeSession')}</p>
              <p className="mt-2 text-sm text-surface-700">{t('profile.sessionText')}</p>
            </div>
          </div>

          <button type="button" onClick={logout} className="btn-secondary mt-6">
            <SignOut className="h-4 w-4" weight="regular" />
            {t('profile.logoutSystem')}
          </button>
        </ContentCard>

        <ContentCard className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-surface-950">{t('profile.settings')}</h2>
            <p className="mt-1 text-sm text-surface-500">{t('profile.themeDescription')}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-500">{t('profile.theme')}</p>
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
                    {t(`theme.${option.mode}`)}
                  </span>
                  {active && <span className="text-xs text-surface-500">{t('common.active')}</span>}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-surface-500">{t('profile.currentTheme', { theme: t(`theme.${resolvedTheme}`) })}</p>

          <div>
            <LanguageSwitcher />
            <p className="mt-2 text-sm text-surface-500">{t('profile.languageDescription')}</p>
          </div>
        </ContentCard>
      </div>
    </PageContainer>
  );
}
