import i18n from './index';

export function currentLocale() {
  return i18n.language === 'en' ? 'en-US' : 'ru-RU';
}

export function formatDate(value?: string | Date | null) {
  if (!value) return i18n.t('common.notSpecified');
  return new Date(value).toLocaleDateString(currentLocale());
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return i18n.t('common.notSpecified');
  return new Date(value).toLocaleString(currentLocale());
}

export function formatNumber(value: number) {
  return Number(value || 0).toLocaleString(currentLocale());
}

export function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString(currentLocale())} ₸`;
}

export function formatCompactMoney(value: number | string | null | undefined) {
  const amount = Math.round(Number(value || 0) / 1000);
  return `${amount.toLocaleString(currentLocale())}k ₸`;
}
