import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import Italian translations
import commonIT from '@/locales/it/common.json';
import navigationIT from '@/locales/it/navigation.json';
import authIT from '@/locales/it/auth.json';
import dashboardIT from '@/locales/it/dashboard.json';
import ticketsIT from '@/locales/it/tickets.json';
import worksIT from '@/locales/it/works.json';
import clientsIT from '@/locales/it/clients.json';
import plantsIT from '@/locales/it/plants.json';
import usersIT from '@/locales/it/users.json';
import worksiteReferencesIT from '@/locales/it/worksite-references.json';
import profileIT from '@/locales/it/profile.json';
import validationIT from '@/locales/it/validation.json';
import notfoundIT from '@/locales/it/notfound.json';
import attachmentsIT from '@/locales/it/attachments.json';
import accessLogsIT from '@/locales/it/accessLogs.json';
import reportsIT from '@/locales/it/reports.json';
import calendarIT from '@/locales/it/calendar.json';

// Import English translations
import commonEN from '@/locales/en/common.json';
import navigationEN from '@/locales/en/navigation.json';
import authEN from '@/locales/en/auth.json';
import dashboardEN from '@/locales/en/dashboard.json';
import ticketsEN from '@/locales/en/tickets.json';
import worksEN from '@/locales/en/works.json';
import clientsEN from '@/locales/en/clients.json';
import plantsEN from '@/locales/en/plants.json';
import usersEN from '@/locales/en/users.json';
import worksiteReferencesEN from '@/locales/en/worksite-references.json';
import profileEN from '@/locales/en/profile.json';
import validationEN from '@/locales/en/validation.json';
import notfoundEN from '@/locales/en/notfound.json';
import attachmentsEN from '@/locales/en/attachments.json';
import accessLogsEN from '@/locales/en/accessLogs.json';
import reportsEN from '@/locales/en/reports.json';
import calendarEN from '@/locales/en/calendar.json';

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources: {
      it: {
        common: commonIT,
        navigation: navigationIT,
        auth: authIT,
        dashboard: dashboardIT,
        tickets: ticketsIT,
        works: worksIT,
        clients: clientsIT,
        plants: plantsIT,
        users: usersIT,
        'worksite-references': worksiteReferencesIT,
        profile: profileIT,
        validation: validationIT,
        notfound: notfoundIT,
        attachments: attachmentsIT,
        'access-logs': accessLogsIT,
        reports: reportsIT,
        calendar: calendarIT,
      },
      en: {
        common: commonEN,
        navigation: navigationEN,
        auth: authEN,
        dashboard: dashboardEN,
        tickets: ticketsEN,
        works: worksEN,
        clients: clientsEN,
        plants: plantsEN,
        users: usersEN,
        'worksite-references': worksiteReferencesEN,
        profile: profileEN,
        validation: validationEN,
        notfound: notfoundEN,
        attachments: attachmentsEN,
        'access-logs': accessLogsEN,
        reports: reportsEN,
        calendar: calendarEN,
      },
    },
    fallbackLng: 'en',
    lng: 'it', // Default language
    defaultNS: 'common',
    fallbackNS: 'common',

    // Detection configuration
    detection: {
      order: ['cookie', 'localStorage', 'navigator'],
      caches: ['cookie', 'localStorage'],
      lookupCookie: 'i18next_lang',
      lookupLocalStorage: 'i18next_lang',
      cookieOptions: {
        path: '/',
        sameSite: 'lax' as const,
        maxAge: 365 * 24 * 60 * 60, // 365 days in seconds
      },
    },

    // React specific
    react: {
      useSuspense: false,
    },

    // Development
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
