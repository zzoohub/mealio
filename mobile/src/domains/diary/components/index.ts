// Meal-level components (display meal data)
export { MealPhotoCard } from './MealPhotoCard';
export { EntryPhotoGrid } from './EntryPhotoGrid';

// Entry-level components
export { default as RecentEntries } from './RecentEntries';

// Search components (legacy)
export { EntryListItem } from './EntryListItem';
export { EntrySearchBar } from './EntrySearchBar';
export { EntryFilterChips } from './EntryFilterChips';
export { EntrySortModal } from './EntrySortModal';
export { EntryDateRangeModal } from './EntryDateRangeModal';

// Search components (new)
export {
  MealTypeFilterChips,
  DateQuickFilters,
  ActiveFilters,
  SearchGridItem,
} from './search';

// Diary page components
export { WeekDaySelector } from './WeekDaySelector';
export { EntryFeedItem } from './EntryFeedItem';

// Detail page components
export {
  EntryDetailHeader,
  MealHeroImage,
  AICommentBanner,
  EntryContextBar,
  EntryNotesSection,
  AIAnalysisSection,
  MealNutritionRow,
  EntryDeleteButton,
} from './detail';

// Types
export type { MealPhotoData, MealPhotoCardProps } from './MealPhotoCard';
export type { EntryPhotoGridProps } from './EntryPhotoGrid';
export type { EntryListItemProps } from './EntryListItem';
export type { EntrySearchBarProps } from './EntrySearchBar';
export type { EntryFilterChipsProps } from './EntryFilterChips';
export type { EntrySortModalProps } from './EntrySortModal';
export type { EntryDateRangeModalProps } from './EntryDateRangeModal';
export type {
  MealTypeFilterChipsProps,
  DateQuickFiltersProps,
  DatePreset,
  ActiveFiltersProps,
  ActiveFilter,
  SearchGridItemProps,
} from './search';
export type { WeekDaySelectorProps } from './WeekDaySelector';
export type { EntryFeedItemProps } from './EntryFeedItem';
export type {
  EntryDetailHeaderProps,
  MealHeroImageProps,
  AICommentBannerProps,
  EntryContextBarProps,
  EntryNotesSectionProps,
  AIAnalysisSectionProps,
  MealNutritionRowProps,
  EntryDeleteButtonProps,
} from './detail';
