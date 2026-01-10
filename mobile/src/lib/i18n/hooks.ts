import { useTranslation, UseTranslationOptions } from "react-i18next";
import { useMemo } from "react";
import { getCurrentLanguage, getCurrentLanguageConfig, isRTL } from "./config";
import type {
  FormattersType,
  NavigationKeys,
  CameraKeys,
  CommonKeys,
  ErrorKeys,
  SettingsKeys,
  DiaryKeys,
} from "./types";

/**
 * Enhanced type-safe useTranslation hook
 */
export const useI18n = <T extends string = string>(ns?: string | string[], options?: UseTranslationOptions<any>) => {
  const { t, i18n, ready } = useTranslation(ns, options);
  const { t: commonT } = useTranslation("common");

  const currentLanguage = getCurrentLanguage();
  const languageConfig = getCurrentLanguageConfig();
  const isReady = ready;
  const isRightToLeft = isRTL(currentLanguage);

  // Type-safe translation function
  const translate = useMemo(() => {
    return (key: T, options?: any) => t(key, options) as string;
  }, [t]);

  // Memoized formatting functions with improved performance
  const formatters = useMemo(
    (): Omit<FormattersType, "timeAgo"> => ({
      calories: (count: number): string => commonT("calories", { count }) as string,

      likes: (count: number): string => commonT("likes", { count }) as string,

      number: (value: number): string => {
        return new Intl.NumberFormat(currentLanguage).format(value);
      },

      currency: (value: number): string => {
        const currencyCode = currentLanguage === "ko" ? "KRW" : "USD";
        return new Intl.NumberFormat(currentLanguage, {
          style: "currency",
          currency: currencyCode,
        }).format(value);
      },

      date: (date: Date, options?: Intl.DateTimeFormatOptions): string => {
        const defaultOptions: Intl.DateTimeFormatOptions = {
          year: "numeric",
          month: "short",
          day: "numeric",
        };
        return new Intl.DateTimeFormat(currentLanguage, { ...defaultOptions, ...options }).format(date);
      },

      time: (date: Date, options?: Intl.DateTimeFormatOptions): string => {
        const defaultOptions: Intl.DateTimeFormatOptions =
          languageConfig.timeFormat === "24h"
            ? { hour: "2-digit", minute: "2-digit", hour12: false }
            : { hour: "2-digit", minute: "2-digit", hour12: true };
        return new Intl.DateTimeFormat(currentLanguage, { ...defaultOptions, ...options }).format(date);
      },
    }),
    [commonT, currentLanguage, languageConfig.timeFormat],
  );

  return {
    t: translate,
    i18n,
    ready: isReady,
    language: currentLanguage,
    languageConfig,
    isRTL: isRightToLeft,
    format: formatters,
  };
};

/**
 * Domain-specific hooks with better organization
 */

// Navigation hook
export const useNavigationI18n = () => {
  const { t } = useI18n<NavigationKeys>("navigation");

  return useMemo(
    () => ({
      camera: t("camera"),
      diary: t("diary"),
    }),
    [t],
  );
};

// Camera hook with comprehensive translations
export const useCameraI18n = () => {
  const { t } = useI18n<CameraKeys>("camera");

  return useMemo(
    () => ({
      title: t("title"),
      subtitle: t("subtitle"),
      quickHint: t("quickHint"),
      capturingText: t("capturingText"),
      preparing: t("preparing"),
      flip: t("flip"),
      recent: t("recent"),
      done: t("done"),
      tapToEdit: t("tapToEdit"),
      aiAnalysis: t("aiAnalysis"),
      aiAnalysisDesc: t("aiAnalysisDesc"),
      welcome: {
        title: t("welcome.title"),
        message: t("welcome.message"),
        enableCamera: t("welcome.enableCamera"),
      },
      permissions: {
        title: t("permissions.title"),
        message: t("permissions.message"),
        cancel: t("permissions.cancel"),
        openSettings: t("permissions.openSettings"),
      },
      capture: {
        success: t("capture.success"),
        successMessage: t("capture.successMessage"),
        viewTimeline: t("capture.viewTimeline"),
        error: t("capture.error"),
        errorMessage: t("capture.errorMessage"),
      },
    }),
    [t],
  );
};

