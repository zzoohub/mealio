/**
 * Diary Detail Components
 *
 * Pure UI components for the diary entry detail page.
 * All components are stateless and receive data through props.
 */

// Entry-level components
export { EntryDetailHeader } from './EntryDetailHeader';
export type { EntryDetailHeaderProps } from './EntryDetailHeader';

export { EntryContextBar } from './EntryContextBar';
export type { EntryContextBarProps } from './EntryContextBar';

export { EntryNotesSection } from './EntryNotesSection';
export type { EntryNotesSectionProps } from './EntryNotesSection';

export { EntryDeleteButton } from './EntryDeleteButton';
export type { EntryDeleteButtonProps } from './EntryDeleteButton';

// Meal-level components (display meal data within an entry)
export { MealHeroImage } from './MealHeroImage';
export type { MealHeroImageProps } from './MealHeroImage';

export { AICommentBanner } from './AICommentBanner';
export type { AICommentBannerProps } from './AICommentBanner';

export { MealNutritionRow } from './MealNutritionRow';
export type { MealNutritionRowProps } from './MealNutritionRow';

export { AIAnalysisSection } from './AIAnalysisSection';
export type { AIAnalysisSectionProps } from './AIAnalysisSection';
