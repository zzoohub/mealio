import { useTranslation, UseTranslationOptions } from "react-i18next";
import { useMemo } from "react";
import { getCurrentLanguage, getCurrentLanguageConfig, isRTL } from "./config";
import type {
  FormattersType,
  MealHelpersType,
  MealType,
  CategoryType,
  PeriodType,
  StatType,
  NavigationKeys,
  CameraKeys,
  TimelineKeys,
  DiscoverKeys,
  ProgressKeys,
  AICoachKeys,
  MealDetailKeys,
  CommonKeys,
  ErrorKeys,
  SettingsKeys,
} from "./types";

/**
 * Enhanced type-safe useTranslation hook
 */
export const useI18n = <T extends string = string>(ns?: string | string[], options?: UseTranslationOptions<any>) => {
  const { t, i18n, ready } = useTranslation(ns, options);
  const { t: commonT } = useTranslation("common");
  const { t: discoverT } = useTranslation("discover");

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
    (): FormattersType => ({
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

      timeAgo: (date: Date): string => {
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) {
          return discoverT("social.timeAgo.now") as string;
        } else if (diffInMinutes < 60) {
          return discoverT("social.timeAgo.minute", { count: diffInMinutes }) as string;
        } else if (diffInMinutes < 1440) {
          // Less than 24 hours
          const hours = Math.floor(diffInMinutes / 60);
          return discoverT("social.timeAgo.hour", { count: hours }) as string;
        } else {
          const days = Math.floor(diffInMinutes / 1440);
          return discoverT("social.timeAgo.day", { count: days }) as string;
        }
      },
    }),
    [commonT, discoverT, currentLanguage, languageConfig.timeFormat],
  );

  // Meal-specific translation helpers with type safety
  const mealHelpers = useMemo(
    (): MealHelpersType => ({
      mealType: (type: MealType): string => {
        return translate(`mealTypes.${type}` as T) || type;
      },

      category: (category: CategoryType): string => {
        return translate(`categories.${category}` as T) || category;
      },

      period: (period: PeriodType): string => {
        return translate(`periods.${period}` as T) || period;
      },

      stat: (stat: StatType): string => {
        return translate(`stats.${stat}` as T) || stat;
      },
    }),
    [translate],
  );

  return {
    t: translate,
    i18n,
    ready: isReady,
    language: currentLanguage,
    languageConfig,
    isRTL: isRightToLeft,
    format: formatters,
    meal: mealHelpers,
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
      timeline: t("timeline"),
      discover: t("discover"),
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
      hintText: t("hintText"),
      capturingText: t("capturingText"),
      preparing: t("preparing"),
      flip: t("flip"),
      discover: t("discover"),
      progress: t("progress"),
      aiCoach: t("aiCoach"),
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

// Timeline hook with formatters
export const useTimelineI18n = () => {
  const { t, format, meal } = useI18n<TimelineKeys>("timeline");

  return useMemo(
    () => ({
      title: t("title"),
      thisWeek: t("thisWeek"),
      recentMeals: t("recentMeals"),
      quickCapture: t("quickCapture"),
      mealHistory: t("mealHistory"),
      searchPlaceholder: t("searchPlaceholder"),
      selectDateRange: t("selectDateRange"),
      noMealsFound: t("noMealsFound"),
      noMealsMessage: t("noMealsMessage"),
      startLogging: t("startLogging"),
      loadMore: t("loadMore"),
      cancel: t("cancel"),
      apply: t("apply"),
      today: t("dates.today"),
      yesterday: t("dates.yesterday"),
      mealType: meal.mealType,
      period: meal.period,
      stat: meal.stat,
      formatCalories: format.calories,
      formatTime: format.time,
      formatDate: format.date,
    }),
    [t, format.calories, format.time, format.date, meal.mealType, meal.period, meal.stat],
  );
};

// Discover hook
export const useDiscoverI18n = () => {
  const { t, format, meal } = useI18n<DiscoverKeys>("discover");

  return useMemo(
    () => ({
      title: t("title"),
      subtitle: t("subtitle"),
      follow: t("social.follow"),
      following: t("social.following"),
      category: meal.category,
      formatCalories: format.calories,
      formatTimeAgo: format.timeAgo,
      formatLikes: format.likes,
    }),
    [t, format.calories, format.timeAgo, format.likes, meal.category],
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

// Meal detail hook
export const useMealDetailI18n = () => {
  const { t } = useI18n<MealDetailKeys>("mealDetail");

  return useMemo(
    () => ({
      title: t("title"),
      editTitle: t("editTitle"),
      save: t("save"),
      saved: t("saved"),
      analyzing: t("analyzing"),
      loadingMeal: t("loadingMeal"),
      analyzingSubtext: t("analyzingSubtext"),
      loadingSubtext: t("loadingSubtext"),
      analysisFailed: t("analysisFailed"),
      tryAgain: t("tryAgain"),
      goBack: t("goBack"),
      confidence: t("confidence"),
      nutritionFacts: t("nutritionFacts"),
      calories: t("calories"),
      protein: t("protein"),
      carbs: t("carbs"),
      fat: t("fat"),
      fiber: t("fiber"),
      ingredients: t("ingredients"),
      addIngredient: t("addIngredient"),
      tapToEdit: t("tapToEdit"),
      aiRecommendations: t("aiRecommendations"),
      noRecommendations: t("noRecommendations"),
      retakePhoto: t("retakePhoto"),
      sharePhoto: t("sharePhoto"),
      deletePhoto: t("deletePhoto"),
      mealSaved: t("mealSaved"),
      failedToSave: t("failedToSave"),
      failedToLoad: t("failedToLoad"),
      noMealId: t("noMealId"),
      mealNotFound: t("mealNotFound"),
    }),
    [t],
  );
};

// Progress hook
export const useProgressI18n = () => {
  const { t, format } = useI18n<ProgressKeys>("progress");

  return useMemo(
    () => ({
      title: t("title"),
      todaySummary: t("todaySummary"),
      caloriesConsumed: t("caloriesConsumed"),
      remaining: t("remaining"),
      macronutrients: t("macronutrients"),
      protein: t("protein"),
      carbs: t("carbs"),
      fat: t("fat"),
      water: t("water"),
      fiber: t("fiber"),
      achievements: t("achievements"),
      weeklyTrends: t("weeklyTrends"),
      day: t("day"),
      week: t("week"),
      month: t("month"),
      proteinMaster: t("proteinMaster"),
      proteinMasterDesc: t("proteinMasterDesc"),
      veggieWarrior: t("veggieWarrior"),
      veggieWarriorDesc: t("veggieWarriorDesc"),
      consistencyKing: t("consistencyKing"),
      consistencyKingDesc: t("consistencyKingDesc"),
      eatingPattern: t("eatingPattern"),
      seeAll: t("seeAll"),
      viewAll: t("viewAll"),
      balancedExplorer: t("balancedExplorer"),
      balancedExplorerDesc: t("balancedExplorerDesc"),
      mealDiversityScore: t("mealDiversityScore"),
      diversityTip: t("diversityTip"),
      formatCalories: format.calories,
      formatNumber: format.number,
    }),
    [t, format.calories, format.number],
  );
};

// AI Coach hook
export const useAICoachI18n = () => {
  const { t } = useI18n<AICoachKeys>("aiCoach");

  return useMemo(
    () => ({
      title: t("title"),
      greeting: t("greeting"),
      typeMessage: t("typeMessage"),
      send: t("send"),
      insights: t("insights"),
      analyzeMy: t("analyzeMy"),
      setGoals: t("setGoals"),
      weeklyReport: t("weeklyReport"),
      mealSuggestions: t("mealSuggestions"),
      proteinGoal: t("proteinGoal"),
      proteinGoalDesc: t("proteinGoalDesc"),
      hydrationReminder: t("hydrationReminder"),
      hydrationReminderDesc: t("hydrationReminderDesc"),
      vegetableVariety: t("vegetableVariety"),
      vegetableVarietyDesc: t("vegetableVarietyDesc"),
      subtitle: t("subtitle"),
      mealIdeas: t("mealIdeas"),
      goalCheck: t("goalCheck"),
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
