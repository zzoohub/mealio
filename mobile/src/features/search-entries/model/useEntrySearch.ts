import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Entry, EntryFilter, SortMethod } from "@/entities/entry";
import { entryStorageUtils } from "@/entities/entry";
import { entrySortingUtils, SortedSection, SortI18n } from "./useEntrySorting";
import { getCachedData } from "@/shared/lib/performance";
import { useIsAuthenticated } from "@/shared/lib/auth";
import { entryApi } from "@/entities/entry/api/entryApi";
import { formatDateToString } from "@/shared/lib/utils";
import { getCurrentLanguage, useDiaryI18n } from "@/shared/lib/i18n";
import i18n from "@/shared/lib/i18n/config";
import { captureError } from "@/shared/lib/sentry";
import { track } from "@/shared/lib/analytics";
import { apiMealTypeToEnum } from "@/shared/api";
import type { ApiDiaryEntry, ApiMealType } from "@/shared/api";

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

export interface UseEntrySearchParams {
  mealType?: ApiMealType;
  sortOption?: "date-desc" | "date-asc" | "rating-desc";
  wouldEatAgain?: boolean;
}

export interface UseEntrySearchReturn {
  // Data
  sections: SortedSection[];
  entries: Entry[];

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
  sortOptions: ReturnType<typeof entrySortingUtils.getSortOptions>;

  // Date Range
  dateRange: DateRange;
  calendarRange: CalendarRangeState;
  formatDateRange: () => string;
  setCustomDateRange: (startDate: Date, endDate: Date) => void;
  setDateRangePreset: (days: number) => void;
  clearDateRange: () => void;

