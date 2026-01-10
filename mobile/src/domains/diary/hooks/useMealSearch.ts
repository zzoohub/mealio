import { useState, useEffect, useCallback, useMemo } from "react";
import { Meal, MealHistoryFilter } from "../types";
import { mealStorageUtils, generateMockMeals } from "./useMealStorage";
import { mealSortingUtils, SortedSection } from "./useMealSorting";
import { useAnalyticsStore, SortMethod } from "../../analytics";
import { getCachedData } from "@/lib/performance";

// =============================================================================
// TYPES (Interface-First Design)
// =============================================================================

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface CalendarRangeState {
  startDate: Date | null;
  endDate: Date | null;
  markedDates: Record<string, any>;
}

export interface UseMealSearchReturn {
  // Data
  sections: SortedSection[];
  meals: Meal[];

  // States
  isLoading: boolean;
  isLoadingMore: boolean;
  isSorting: boolean;
  error: Error | null;
  hasMore: boolean;

  // Search/Filter
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortMethod: SortMethod;
  setSortMethod: (method: SortMethod) => void;
  sortOptions: ReturnType<typeof mealSortingUtils.getSortOptions>;

  // Date Range
  dateRange: DateRange;
  calendarRange: CalendarRangeState;
  formatDateRange: () => string;
  handleDayPress: (day: { dateString: string }) => void;
  setDateRangePreset: (days: number) => void;
  clearDateRange: () => void;

  // Modal Controls
  showSortModal: boolean;
  setShowSortModal: (show: boolean) => void;
  showDateRangeModal: boolean;
  setShowDateRangeModal: (show: boolean) => void;

  // Actions
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  handleSortMethodSelect: (method: SortMethod) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ITEMS_PER_PAGE = 20;

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useMealSearch(): UseMealSearchReturn {
  const { globalPeriod, setGlobalPeriod, sortMethod, setSortMethod } = useAnalyticsStore();

  // Data state
  const [meals, setMeals] = useState<Meal[]>([]);
  const [sortedSections, setSortedSections] = useState<SortedSection[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Pagination
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Search/Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [mockDataGenerated, setMockDataGenerated] = useState(false);

  // Modal state
  const [showSortModal, setShowSortModal] = useState(false);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);

  // Calendar state
  const [calendarRange, setCalendarRange] = useState<CalendarRangeState>({
    startDate: null,
    endDate: null,
    markedDates: {},
  });

  // Sort options
  const sortOptions = useMemo(() => mealSortingUtils.getSortOptions(), []);

  // Derived date range
  const dateRange: DateRange = useMemo(
    () => ({
      startDate: globalPeriod.startDate ?? null,
      endDate: globalPeriod.endDate ?? null,
    }),
    [globalPeriod.startDate, globalPeriod.endDate]
  );

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Update sections when meals or sort method changes
  useEffect(() => {
    const updateSortedSections = async () => {
      if (meals.length === 0) {
        setSortedSections([]);
        return;
      }

      setIsSorting(true);
      try {
        const sections = await getCachedData(
          `meal-sections-${sortMethod}-${meals.length}-${searchQuery}`,
          () => mealSortingUtils.sortMeals(meals, sortMethod),
          { ttl: 1 * 60 * 1000 }
        );
        setSortedSections(sections);
      } catch (err) {
        console.error("Error sorting meals:", err);
        const fallbackSections = await mealSortingUtils.sortMeals(meals, "date-desc");
        setSortedSections(fallbackSections);
      } finally {
        setIsSorting(false);
      }
    };

    updateSortedSections();
  }, [meals, sortMethod, searchQuery]);

  // Load data on filter changes
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setPage(1);
        setHasMore(true);

        const filter: MealHistoryFilter = {};
        if (searchQuery) filter.searchQuery = searchQuery;
        if (globalPeriod.startDate) filter.startDate = globalPeriod.startDate;
        if (globalPeriod.endDate) filter.endDate = globalPeriod.endDate;

        let loadedMeals = await mealStorageUtils.getMealsFiltered(filter);

        // For development: add mock data if no meals exist (only once)
        if (loadedMeals.length === 0 && !searchQuery && !mockDataGenerated) {
          const mockMeals = generateMockMeals();
          for (const mockMeal of mockMeals) {
            try {
              await mealStorageUtils.saveMeal({
                userId: mockMeal.userId,
                name: mockMeal.name,
                photoUri: mockMeal.photoUri,
                timestamp: mockMeal.timestamp,
                mealType: mockMeal.mealType,
                nutrition: mockMeal.nutrition,
                ingredients: mockMeal.ingredients,
                aiAnalysis: mockMeal.aiAnalysis,
                location: mockMeal.location,
                notes: mockMeal.notes,
                isVerified: mockMeal.isVerified,
              });
            } catch (err) {
              console.error("Error saving mock meal:", err);
            }
          }
          setMockDataGenerated(true);
          loadedMeals = await mealStorageUtils.getMealsFiltered(filter);
        }

        const endIndex = ITEMS_PER_PAGE;
        const paginatedMeals = loadedMeals.slice(0, endIndex);

        setMeals(paginatedMeals);
        setHasMore(endIndex < loadedMeals.length);
      } catch (err) {
        console.error("Error loading meals:", err);
        setError(err instanceof Error ? err : new Error("Failed to load meals"));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [searchQuery, globalPeriod.startDate, globalPeriod.endDate, mockDataGenerated]);

