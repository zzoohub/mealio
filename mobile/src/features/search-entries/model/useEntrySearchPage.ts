import { useState, useCallback, useMemo } from "react";
import { Platform, ActionSheetIOS, Alert } from "react-native";
import { useRouter } from "expo-router";
import type { Entry } from "@/entities/entry";
import { MealType } from "@/entities/meal";
import { useEntrySearch } from "./useEntrySearch";
import type { UseEntrySearchParams } from "./useEntrySearch";
import type { DatePreset } from "../ui/DateQuickFilters";
import { useDiaryI18n, useCommonI18n } from "@/shared/lib/i18n";
import type { ApiMealType } from "@/shared/api";

// =============================================================================
// TYPES (Interface-First Design)
// =============================================================================

export type { DatePreset };

export type SortOption = "date-desc" | "date-asc" | "rating-desc";

export interface SortOptionConfig {
  value: SortOption;
  label: string;
}

export interface UseEntrySearchPageReturn {
  // Data
  filteredEntries: Entry[];

  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;

  // Meal type filter
  selectedMealTypes: MealType[];
  setSelectedMealTypes: (types: MealType[]) => void;
  removeMealType: (type: MealType) => void;

  // Date filter
  datePreset: DatePreset;
  calendarRange: { startDate: Date | null; endDate: Date | null; markedDates: Record<string, any> };
  customDateLabel: string | undefined;
  handleDatePresetChange: (preset: DatePreset) => void;
  setCustomDateRange: (startDate: Date, endDate: Date) => void;
  setDateRangePreset: (days: number) => void;
  clearDateRange: () => void;

  // Sort
  sortOption: SortOption;
  currentSortLabel: string;
  sortOptions: readonly SortOptionConfig[];
  showSortSheet: () => void;

  // Actions
  handleEntryPress: (entry: Entry) => void;
  handleClearAllFilters: () => void;
  loadMore: () => Promise<void>;

  // Navigation
  goBack: () => void;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useEntrySearchPage(): UseEntrySearchPageReturn {
  const router = useRouter();
  const diary = useDiaryI18n();
  const common = useCommonI18n();

  const SORT_OPTIONS: readonly SortOptionConfig[] = useMemo(() => [
    { value: "date-desc", label: diary.sortNewest },
    { value: "date-asc", label: diary.sortOldest },
    { value: "rating-desc", label: diary.sortHighestRated },
  ] as const, [diary.sortNewest, diary.sortOldest, diary.sortHighestRated]);

  // Local filter state
  const [selectedMealTypes, setSelectedMealTypes] = useState<MealType[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>(null);
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");

  // Derive API meal type param: pass to API when exactly 1 meal type selected
  const apiMealType: ApiMealType | undefined = useMemo(() => {
    if (selectedMealTypes.length === 1) {
      return selectedMealTypes[0] as ApiMealType;
    }
    return undefined;
  }, [selectedMealTypes]);

  // Build params for useEntrySearch
  const searchParams: UseEntrySearchParams = useMemo(
    () => ({
      mealType: apiMealType,
      sortOption,
    }),
    [apiMealType, sortOption]
  );

  // Use the base entry search hook for data fetching
  const {
    entries,
    isLoading,
    isLoadingMore,
    searchQuery,
    setSearchQuery,
    dateRange,
    calendarRange,
    setCustomDateRange,
    setDateRangePreset,
    clearDateRange,
    loadMore,
  } = useEntrySearch(searchParams);

  // =============================================================================
  // FILTERING & SORTING
  // =============================================================================

  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Client-side meal type filter for multi-select (>1 type)
    // When exactly 1 type is selected, it's already filtered server-side
    if (selectedMealTypes.length > 1) {
      result = result.filter((entry) => selectedMealTypes.includes(entry.meal.mealType));
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case "date-desc":
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case "date-asc":
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case "rating-desc":
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [entries, selectedMealTypes, sortOption]);

  // =============================================================================
  // DERIVED VALUES
  // =============================================================================

  const currentSortLabel = useMemo(() => {
    return SORT_OPTIONS.find((opt) => opt.value === sortOption)?.label || common.sort;
  }, [sortOption, SORT_OPTIONS, common.sort]);

  const customDateLabel = useMemo(() => {
    if (dateRange.startDate && dateRange.endDate) {
      const start = dateRange.startDate.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      });
      const end = dateRange.endDate.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      });
      return `${start} - ${end}`;
    }
    return undefined;
  }, [dateRange]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleEntryPress = useCallback(
    (entry: Entry) => {
      router.push(`/diary/${entry.id}`);
    },
    [router]
  );

  const handleDatePresetChange = useCallback(
    (preset: DatePreset) => {
      setDatePreset(preset);

      if (preset === null) {
        clearDateRange();
      } else if (preset === "today") {
        setDateRangePreset(1);
      } else if (preset === "week") {
        setDateRangePreset(7);
      } else if (preset === "month") {
        setDateRangePreset(30);
      }
    },
    [clearDateRange, setDateRangePreset]
  );

  const showSortSheet = useCallback(() => {
    const options = SORT_OPTIONS.map((opt) => opt.label);

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options, common.cancel],
          cancelButtonIndex: options.length,
          title: common.sort,
        },
        (buttonIndex) => {
          if (buttonIndex < options.length) {
            const selected = SORT_OPTIONS[buttonIndex];
            if (selected) {
              setSortOption(selected.value);
            }
          }
        }
      );
    } else {
      Alert.alert(common.sort, undefined, [
        ...SORT_OPTIONS.map((opt) => ({
          text: opt.label,
          onPress: () => setSortOption(opt.value),
        })),
        { text: common.cancel, style: "cancel" as const },
      ]);
    }
  }, [SORT_OPTIONS, common.cancel, common.sort]);

  const removeMealType = useCallback((mealType: MealType) => {
    setSelectedMealTypes((prev) => prev.filter((t) => t !== mealType));
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
  }, [setSearchQuery]);

  const handleClearAllFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedMealTypes([]);
    setDatePreset(null);
    clearDateRange();
  }, [setSearchQuery, clearDateRange]);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  // =============================================================================
  // RETURN
  // =============================================================================

  return {
    // Data
    filteredEntries,

    // Loading states
    isLoading,
    isLoadingMore,

    // Search
    searchQuery,
    setSearchQuery,
    clearSearch,

    // Meal type filter
    selectedMealTypes,
    setSelectedMealTypes,
    removeMealType,

    // Date filter
    datePreset,
    calendarRange,
    customDateLabel,
    handleDatePresetChange,
    setCustomDateRange,
    setDateRangePreset,
    clearDateRange,

    // Sort
    sortOption,
    currentSortLabel,
    sortOptions: SORT_OPTIONS,
    showSortSheet,

    // Actions
    handleEntryPress,
    handleClearAllFilters,
    loadMore,

    // Navigation
    goBack,
  };
}
