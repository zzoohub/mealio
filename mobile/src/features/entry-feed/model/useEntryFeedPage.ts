import { useState, useEffect, useCallback, useMemo } from "react";
import type { Entry } from "@/entities/entry";
import { useIsAuthenticated } from "@/shared/lib/auth";
import { entryStorageUtils, useEntryListQuery } from "@/entities/entry";
import { getWeekDays, isSameDay, formatDateToString } from "@/shared/lib/utils";
import { MealType } from "@/entities/meal";
import type { ApiDiaryEntry } from "@/shared/api";

// =============================================================================
// TYPES (Interface-First Design)
// =============================================================================

export interface UseEntryFeedPageReturn {
  // Date state
  selectedDate: Date;
  formattedMonthYear: string;
  today: Date;

  // Data
  entries: Entry[];
  datesWithEntries: Set<string>;

  // States
  isLoading: boolean;
  error: Error | null;

  // Derived data
  markedDates: Record<string, { marked: boolean; dotColor: string; selected?: boolean; selectedColor?: string }>;

  // Actions
  selectDate: (date: Date) => void;
  handleCalendarDayPress: (day: { dateString: string }) => void;
  handleVisibleWeekChange: (days: Date[]) => void;

  // Utilities
  dateHasEntries: (date: Date) => boolean;
  isSameDay: (date1: Date, date2: Date) => boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function apiEntryToEntry(apiEntry: ApiDiaryEntry): Entry {
  const mealTypeMap: Record<string, MealType> = {
    breakfast: MealType.BREAKFAST,
    lunch: MealType.LUNCH,
    dinner: MealType.DINNER,
    snack: MealType.SNACK,
    dessert: MealType.DESSERT,
    drink: MealType.DRINK,
    other: MealType.OTHER,
  };

  return {
    id: String(apiEntry.id),
    userId: String(apiEntry.user_id),
    timestamp: new Date(apiEntry.eaten_at),
    notes: apiEntry.notes ?? "",
    meal: {
      photoUri: "",
      mealType: mealTypeMap[apiEntry.meal_type] ?? MealType.OTHER,
    },
    createdAt: new Date(apiEntry.created_at),
    updatedAt: new Date(apiEntry.updated_at),
  };
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useEntryFeedPage(primaryColor: string): UseEntryFeedPageReturn {
  const isAuthenticated = useIsAuthenticated();

  // State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visibleWeekDays, setVisibleWeekDays] = useState<Date[]>(() => getWeekDays(new Date()));
  const [guestEntries, setGuestEntries] = useState<Entry[]>([]);
  const [isGuestLoading, setIsGuestLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [datesWithEntries, setDatesWithEntries] = useState<Set<string>>(new Set());

  const today = useMemo(() => new Date(), []);

  // Date string for API query
  const selectedDateStr = useMemo(() => formatDateToString(selectedDate), [selectedDate]);

  // Auth mode: API query for selected date
  const diaryQuery = useEntryListQuery({ start_date: selectedDateStr, end_date: selectedDateStr }, isAuthenticated);

  const apiEntries = useMemo(() => {
    if (!isAuthenticated || !diaryQuery.data) return [];
    return diaryQuery.data.data.map(apiEntryToEntry).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [isAuthenticated, diaryQuery.data]);

  // Handle visible week change from WeekDaySelector swipe
  const handleVisibleWeekChange = useCallback((days: Date[]) => {
    setVisibleWeekDays(days);
  }, []);

  // Guest mode: load all entries to determine markers
  useEffect(() => {
    if (isAuthenticated) return;

    const loadAllEntries = async () => {
      try {
        const loadedEntries = await entryStorageUtils.getAllEntries();
        const datesSet = new Set<string>();
        loadedEntries.forEach(entry => {
          datesSet.add(formatDateToString(entry.timestamp));
        });

        setDatesWithEntries(datesSet);
      } catch (err) {
        console.error("Error loading all entries:", err);
        setError(err instanceof Error ? err : new Error("Failed to load entries"));
      }
    };

    loadAllEntries();
  }, [isAuthenticated]);

  // Auth mode: build datesWithEntries from API response
  useEffect(() => {
    if (!isAuthenticated || !diaryQuery.data) return;
    const datesSet = new Set<string>();
    diaryQuery.data.data.forEach(entry => {
      datesSet.add(formatDateToString(new Date(entry.eaten_at)));
    });
    setDatesWithEntries(prev => {
      const merged = new Set(prev);
      datesSet.forEach(d => merged.add(d));
      return merged;
    });
  }, [isAuthenticated, diaryQuery.data]);

  // Guest mode: load entries for selected date
  useEffect(() => {
    if (isAuthenticated) return;

    const loadEntriesForDate = async () => {
      setIsGuestLoading(true);
      setError(null);
      try {
        const entriesForDate = await entryStorageUtils.getEntriesForDate(selectedDate);
        entriesForDate.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setGuestEntries(entriesForDate);
      } catch (err) {
        console.error("Error loading entries for date:", err);
        setGuestEntries([]);
        setError(err instanceof Error ? err : new Error("Failed to load entries for date"));
      } finally {
        setIsGuestLoading(false);
      }
    };

    loadEntriesForDate();
  }, [selectedDate, isAuthenticated]);

  // Unified entries and loading state
  const entries = isAuthenticated ? apiEntries : guestEntries;
  const isLoading = isAuthenticated ? diaryQuery.isLoading : isGuestLoading;

  // =============================================================================
  // ACTIONS
  // =============================================================================

  const selectDate = useCallback(
    (date: Date) => {
      if (date > today && !isSameDay(date, today)) {
        return;
      }
      setSelectedDate(date);
    },
    [today],
  );

  const handleCalendarDayPress = useCallback(
    (day: { dateString: string }) => {
      const selectedDateFromCalendar = new Date(day.dateString + "T12:00:00");
      if (selectedDateFromCalendar > today && !isSameDay(selectedDateFromCalendar, today)) {
        return;
      }
      setSelectedDate(selectedDateFromCalendar);
    },
    [today],
  );

  // =============================================================================
  // DERIVED DATA
  // =============================================================================

  const dateHasEntries = useCallback(
    (date: Date): boolean => {
      return datesWithEntries.has(formatDateToString(date));
    },
    [datesWithEntries],
  );

  const formattedMonthYear = useMemo(() => {
    if (visibleWeekDays.length === 0) return "";
    const middleDate = visibleWeekDays[3];
    if (!middleDate) return "";
    return middleDate.toLocaleDateString("ko-KR", { month: "long", year: "numeric" });
  }, [visibleWeekDays]);

  const markedDates = useMemo(() => {
    const marks: Record<string, { marked: boolean; dotColor: string; selected?: boolean; selectedColor?: string }> = {};

    datesWithEntries.forEach(dateStr => {
      marks[dateStr] = {
        marked: true,
        dotColor: primaryColor,
      };
    });

    const selectedDateStrMark = formatDateToString(selectedDate);
    if (marks[selectedDateStrMark]) {
      marks[selectedDateStrMark] = {
        ...marks[selectedDateStrMark],
        selected: true,
        selectedColor: primaryColor,
      };
    } else {
      marks[selectedDateStrMark] = {
        marked: false,
        dotColor: primaryColor,
        selected: true,
        selectedColor: primaryColor,
      };
    }

    return marks;
  }, [datesWithEntries, selectedDate, primaryColor]);

  // =============================================================================
  // RETURN
  // =============================================================================

  return {
    selectedDate,
    formattedMonthYear,
    today,
    entries,
    datesWithEntries,
    isLoading,
    error,
    markedDates,
    selectDate,
    handleCalendarDayPress,
    handleVisibleWeekChange,
    dateHasEntries,
    isSameDay,
  };
}