  // =============================================================================
  // CALENDAR FUNCTIONS
  // =============================================================================

  const updateCalendarRange = useCallback(
    (start: Date | null, end: Date | null, colors: { primary: string; text: string }) => {
      const markedDates: Record<string, any> = {};

      if (start && !end) {
        const dateString = start.toISOString().split("T")[0];
        if (dateString) {
          markedDates[dateString] = {
            startingDay: true,
            color: colors.primary,
            textColor: "white",
          };
        }
      } else if (start && end) {
        const startString = start.toISOString().split("T")[0];
        const endString = end.toISOString().split("T")[0];

        if (startString && endString && startString === endString) {
          markedDates[startString] = {
            startingDay: true,
            endingDay: true,
            color: colors.primary,
            textColor: "white",
          };
        } else if (startString && endString) {
          markedDates[startString] = {
            startingDay: true,
            color: colors.primary,
            textColor: "white",
          };
          markedDates[endString] = {
            endingDay: true,
            color: colors.primary,
            textColor: "white",
          };

          const currentDate = new Date(start);
          currentDate.setDate(currentDate.getDate() + 1);

          while (currentDate < end) {
            const dateString = currentDate.toISOString().split("T")[0];
            if (dateString) {
              markedDates[dateString] = {
                color: colors.primary + "40",
                textColor: colors.text,
              };
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      }

      setCalendarRange({ startDate: start, endDate: end, markedDates });

      if (start && end) {
        setGlobalPeriod({ type: "custom", startDate: start, endDate: end });
      } else if (start && !end) {
        setGlobalPeriod({ type: "custom", startDate: start });
      }
    },
    [setGlobalPeriod]
  );

  const clearDateRange = useCallback(() => {
    setCalendarRange({ startDate: null, endDate: null, markedDates: {} });
    setGlobalPeriod({ type: "day" });
  }, [setGlobalPeriod]);

  const formatDateRange = useCallback(() => {
    if (globalPeriod.startDate && globalPeriod.endDate) {
      return `${globalPeriod.startDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${globalPeriod.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    } else if (globalPeriod.startDate) {
      return `From ${globalPeriod.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    } else if (globalPeriod.endDate) {
      return `Until ${globalPeriod.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
    return "All time";
  }, [globalPeriod.startDate, globalPeriod.endDate]);

  const setDateRangePreset = useCallback(
    (days: number) => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days + 1);

      // We need colors here - this will be passed from component
      // For now, use a placeholder that component will override
      setGlobalPeriod({ type: "custom", startDate, endDate });
    },
    [setGlobalPeriod]
  );

  const handleDayPress = useCallback(
    (day: { dateString: string }) => {
      const selectedDate = new Date(day.dateString);
      const { startDate, endDate } = calendarRange;

      // This needs colors from theme - component will call updateCalendarRange
      if (!startDate || (startDate && endDate)) {
        setCalendarRange({
          startDate: selectedDate,
          endDate: null,
          markedDates: {},
        });
        setGlobalPeriod({ type: "custom", startDate: selectedDate });
      } else if (startDate && !endDate) {
        if (selectedDate >= startDate) {
          setGlobalPeriod({ type: "custom", startDate, endDate: selectedDate });
        } else {
          setCalendarRange({
            startDate: selectedDate,
            endDate: null,
            markedDates: {},
          });
          setGlobalPeriod({ type: "custom", startDate: selectedDate });
        }
      }
    },
    [calendarRange, setGlobalPeriod]
  );

  // =============================================================================
  // ACTIONS
  // =============================================================================

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    try {
      setIsLoadingMore(true);

      const filter: MealHistoryFilter = {};
      if (searchQuery) filter.searchQuery = searchQuery;
      if (globalPeriod.startDate) filter.startDate = globalPeriod.startDate;
      if (globalPeriod.endDate) filter.endDate = globalPeriod.endDate;

      const loadedMeals = await mealStorageUtils.getMealsFiltered(filter);

      const startIndex = page * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const newMeals = loadedMeals.slice(startIndex, endIndex);

      if (newMeals.length > 0) {
        setMeals((prev) => [...prev, ...newMeals]);
        setPage((prev) => prev + 1);
      }

      setHasMore(endIndex < loadedMeals.length);
    } catch (err) {
      console.error("Error loading more meals:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, searchQuery, globalPeriod.startDate, globalPeriod.endDate, page]);

  const refetch = useCallback(async () => {
    setPage(1);
    setHasMore(true);
    setMockDataGenerated(false);
  }, []);

  const handleSortMethodSelect = useCallback(
    (method: SortMethod) => {
      setSortMethod(method);
      setShowSortModal(false);
    },
    [setSortMethod]
  );

  // =============================================================================
  // RETURN
  // =============================================================================

  return {
    // Data
    sections: sortedSections,
    meals,

    // States
    isLoading,
    isLoadingMore,
    isSorting,
    error,
    hasMore,

    // Search/Filter
    searchQuery,
    setSearchQuery,
    sortMethod,
    setSortMethod,
    sortOptions,

    // Date Range
    dateRange,
    calendarRange,
    formatDateRange,
    handleDayPress,
    setDateRangePreset,
    clearDateRange,

    // Modal Controls
    showSortModal,
    setShowSortModal,
    showDateRangeModal,
    setShowDateRangeModal,

    // Actions
    loadMore,
    refetch,
    handleSortMethodSelect,
  };
}