// Common UI hook
export const useCommonI18n = () => {
  const { t, format } = useI18n<CommonKeys>("common");

  return useMemo(
    () => ({
      loading: t("loading"),
      retry: t("retry"),
      cancel: t("cancel"),
      save: t("save"),
      delete: t("delete"),
      edit: t("edit"),
      ok: t("ok"),
      yes: t("yes"),
      no: t("no"),
      settings: t("settings"),
      language: t("language"),
      about: t("about"),
      formatNumber: format.number,
      formatCurrency: format.currency,
      formatDate: format.date,
    }),
    [t, format.number, format.currency, format.date],
  );
};

// Error messages hook
export const useErrorI18n = () => {
  const { t } = useI18n<ErrorKeys>("errors");

  return useMemo(
    () => ({
      networkError: t("networkError"),
      genericError: t("genericError"),
      cameraError: t("cameraError"),
      storageError: t("storageError"),
    }),
    [t],
  );
};

// Settings hook
export const useSettingsI18n = () => {
  const { t } = useI18n<SettingsKeys>("settings");

  return useMemo(
    () => ({
      title: t("title"),
      account: {
        signIn: t("account.signIn"),
        signInDescription: t("account.signInDescription"),
      },
      language: {
        title: t("language.title"),
        description: t("language.description"),
        select: t("language.select"),
      },
      notifications: {
        title: t("notifications.title"),
        description: t("notifications.description"),
      },
      privacy: {
        title: t("privacy.title"),
        description: t("privacy.description"),
      },
      about: {
        title: t("about.title"),
        version: t("about.version"),
        description: t("about.description"),
      },
      display: {
        title: t("display.title"),
        appearance: {
          title: t("display.appearance.title"),
          description: t("display.appearance.description"),
        },
        theme: {
          title: t("display.theme.title"),
          description: t("display.theme.description"),
          select: t("display.theme.select"),
          light: t("display.theme.light"),
          lightDesc: t("display.theme.lightDesc"),
          dark: t("display.theme.dark"),
          darkDesc: t("display.theme.darkDesc"),
          system: t("display.theme.system"),
          systemDesc: t("display.theme.systemDesc"),
        },
        fontSize: {
          title: t("display.fontSize.title"),
          description: t("display.fontSize.description"),
          select: t("display.fontSize.select"),
          small: t("display.fontSize.small"),
          smallDesc: t("display.fontSize.smallDesc"),
          medium: t("display.fontSize.medium"),
          mediumDesc: t("display.fontSize.mediumDesc"),
          large: t("display.fontSize.large"),
          largeDesc: t("display.fontSize.largeDesc"),
        },
        languageRegion: {
          title: t("display.languageRegion.title"),
          description: t("display.languageRegion.description"),
        },
        language: {
          select: t("display.language.select"),
        },
        units: {
          title: t("display.units.title"),
          description: t("display.units.description"),
          select: t("display.units.select"),
          metric: t("display.units.metric"),
          metricDesc: t("display.units.metricDesc"),
          imperial: t("display.units.imperial"),
          imperialDesc: t("display.units.imperialDesc"),
        },
        content: {
          title: t("display.content.title"),
          description: t("display.content.description"),
        },
        nutrition: {
          title: t("display.nutrition.title"),
          description: t("display.nutrition.description"),
          select: t("display.nutrition.select"),
          detailed: t("display.nutrition.detailed"),
          detailedDesc: t("display.nutrition.detailedDesc"),
          simple: t("display.nutrition.simple"),
          simpleDesc: t("display.nutrition.simpleDesc"),
        },
      },
    }),
    [t],
  );
};

// Diary hook
export const useDiaryI18n = () => {
  const { t } = useI18n<DiaryKeys>("diary");

  return useMemo(
    () => ({
      diaryHistory: t("diaryHistory"),
      searchPlaceholder: t("searchPlaceholder"),
      noMealsFound: t("noMealsFound"),
      loadMore: t("loadMore"),
      meals: t("meals"),
      today: t("today"),
      yesterday: t("yesterday"),
      thisWeek: t("thisWeek"),
      thisMonth: t("thisMonth"),
      older: t("older"),
      goToToday: t("goToToday"),
      selectDate: t("selectDate"),
      recordMeal: t("recordMeal"),
      loadFromAlbum: t("loadFromAlbum"),
      orSelectFromPhotos: t("orSelectFromPhotos"),
      stat: (key: string) => t(key as DiaryKeys),
    }),
    [t],
  );
};
