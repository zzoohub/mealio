import { useState, useCallback, useMemo } from "react";
import { Platform, ActionSheetIOS, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Entry, MealType } from "../types";
import { useEntrySearch } from "./useEntrySearch";
import type { DatePreset } from "../components/search/DateQuickFilters";

// =============================================================================
// TYPES (Interface-First Design)
// =============================================================================

export type { DatePreset };

export type SortOption = "date-desc" | "date-asc" | "rating-desc";

export interface SortOptionConfig {
  value: SortOption;
  label: string;
}

export interface UseDiarySearchPageReturn {
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
  dateRange: { startDate: Date | null; endDate: Date | null };
  calendarRange: { startDate: Date | null; endDate: Date | null; markedDates: Record<string, any> };
  customDateLabel: string | undefined;
  handleDatePresetChange: (preset: DatePreset) => void;
  handleDayPress: (day: { dateString: string }) => void;
  setDateRangePreset: (days: number) => void;
  clearDateRange: () => void;

  // Sort
  sortOption: SortOption;
  currentSortLabel: string;
  sortOptions: readonly SortOptionConfig[];
  showSortSheet: () => void;

  // Modal
  showDateRangeModal: boolean;
  setShowDateRangeModal: (show: boolean) => void;
  handleCustomDatePress: () => void;
  handleDateModalClose: () => void;

  // Actions
  handleEntryPress: (entry: Entry) => void;
  handleClearAllFilters: () => void;
  loadMore: () => Promise<void>;

  // Navigation
  goBack: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SORT_OPTIONS: readonly SortOptionConfig[] = [
  { value: "date-desc", label: "최신순" },
  { value: "date-asc", label: "오래된순" },
  { value: "rating-desc", label: "평점 높은순" },
] as const;

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useDiarySearchPage(): UseDiarySearchPageReturn {
  const router = useRouter();

  // Use the base entry search hook for data fetching
  const {
    entries,
    isLoading,
    isLoadingMore,
    searchQuery,
    setSearchQuery,
    dateRange,
    calendarRange,
    handleDayPress,
    setDateRangePreset,
    clearDateRange,
    showDateRangeModal,
    setShowDateRangeModal,
    loadMore,
  } = useEntrySearch();

  // Local filter state
  const [selectedMealTypes, setSelectedMealTypes] = useState<MealType[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>(null);
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");

  // =============================================================================
  // FILTERING & SORTING
  // =============================================================================

  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Filter by meal type
    if (selectedMealTypes.length > 0) {
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
    return SORT_OPTIONS.find((opt) => opt.value === sortOption)?.label || "정렬";
  }, [sortOption]);

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

  const handleCustomDatePress = useCallback(() => {
    setShowDateRangeModal(true);
  }, [setShowDateRangeModal]);

  const handleDateModalClose = useCallback(() => {
    setShowDateRangeModal(false);
    if (dateRange.startDate) {
      setDatePreset("custom");
    }
  }, [setShowDateRangeModal, dateRange.startDate]);

  const showSortSheet = useCallback(() => {
    const options = SORT_OPTIONS.map((opt) => opt.label);

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options, "취소"],
          cancelButtonIndex: options.length,
          title: "정렬",
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
      Alert.alert("정렬", undefined, [
        ...SORT_OPTIONS.map((opt) => ({
          text: opt.label,
          onPress: () => setSortOption(opt.value),
        })),
        { text: "취소", style: "cancel" as const },
      ]);
    }
  }, []);

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
    dateRange,
    calendarRange,
    customDateLabel,
    handleDatePresetChange,
    handleDayPress,
    setDateRangePreset,
    clearDateRange,

    // Sort
    sortOption,
    currentSortLabel,
    sortOptions: SORT_OPTIONS,
    showSortSheet,

    // Modal
    showDateRangeModal,
    setShowDateRangeModal,
    handleCustomDatePress,
    handleDateModalClose,

    // Actions
    handleEntryPress,
    handleClearAllFilters,
    loadMore,

    // Navigation
    goBack,
  };
}
