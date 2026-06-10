import { useTranslation } from 'react-i18next';
import type { AppLanguage } from '../i18n';

const languages: AppLanguage[] = ['ru', 'en'];

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();
  const activeLanguage = i18n.language === 'en' ? 'en' : 'ru';

  return (
    <div className={compact ? 'flex items-center gap-1' : 'space-y-2'} aria-label={t('language.label')}>
      {!compact && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-500">{t('language.label')}</p>}
      <div className="inline-flex rounded-md border border-surface-200 bg-surface-50 p-1">
        {languages.map((language) => {
          const active = activeLanguage === language;
          return (
            <button
              key={language}
              type="button"
              onClick={() => i18n.changeLanguage(language)}
              className={`rounded px-2.5 py-1 text-xs font-extrabold transition ${
                active ? 'bg-primary-800 text-surface-50' : 'text-surface-600 hover:bg-surface-100 hover:text-surface-950'
              }`}
              aria-pressed={active}
            >
              {t(`language.${language}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
