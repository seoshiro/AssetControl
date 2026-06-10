import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './locales/ru.json';
import en from './locales/en.json';

export const LANGUAGE_STORAGE_KEY = 'assetcontrol_language';
export type AppLanguage = 'ru' | 'en';

const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
const initialLanguage: AppLanguage = savedLanguage === 'en' || savedLanguage === 'ru' ? savedLanguage : 'ru';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      en: { translation: en },
    },
    lng: initialLanguage,
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on('languageChanged', (lng) => {
  if (lng === 'ru' || lng === 'en') {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  }
});

export default i18n;
