/**
 * Enhanced i18n system with type safety and modular architecture
 *
 * Features:
 * - Type-safe translation keys
 * - Modular translation files
 * - Domain-specific hooks
 * - Development tools
 * - Performance optimizations
 */

// Initialize i18n configuration
import "./config";

// Export configuration utilities
export {
  SUPPORTED_LANGUAGES,
  changeLanguage,
  getCurrentLanguage,
  getCurrentLanguageConfig,
  isRTL,
  i18nInstance,
  type SupportedLanguage,
} from "./config";

// Export type-safe hooks
export {
  useI18n,
  useNavigationI18n,
  useCameraI18n,
  useCommonI18n,
  useErrorI18n,
  useAnalyticsI18n,
  useSettingsI18n,
  useDiaryI18n,
} from "./hooks";

// Export TypeScript types
export type {
  TranslationResources,
  TranslationKey,
  NavigationTranslations,
  CameraTranslations,
  AnalyticsTranslations,
  CommonTranslations,
  ErrorTranslations,
  SettingsTranslations,
  DiaryTranslations,
  FormattersType,
} from "./types";

// Export development tools (only in development)
export {
  validateTranslationCompleteness,
  extractTranslationKeys,
  findUnusedKeys,
  findMissingKeys,
  generateTypeDefinitions,
  getTranslationStats,
  validateKeyPatterns,
} from "./dev-tools";