  // Actions
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  handleSortMethodSelect: (method: SortMethod) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ITEMS_PER_PAGE = 20;
const MAX_SEARCH_QUERY_LENGTH = 200;
const MAX_DATE_RANGE_DAYS = 366;
const SEARCH_DEBOUNCE_MS = 300;

// =============================================================================
// TYPES FOR DATE PERIOD
// =============================================================================

interface DatePeriod {
  type: "day" | "week" | "month" | "custom";
  startDate?: Date;
  endDate?: Date;
}

// =============================================================================
// HELPERS
// =============================================================================

const SORT_TO_ORDER_BY: Record<string, "eaten_at_desc" | "eaten_at_asc" | "rating_desc"> = {
  "date-desc": "eaten_at_desc",
  "date-asc": "eaten_at_asc",
  "rating-desc": "rating_desc",
};

function apiEntryToEntry(apiEntry: ApiDiaryEntry): Entry {
  return {
    id: String(apiEntry.id),
    userId: String(apiEntry.user_id),
    timestamp: new Date(apiEntry.eaten_at),
    notes: apiEntry.notes ?? "",
    meal: {
      photoUri: apiEntry.primary_photo_url ?? "",
      photoUris: apiEntry.photo_urls?.length ? apiEntry.photo_urls : undefined,
      mealType: apiMealTypeToEnum(apiEntry.meal_type),
    },
    rating: apiEntry.rating ?? undefined,
    wouldEatAgain: apiEntry.would_eat_again ?? undefined,
    createdAt: new Date(apiEntry.created_at),
    updatedAt: new Date(apiEntry.updated_at),
  };
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useEntrySearch(params?: UseEntrySearchParams): UseEntrySearchReturn {
  const isAuthenticated = useIsAuthenticated();
  const diary = useDiaryI18n();

  // Date period state (was in analytics store)
  const [datePeriod, setDatePeriod] = useState<DatePeriod>({ type: "day" });
  const [sortMethod, setSortMethod] = useState<SortMethod>("date-desc");

  // Data state
  const [entries, setEntries] = useState<Entry[]>([]);
  const [sortedSections, setSortedSections] = useState<SortedSection[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSorting, setIsSorting] = useState(false);

  // Tracks filter generation so loadMore discards stale appends
  const loadVersionRef = useRef(0);
  const [error, setError] = useState<Error | null>(null);

  // Pagination
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Search/Filter
  const [searchQuery, setSearchQueryRaw] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const setSearchQuery = useCallback((query: string) => {
    const trimmed = query.slice(0, MAX_SEARCH_QUERY_LENGTH);
    setSearchQueryRaw(trimmed);
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => setDebouncedQuery(trimmed), SEARCH_DEBOUNCE_MS);
  }, []);

  // Clear debounce timer on unmount
  useEffect(() => {
    return () => clearTimeout(debounceTimerRef.current);
  }, []);

  // Calendar state
  const [calendarRange, setCalendarRange] = useState<CalendarRangeState>({
    startDate: null,
    endDate: null,
    markedDates: {},
  });

  // Sort options
  const sortOptions = useMemo(() => entrySortingUtils.getSortOptions(diary.stat), [diary.stat]);

  const sortI18n: SortI18n = useMemo(
    () => ({
      today: diary.today,
      yesterday: diary.yesterday,
      allEntries: diary.allEntries,
      locale: getCurrentLanguage(),
      ranges: {
        rangeLight: diary.rangeLight,
        rangeModerate: diary.rangeModerate,
        rangeSubstantial: diary.rangeSubstantial,
        rangeLarge: diary.rangeLarge,
        rangeVeryLarge: diary.rangeVeryLarge,
        rangeLowProtein: diary.rangeLowProtein,
        rangeModerateProtein: diary.rangeModerateProtein,
        rangeHighProtein: diary.rangeHighProtein,
        rangeVeryHighProtein: diary.rangeVeryHighProtein,
        rangeExcellent: diary.rangeExcellent,
        rangeGood: diary.rangeGood,
        rangeFair: diary.rangeFair,
        rangePoor: diary.rangePoor,
        rangeVeryDense: diary.rangeVeryDense,
        rangeDense: diary.rangeDense,
        rangeModerateDensity: diary.rangeModerateDensity,
        rangeLowDensity: diary.rangeLowDensity,
      },
    }),
    [diary],
  );

  // Device timezone for API date filtering
  const deviceTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  // Derived date range
  const dateRange: DateRange = useMemo(
    () => ({
      startDate: datePeriod.startDate ?? null,
      endDate: datePeriod.endDate ?? null,
    }),
    [datePeriod.startDate, datePeriod.endDate]
  );

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Update sections when entries or sort method changes
  useEffect(() => {
    const updateSortedSections = async () => {
      if (entries.length === 0) {
        setSortedSections([]);
        return;
      }

      setIsSorting(true);
      try {
        const sections = await getCachedData(
          `entry-sections-${sortMethod}-${entries.length}-${searchQuery}`,
          () => entrySortingUtils.sortEntries(entries, sortMethod, sortI18n),
          { ttl: 1 * 60 * 1000 }
        );
        setSortedSections(sections);
      } catch (err) {
        captureError(err, { tags: { feature: "search-entries", action: "sort_entries" } });
        const fallbackSections = await entrySortingUtils.sortEntries(entries, "date-desc", sortI18n);
        setSortedSections(fallbackSections);
      } finally {
        setIsSorting(false);
      }
    };

    updateSortedSections();
  }, [entries, sortMethod, searchQuery, sortI18n]);

  // Load data on filter changes
  useEffect(() => {
    let stale = false;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setPage(1);
        setHasMore(true);

        if (isAuthenticated) {
          // Authenticated: use API
          const apiParams: Record<string, any> = {
            page: 1,
            per_page: ITEMS_PER_PAGE,
            tz: deviceTz,
          };
          if (debouncedQuery) apiParams.q = debouncedQuery;
          if (datePeriod.startDate) apiParams.start_date = formatDateToString(datePeriod.startDate);
          if (datePeriod.endDate) apiParams.end_date = formatDateToString(datePeriod.endDate);
          if (params?.mealType) apiParams.meal_type = params.mealType;
          if (params?.sortOption) apiParams.order_by = SORT_TO_ORDER_BY[params.sortOption];
          if (params?.wouldEatAgain !== undefined) apiParams.would_eat_again = params.wouldEatAgain;

          const response = await entryApi.list(apiParams);
          if (stale) return;
          const mapped = response.data.map(apiEntryToEntry);
          setEntries(mapped);
          setHasMore(response.meta.page < response.meta.total_pages);

          if (debouncedQuery) {
            track("search_performed", {
              query_length: debouncedQuery.length,
              results_count: mapped.length,
              has_filters: !!(datePeriod.startDate || params?.mealType || params?.wouldEatAgain),
            });
          }
        } else {
          // Guest: use local storage
          const filter: EntryFilter = {};
          if (debouncedQuery) filter.searchQuery = debouncedQuery;
          if (datePeriod.startDate) filter.startDate = datePeriod.startDate;
          if (datePeriod.endDate) filter.endDate = datePeriod.endDate;
          if (params?.mealType) filter.mealType = apiMealTypeToEnum(params.mealType);
          if (params?.wouldEatAgain) filter.wouldEatAgain = params.wouldEatAgain;

          const loadedEntries = await entryStorageUtils.getEntriesFiltered(filter);
          if (stale) return;
          const paginatedEntries = loadedEntries.slice(0, ITEMS_PER_PAGE);
          setEntries(paginatedEntries);
          setHasMore(ITEMS_PER_PAGE < loadedEntries.length);

          if (debouncedQuery) {
            track("search_performed", {
              query_length: debouncedQuery.length,
              results_count: paginatedEntries.length,
              has_filters: !!(datePeriod.startDate || params?.mealType || params?.wouldEatAgain),
            });
          }
        }
      } catch (err) {
        if (stale) return;
        captureError(err, { tags: { feature: "search-entries", action: "load_entries" } });
        setError(err instanceof Error ? err : new Error("Failed to load entries"));
      } finally {
        if (!stale) setIsLoading(false);
      }
    };

    loadVersionRef.current += 1;
    loadData();
    return () => { stale = true; };
  }, [debouncedQuery, datePeriod.startDate, datePeriod.endDate, isAuthenticated, deviceTz, params?.mealType, params?.sortOption, params?.wouldEatAgain]);

  // =============================================================================
  // CALENDAR FUNCTIONS
  // =============================================================================

  const clearDateRange = useCallback(() => {
    setCalendarRange({ startDate: null, endDate: null, markedDates: {} });
    setDatePeriod({ type: "day" });
  }, []);

  const formatDateRange = useCallback(() => {
    const locale = getCurrentLanguage();
    if (datePeriod.startDate && datePeriod.endDate) {
      return `${datePeriod.startDate.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
      })} - ${datePeriod.endDate.toLocaleDateString(locale, { month: "short", day: "numeric" })}`;
    } else if (datePeriod.startDate) {
      const date = datePeriod.startDate.toLocaleDateString(locale, { month: "short", day: "numeric" });
      return i18n.t("diary:dateRangeFrom", { date });
    } else if (datePeriod.endDate) {
      const date = datePeriod.endDate.toLocaleDateString(locale, { month: "short", day: "numeric" });
      return i18n.t("diary:dateRangeUntil", { date });
    }
    return i18n.t("diary:allTime");
  }, [datePeriod.startDate, datePeriod.endDate]);

  const setDateRangePreset = useCallback(
    (days: number) => {
      const now = new Date();

      const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1, 0, 0, 0, 0);
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      setCalendarRange({ startDate, endDate, markedDates: {} });
      setDatePeriod({ type: "custom", startDate, endDate });
    },
    []
  );

  const setCustomDateRange = useCallback(
    (startDate: Date, endDate: Date) => {
      setCalendarRange({ startDate, endDate, markedDates: {} });
      setDatePeriod({ type: "custom", startDate, endDate });
    },
    []
  );

  // =============================================================================
  // ACTIONS
  // =============================================================================

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    const version = loadVersionRef.current;

    try {
      setIsLoadingMore(true);

      if (isAuthenticated) {
        // Authenticated: fetch next page from API
        const nextPage = page + 1;
        const apiParams: Record<string, any> = {
          page: nextPage,
          per_page: ITEMS_PER_PAGE,
          tz: deviceTz,
        };
        if (debouncedQuery) apiParams.q = debouncedQuery;
        if (datePeriod.startDate) apiParams.start_date = formatDateToString(datePeriod.startDate);
        if (datePeriod.endDate) apiParams.end_date = formatDateToString(datePeriod.endDate);
        if (params?.mealType) apiParams.meal_type = params.mealType;
        if (params?.sortOption) apiParams.order_by = SORT_TO_ORDER_BY[params.sortOption];
        if (params?.wouldEatAgain !== undefined) apiParams.would_eat_again = params.wouldEatAgain;

        const response = await entryApi.list(apiParams);
        if (loadVersionRef.current !== version) return;
        const mapped = response.data.map(apiEntryToEntry);

        if (mapped.length > 0) {
          setEntries((prev) => [...prev, ...mapped]);
          setPage(nextPage);
        }
        setHasMore(response.meta.page < response.meta.total_pages);
      } else {
        // Guest: paginate from local storage
        const filter: EntryFilter = {};
        if (debouncedQuery) filter.searchQuery = debouncedQuery;
        if (datePeriod.startDate) filter.startDate = datePeriod.startDate;
        if (datePeriod.endDate) filter.endDate = datePeriod.endDate;
        if (params?.mealType) filter.mealType = apiMealTypeToEnum(params.mealType);
        if (params?.wouldEatAgain) filter.wouldEatAgain = params.wouldEatAgain;

        const loadedEntries = await entryStorageUtils.getEntriesFiltered(filter);
        if (loadVersionRef.current !== version) return;
        const startIndex = page * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const newEntries = loadedEntries.slice(startIndex, endIndex);

        if (newEntries.length > 0) {
          setEntries((prev) => [...prev, ...newEntries]);
          setPage((prev) => prev + 1);
        }
        setHasMore(endIndex < loadedEntries.length);
      }
    } catch (err) {
      if (loadVersionRef.current !== version) return;
      captureError(err, { tags: { feature: "search-entries", action: "load_more_entries" } });
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, debouncedQuery, datePeriod.startDate, datePeriod.endDate, page, isAuthenticated, deviceTz, params?.mealType, params?.sortOption, params?.wouldEatAgain]);

  const refetch = useCallback(async () => {
    setPage(1);
    setHasMore(true);
  }, []);

  const handleSortMethodSelect = useCallback(
    (method: SortMethod) => {
      setSortMethod(method);
    },
    [setSortMethod]
  );

  // =============================================================================
  // RETURN
  // =============================================================================

  return {
    // Data
    sections: sortedSections,
    entries,

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
    setCustomDateRange,
    setDateRangePreset,
    clearDateRange,

    // Actions
    loadMore,
    refetch,
    handleSortMethodSelect,
  };
}
