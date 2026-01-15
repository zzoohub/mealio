import i18n, { InitOptions, Resource } from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import { storage } from "@/lib/storage";
import type { TranslationResources } from "./types";

// Dynamic imports for better code splitting
const loadTranslations = async (language: string): Promise<TranslationResources> => {
  try {
    if (__DEV__) {
      console.log(`Loading translations for language: ${language}`);
    }

    switch (language) {
      case "ko":
        return {
          navigation: await import("./locales/modules/navigation.ko.json").then(m => m.default),
          camera: await import("./locales/modules/camera.ko.json").then(m => m.default),
          common: await import("./locales/modules/common.ko.json").then(m => m.default),
          errors: await import("./locales/modules/errors.ko.json").then(m => m.default),
          settings: await import("./locales/modules/settings.ko.json").then(m => m.default),
          diary: await import("./locales/modules/diary.ko.json").then(m => m.default),
        };
      default:
        return {
          navigation: await import("./locales/modules/navigation.en.json").then(m => m.default),
          camera: await import("./locales/modules/camera.en.json").then(m => m.default),
          common: await import("./locales/modules/common.en.json").then(m => m.default),
          errors: await import("./locales/modules/errors.en.json").then(m => m.default),
          settings: await import("./locales/modules/settings.en.json").then(m => m.default),
          diary: await import("./locales/modules/diary.en.json").then(m => m.default),
        };
    }
  } catch (error) {
    console.error(`Failed to load translations for language: ${language}`, error);
    throw error;
  }
};

// Language detection and storage
const LANGUAGE_STORAGE_KEY = "user-language-v2";

const languageDetector = {
  type: "languageDetector" as const,
  async: true,
  detect: async (callback: (language: string) => void) => {
    try {
      // Try stored language first
      const storedLanguage = await storage.get<string>(LANGUAGE_STORAGE_KEY, undefined);
      if (storedLanguage && SUPPORTED_LANGUAGES.some(lang => lang.code === storedLanguage)) {
        if (__DEV__) {
          console.log(`Using stored language: ${storedLanguage}`);
        }
        callback(storedLanguage);
        return;
      }

      // Fallback to device locale
      const deviceLocale = Localization.getLocales()[0];
      const detectedLanguage = deviceLocale?.languageCode === "ko" ? "ko" : "en";

      if (__DEV__) {
        console.log(`Using device language: ${detectedLanguage}`);
      }
      callback(detectedLanguage);
    } catch (error) {
      console.warn("Language detection failed:", error);
      callback("en");
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await storage.set(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
      console.warn("Failed to cache language:", error);
    }
  },
};

// Supported languages configuration
export const SUPPORTED_LANGUAGES = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    direction: "ltr" as const,
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h" as const,
  },
  {
    code: "ko",
    name: "Korean",
    nativeName: "한국어",
    direction: "ltr" as const,
    dateFormat: "YYYY-MM-DD",
    timeFormat: "24h" as const,
  },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

// Initialize i18n with namespace support
const initializeI18n = async () => {
  // Load initial translations
  const enTranslations = await loadTranslations("en");
  const koTranslations = await loadTranslations("ko");

  const resources: Resource = {
    en: enTranslations as any,
    ko: koTranslations as any,
  };

  const initOptions: InitOptions = {
    // Resources with namespaces
    resources,

    // Language configuration
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES.map(lang => lang.code),

    // Namespace configuration
    ns: Object.keys(enTranslations),
    defaultNS: "common",

    // Performance optimizations
    debug: __DEV__,

    // Interpolation with advanced formatting
    interpolation: {
      escapeValue: false,
      formatSeparator: ",",
      format: (value: any, format?: string, lng?: string) => {
        if (!format) return value;
        const language = lng ?? i18n.language;
        const languageConfig = SUPPORTED_LANGUAGES.find(l => l.code === language);

        switch (format) {
          case "number":
            return new Intl.NumberFormat(language).format(value);
          case "currency": {
            const currencyCode = language === "ko" ? "KRW" : "USD";
            return new Intl.NumberFormat(language, {
              style: "currency",
              currency: currencyCode,
            }).format(value);
          }
          case "date":
            return new Intl.DateTimeFormat(language, {
              year: "numeric",
              month: "short",
              day: "numeric",
            }).format(value);
          case "time": {
            const timeFormatOptions: Intl.DateTimeFormatOptions =
              languageConfig?.timeFormat === "24h"
                ? { hour: "2-digit", minute: "2-digit", hour12: false }
                : { hour: "2-digit", minute: "2-digit", hour12: true };
            return new Intl.DateTimeFormat(language, timeFormatOptions).format(value);
          }
          case "percent":
            return new Intl.NumberFormat(language, { style: "percent" }).format(value);
          default:
            return value;
        }
      },
    },

    // React configuration
    react: {
      useSuspense: false,
    },

    // Development helpers
    saveMissing: __DEV__,
    missingKeyHandler: (lngs: readonly string[], ns: string, key: string) => {
      if (__DEV__) {
        console.warn(`Missing translation: ${ns}:${key} (${lngs.join(",")})`);
      }
    },
  };

  return i18n.use(languageDetector).use(initReactI18next).init(initOptions);
};

// Initialize and export
export const i18nInstance = initializeI18n();

// Utility functions
export const changeLanguage = async (language: SupportedLanguage) => {
  try {
    // Wait for i18n to be initialized
    await i18nInstance;

    // Validate language is supported
    if (!SUPPORTED_LANGUAGES.some(lang => lang.code === language)) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const translations = await loadTranslations(language);

    // Add new resources if they're not already loaded
    Object.entries(translations).forEach(([namespace, resources]) => {
      if (!i18n.hasResourceBundle(language, namespace)) {
        i18n.addResourceBundle(language, namespace, resources);
      }
    });

    await i18n.changeLanguage(language);
    await storage.set(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.error("Failed to change language:", error);
    console.error("Error details:", error);
    throw error;
  }
};

export const getCurrentLanguage = (): SupportedLanguage => {
  return (i18n.language as SupportedLanguage) || "en";
};

export const getCurrentLanguageConfig = () => {
  const currentLang = getCurrentLanguage();
  return SUPPORTED_LANGUAGES.find(lang => lang.code === currentLang) || SUPPORTED_LANGUAGES[0];
};

export const isRTL = (language?: string): boolean => {
  const lang = language || getCurrentLanguage();
  const languageConfig = SUPPORTED_LANGUAGES.find(l => l.code === lang);
  return (languageConfig?.direction as "ltr" | "rtl" | undefined) === "rtl";
};

// Translation validation in development
export const validateTranslations = (translations: TranslationResources) => {
  if (!__DEV__) return;

  const requiredKeys = ["navigation.camera", "common.loading", "errors.networkError"];

  requiredKeys.forEach(key => {
    const [namespace, ...keyPath] = key.split(".");
    const nsTranslations = translations[namespace as keyof TranslationResources];

    if (!nsTranslations) {
      console.warn(`Missing namespace: ${namespace}`);
      return;
    }

    let current: any = nsTranslations;
    for (const part of keyPath) {
      if (!current[part]) {
        console.warn(`Missing translation key: ${key}`);
        break;
      }
      current = current[part];
    }
  });
};

export default i18n;
