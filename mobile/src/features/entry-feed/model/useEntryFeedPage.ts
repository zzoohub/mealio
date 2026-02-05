import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import type { Entry } from "@/entities/entry";
import { useIsAuthenticated } from "@/shared/lib/auth";
import { entryStorageUtils, useEntryListQuery, useGuestEntryStore, useUploadQueueStore } from "@/entities/entry";
import { getWeekDays, isSameDay, formatDateToString } from "@/shared/lib/utils";
import { getCurrentLanguage } from "@/shared/lib/i18n";
import { MealType } from "@/entities/meal";
import type { ApiDiaryEntry } from "@/shared/api";
import { useWeekThumbnailsQuery } from "./useWeekThumbnailsQuery";
import { useMonthThumbnailsQuery } from "./useMonthThumbnailsQuery";

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
  dateThumbnails: Map<string, string | null>;
  calendarThumbnails: Map<string, string | null>;

  // States
  isLoading: boolean;
  error: Error | null;

  // Derived data
  markedDates: Record<string, { marked: boolean; dotColor: string; selected?: boolean; selectedColor?: string }>;

  // Actions
  selectDate: (date: Date) => void;
  handleCalendarDayPress: (day: { dateString: string }) => void;
  handleVisibleWeekChange: (days: Date[]) => void;
  handleCalendarMonthChange: (date: { dateString: string; year: number; month: number }) => void;

  // Utilities
  dateHasEntries: (date: Date) => boolean;
  isSameDay: (date1: Date, date2: Date) => boolean;
  retryUpload: (tempId: string) => void;
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
      photoUri: apiEntry.primary_photo_url ?? "",
      photoUris: apiEntry.photo_urls?.length ? apiEntry.photo_urls : undefined,
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
  const guestVersion = useGuestEntryStore((s) => s.version);

  // State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visibleWeekDays, setVisibleWeekDays] = useState<Date[]>(() => getWeekDays(new Date()));
  const [guestEntries, setGuestEntries] = useState<Entry[]>([]);
  const [isGuestLoading, setIsGuestLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [dateThumbnails, setDateThumbnails] = useState<Map<string, string | null>>(new Map());
  const [calendarThumbnails, setCalendarThumbnails] = useState<Map<string, string | null>>(new Map());
  const [calendarMonthRange, setCalendarMonthRange] = useState<{ startDate: string; endDate: string } | null>(null);

  const today = useMemo(() => new Date(), []);

  // Device timezone for API date filtering
  const deviceTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  // Date string for API query
  const selectedDateStr = useMemo(() => formatDateToString(selectedDate), [selectedDate]);

  // Week range for thumbnail query
  const weekRange = useMemo(() => {
    if (visibleWeekDays.length === 0) return { startDate: selectedDateStr, endDate: selectedDateStr };
    const start = visibleWeekDays[0];
    const end = visibleWeekDays[visibleWeekDays.length - 1];
    return {
      startDate: start ? formatDateToString(start) : selectedDateStr,
      endDate: end ? formatDateToString(end) : selectedDateStr,
    };
  }, [visibleWeekDays, selectedDateStr]);

  // Auth mode: API query for selected date
  const diaryQuery = useEntryListQuery({ start_date: selectedDateStr, end_date: selectedDateStr, tz: deviceTz }, isAuthenticated);

  // Auth mode: API query for visible week range (thumbnails)
  const weekQuery = useWeekThumbnailsQuery(weekRange.startDate, weekRange.endDate, isAuthenticated, deviceTz);

  // Auth mode: API query for calendar month range (thumbnails for bottom sheet calendar)
  const monthQuery = useMonthThumbnailsQuery(
    calendarMonthRange?.startDate ?? "",
    calendarMonthRange?.endDate ?? "",
    isAuthenticated && !!calendarMonthRange,
    deviceTz,
  );

  const apiEntries = useMemo(() => {
    if (!isAuthenticated || !diaryQuery.data) return [];
    return diaryQuery.data.data.map(apiEntryToEntry).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [isAuthenticated, diaryQuery.data]);

  // Handle visible week change from WeekDaySelector swipe
  const handleVisibleWeekChange = useCallback((days: Date[]) => {
    setVisibleWeekDays(days);
  }, []);

  // Guest mode: load all entries to determine markers + thumbnails
  useEffect(() => {
    if (isAuthenticated) return;

    const loadAllEntries = async () => {
      try {
        const loadedEntries = await entryStorageUtils.getAllEntries();
        const thumbnailMap = new Map<string, string | null>();
        loadedEntries.forEach(entry => {
          const dateStr = formatDateToString(entry.timestamp);
          // Keep the first photo found per date (entries are most recent first)
          if (!thumbnailMap.has(dateStr)) {
            thumbnailMap.set(dateStr, entry.meal.photoUri || null);
          }
        });

        setDateThumbnails(thumbnailMap);
      } catch (err) {
        console.error("Error loading all entries:", err);
        setError(err instanceof Error ? err : new Error("Failed to load entries"));
      }
    };

    loadAllEntries();
  }, [isAuthenticated, guestVersion]);

  // Auth mode: build dateThumbnails from week query response
  useEffect(() => {
    if (!isAuthenticated || !weekQuery.data) return;
    const thumbnailMap = new Map<string, string | null>();
    weekQuery.data.data.forEach(entry => {
      const dateStr = formatDateToString(new Date(entry.eaten_at));
      // Keep the first photo found per date (entries come sorted by eaten_at DESC)
      if (!thumbnailMap.has(dateStr)) {
        thumbnailMap.set(dateStr, entry.primary_photo_url);
      }
    });
    setDateThumbnails(thumbnailMap);
  }, [isAuthenticated, weekQuery.data]);

  // Auth mode: build calendarThumbnails from month query response
  // Clear the queried range first, then merge fresh data so deleted entries are removed
  useEffect(() => {
    if (!isAuthenticated || !monthQuery.data || !calendarMonthRange) return;
    setCalendarThumbnails(prev => {
      const next = new Map(prev);

      // Remove stale entries in the queried range before merging fresh data
      const rangeStart = calendarMonthRange.startDate;
      const rangeEnd = calendarMonthRange.endDate;
      for (const dateStr of next.keys()) {
        if (dateStr >= rangeStart && dateStr <= rangeEnd) {
          next.delete(dateStr);
        }
      }

      monthQuery.data!.data.forEach(entry => {
        const dateStr = formatDateToString(new Date(entry.eaten_at));
        next.set(dateStr, entry.primary_photo_url);
      });
      return next;
    });
  }, [isAuthenticated, monthQuery.data, calendarMonthRange]);

  // Guest mode: calendarThumbnails is the same as dateThumbnails (all entries are loaded)
  useEffect(() => {
    if (isAuthenticated) return;
    setCalendarThumbnails(dateThumbnails);
  }, [isAuthenticated, dateThumbnails]);

  // Guest mode: load entries for selected date
  useEffect(() => {
    if (isAuthenticated) return;

    const loadEntriesForDate = async () => {
      setIsGuestLoading(true);
      setError(null);
      try {
        const entriesForDate = await entryStorageUtils.getEntriesForDate(selectedDate);
        entriesForDate.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
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
  }, [selectedDate, isAuthenticated, guestVersion]);

  // Guest mode: refresh data when screen regains focus (e.g. after deleting an entry in detail)
  const isInitialFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated || isInitialFocus.current) {
        isInitialFocus.current = false;
        return;
      }

      const reload = async () => {
        try {
          const loadedEntries = await entryStorageUtils.getAllEntries();
          const thumbnailMap = new Map<string, string | null>();
          loadedEntries.forEach(entry => {
            const dateStr = formatDateToString(entry.timestamp);
            if (!thumbnailMap.has(dateStr)) {
              thumbnailMap.set(dateStr, entry.meal.photoUri || null);
            }
          });
          setDateThumbnails(thumbnailMap);

          const entriesForDate = await entryStorageUtils.getEntriesForDate(selectedDate);
          entriesForDate.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          setGuestEntries(entriesForDate);
        } catch (err) {
          console.error("Error reloading guest entries:", err);
        }
      };

      reload();
    }, [isAuthenticated, selectedDate]),
  );

  // Upload queue: merge pending uploads into entries for authenticated mode
  const uploadQueue = useUploadQueueStore((s) => s.queue);
  const retryUpload = useUploadQueueStore((s) => s.retry);

  const pendingEntries = useMemo((): Entry[] => {
    if (!isAuthenticated) return [];
    const dateStr = formatDateToString(selectedDate);
    // Deduplicate: skip pending entries whose real counterpart already exists in API data
    const apiTimestamps = new Set(apiEntries.map((e) => Math.floor(e.timestamp.getTime() / 1000)));
    const items: Entry[] = [];
    for (const item of uploadQueue.values()) {
      if (formatDateToString(item.entry.timestamp) === dateStr) {
        // If the API already has an entry at the same second, the upload completed — skip
        if (apiTimestamps.has(Math.floor(item.entry.timestamp.getTime() / 1000))) continue;
        items.push({
          id: item.tempId,
          userId: item.entry.userId,
          timestamp: item.entry.timestamp,
          notes: item.entry.notes,
          location: item.entry.location,
          meal: {
            ...item.entry.meal,
            photoUri: item.photoUris[0] ?? "",
            photoUris: item.photoUris,
          },
          createdAt: item.createdAt,
          updatedAt: item.createdAt,
          _uploadStatus: item.status,
        });
      }
    }
    return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [isAuthenticated, uploadQueue, selectedDate, apiEntries]);

  // Unified entries and loading state
  const baseEntries = isAuthenticated ? apiEntries : guestEntries;
  const entries = isAuthenticated ? [...pendingEntries, ...baseEntries] : baseEntries;
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

  const handleCalendarMonthChange = useCallback(
    (date: { dateString: string; year: number; month: number }) => {
      const year = date.year;
      const month = String(date.month).padStart(2, "0");
      const lastDay = new Date(date.year, date.month, 0).getDate();
      setCalendarMonthRange({
        startDate: `${year}-${month}-01`,
        endDate: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
      });
    },
    [],
  );

  // =============================================================================
  // DERIVED DATA
  // =============================================================================

  const dateHasEntries = useCallback(
    (date: Date): boolean => {
      return dateThumbnails.has(formatDateToString(date));
    },
    [dateThumbnails],
  );

  const formattedMonthYear = useMemo(() => {
    if (visibleWeekDays.length === 0) return "";
    const middleDate = visibleWeekDays[3];
    if (!middleDate) return "";
    return middleDate.toLocaleDateString(getCurrentLanguage(), { month: "long", year: "numeric" });
  }, [visibleWeekDays]);

  const markedDates = useMemo(() => {
    const marks: Record<string, { marked: boolean; dotColor: string; selected?: boolean; selectedColor?: string }> = {};

    dateThumbnails.forEach((_url, dateStr) => {
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
  }, [dateThumbnails, selectedDate, primaryColor]);

  // =============================================================================
  // RETURN
  // =============================================================================

  return {
    selectedDate,
    formattedMonthYear,
    today,
    entries,
    dateThumbnails,
    calendarThumbnails,
    isLoading,
    error,
    markedDates,
    selectDate,
    handleCalendarDayPress,
    handleVisibleWeekChange,
    handleCalendarMonthChange,
    dateHasEntries,
    isSameDay,
    retryUpload,
  };
}
