import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import nl from './nl.json';
import en from './en.json';

const resources = {
  nl: { translation: nl },
  en: { translation: en }
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'nl',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
});

export default i18n;
