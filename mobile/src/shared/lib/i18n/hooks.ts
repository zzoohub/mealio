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
  AuthKeys,
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
        guestLimitTitle: t("capture.guestLimitTitle"),
        guestLimitMessage: t("capture.guestLimitMessage"),
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
      confirm: t("confirm"),
      done: t("done"),
      error: t("error"),
      back: t("back"),
      sort: t("sort"),
      clearAll: t("clearAll"),
      search: t("search"),
      customSelect: t("customSelect"),
      mealTypeBreakfast: t("mealTypeBreakfast"),
      mealTypeLunch: t("mealTypeLunch"),
      mealTypeDinner: t("mealTypeDinner"),
      mealTypeSnack: t("mealTypeSnack"),
      mealTypeDessert: t("mealTypeDessert"),
      mealTypeDrink: t("mealTypeDrink"),
      mealTypeOther: t("mealTypeOther"),
      mealTypeMeal: t("mealTypeMeal"),
      apply: t("apply"),
      user: t("user"),
      signedIn: t("signedIn"),
      sortBy: t("sortBy"),
      uploading: t("uploading"),
      uploadFailed: t("uploadFailed"),
      uploadFailedMessage: t("uploadFailedMessage"),
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
      deleteFailed: t("deleteFailed"),
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
        title: t("account.title"),
        signIn: t("account.signIn"),
        signInDescription: t("account.signInDescription"),
        signOut: t("account.signOut"),
        signOutDescription: t("account.signOutDescription"),
        deleteAccount: t("account.deleteAccount"),
        deleteAccountDescription: t("account.deleteAccountDescription"),
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
        version: (version: string) => t("about.version", { version }),
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
      sortNewest: t("sortNewest"),
      sortOldest: t("sortOldest"),
      sortHighestRated: t("sortHighestRated"),
      nutritionCalories: t("nutritionCalories"),
      nutritionProtein: t("nutritionProtein"),
      nutritionFat: t("nutritionFat"),
      nutritionFiber: t("nutritionFiber"),
      nutritionSugar: t("nutritionSugar"),
      nutritionCarbs: t("nutritionCarbs"),
      nutritionSodium: t("nutritionSodium"),
      aiAnalysis: t("aiAnalysis"),
      editNutrition: t("editNutrition"),
      editDone: t("editDone"),
      ingredients: t("ingredients"),
      nutritionInfo: t("nutritionInfo"),
      addIngredient: t("addIngredient"),
      notesPlaceholder: t("notesPlaceholder"),
      notesInput: t("notesInput"),
      notesEmpty: t("notesEmpty"),
      notesAccessibility: (notes: string) => t("notesAccessibility", { notes }),
      wouldEatAgain: t("wouldEatAgain"),
      ratingPoints: (count: number) => t("ratingPoints", { count }),
      deleteEntryTitle: t("deleteEntryTitle"),
      deleteEntryMessage: t("deleteEntryMessage"),
      searchNoResults: t("searchNoResults"),
      searchAdjustFilters: t("searchAdjustFilters"),
      searchRecordPrompt: t("searchRecordPrompt"),
      mealTypeSelect: t("mealTypeSelect"),
      mealTypeAccessibility: (type: string) => t("mealTypeAccessibility", { type }),
      location: t("location"),
      openInMaps: t("openInMaps"),
      addNutrition: t("addNutrition"),
      changeDateTime: t("changeDateTime"),
      maxPhotosReached: t("maxPhotosReached"),
      maxPhotosMessage: (max: number) => t("maxPhotosMessage", { max }),
      addPhotoFailed: t("addPhotoFailed"),
      selectDateRange: t("selectDateRange"),
      quickSelect: t("quickSelect"),
      allTime: t("allTime"),
      last7Days: t("last7Days"),
      last30Days: t("last30Days"),
      last3Months: t("last3Months"),
      calendarInstructions: t("calendarInstructions"),
      clearSelection: t("clearSelection"),
      deleteEntry: t("deleteEntry"),
      deleteEntryHint: t("deleteEntryHint"),
      deletingEntry: t("deletingEntry"),
      sortLatestFirst: t("sortLatestFirst"),
      sortLatestFirstDesc: t("sortLatestFirstDesc"),
      sortOldestFirst: t("sortOldestFirst"),
      sortOldestFirstDesc: t("sortOldestFirstDesc"),
      sortHighestCalories: t("sortHighestCalories"),
      sortHighestCaloriesDesc: t("sortHighestCaloriesDesc"),
      sortLowestCalories: t("sortLowestCalories"),
      sortLowestCaloriesDesc: t("sortLowestCaloriesDesc"),
      sortHighestProtein: t("sortHighestProtein"),
      sortHighestProteinDesc: t("sortHighestProteinDesc"),
      sortLowestProtein: t("sortLowestProtein"),
      sortLowestProteinDesc: t("sortLowestProteinDesc"),
      sortHealthiestFirst: t("sortHealthiestFirst"),
      sortHealthiestFirstDesc: t("sortHealthiestFirstDesc"),
      sortLeastHealthy: t("sortLeastHealthy"),
      sortLeastHealthyDesc: t("sortLeastHealthyDesc"),
      sortMostNutritious: t("sortMostNutritious"),
      sortMostNutritiousDesc: t("sortMostNutritiousDesc"),
      sortLeastDense: t("sortLeastDense"),
      sortLeastDenseDesc: t("sortLeastDenseDesc"),
      rangeLight: t("rangeLight"),
      rangeModerate: t("rangeModerate"),
      rangeSubstantial: t("rangeSubstantial"),
      rangeLarge: t("rangeLarge"),
      rangeVeryLarge: t("rangeVeryLarge"),
      rangeLowProtein: t("rangeLowProtein"),
      rangeModerateProtein: t("rangeModerateProtein"),
      rangeHighProtein: t("rangeHighProtein"),
      rangeVeryHighProtein: t("rangeVeryHighProtein"),
      rangeExcellent: t("rangeExcellent"),
      rangeGood: t("rangeGood"),
      rangeFair: t("rangeFair"),
      rangePoor: t("rangePoor"),
      rangeVeryDense: t("rangeVeryDense"),
      rangeDense: t("rangeDense"),
      rangeModerateDensity: t("rangeModerateDensity"),
      rangeLowDensity: t("rangeLowDensity"),
      allEntries: (label: string) => t("allEntries", { label }),
      dateRangeFrom: (date: string) => t("dateRangeFrom", { date }),
      dateRangeUntil: (date: string) => t("dateRangeUntil", { date }),
      stat: (key: string) => t(key as DiaryKeys),
    }),
    [t],
  );
};

// Auth hook
export const useAuthI18n = () => {
  const { t } = useI18n<AuthKeys>("auth");

  return useMemo(
    () => ({
      welcomeTitle: t("welcomeTitle"),
      welcomeSubtitle: t("welcomeSubtitle"),
      continueWithApple: t("continueWithApple"),
      continueWithGoogle: t("continueWithGoogle"),
      termsFooter: t("termsFooter"),
      syncLocalEntries: t("syncLocalEntries"),
      syncLocalEntriesMessage: (count: number) =>
        t(count === 1 ? "syncLocalEntryMessage" : "syncLocalEntriesMessage", { count }),
      skip: t("skip"),
      sync: t("sync"),
      migrationError: t("migrationError"),
      migrationErrorMessage: t("migrationErrorMessage"),
      signInFailed: (provider: string) => t("signInFailed", { provider }),
    }),
    [t],
  );
};
