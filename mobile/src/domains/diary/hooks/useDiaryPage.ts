import { useState, useEffect, useCallback, useMemo } from "react";
import { Meal } from "../types";
import { mealStorageUtils } from "./useMealStorage";
import { getWeekDays, isSameDay, formatDateToString } from "../utils/dateUtils";

// =============================================================================
// TYPES (Interface-First Design)
// =============================================================================

export interface UseDiaryPageReturn {
  // Date state
  selectedDate: Date;
  weekDays: Date[];
  formattedMonthYear: string;
  today: Date;

  // Data
  meals: Meal[];
  datesWithMeals: Set<string>;

  // States
  isLoading: boolean;
  error: Error | null;

  // Modal state
  showCalendarModal: boolean;
  setShowCalendarModal: (show: boolean) => void;

  // Derived data
  markedDates: Record<string, { marked: boolean; dotColor: string; selected?: boolean; selectedColor?: string }>;

  // Actions
  selectDate: (date: Date) => void;
  navigateToPreviousWeek: () => void;
  navigateToNextWeek: () => void;
  handleCalendarDayPress: (day: { dateString: string }) => void;

  // Utilities
  dateHasMeals: (date: Date) => boolean;
  isSameDay: (date1: Date, date2: Date) => boolean;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useDiaryPage(primaryColor: string): UseDiaryPageReturn {
  // State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [datesWithMeals, setDatesWithMeals] = useState<Set<string>>(new Set());
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const today = useMemo(() => new Date(), []);

  // Initialize week days
  useEffect(() => {
    setWeekDays(getWeekDays(selectedDate));
  }, []);

  // Update week when navigating
  const updateWeek = useCallback((date: Date) => {
    setWeekDays(getWeekDays(date));
  }, []);

  // Load all meals to determine markers
  useEffect(() => {
    const loadAllMeals = async () => {
      try {
        const loadedMeals = await mealStorageUtils.getAllMeals();

        // Create set of dates that have meals
        const datesSet = new Set<string>();
        loadedMeals.forEach((meal) => {
          const dateStr = meal.timestamp.toISOString().split("T")[0];
          if (dateStr) datesSet.add(dateStr);
        });
        setDatesWithMeals(datesSet);
      } catch (err) {
        console.error("Error loading all meals:", err);
        setError(err instanceof Error ? err : new Error("Failed to load meals"));
      }
    };

    loadAllMeals();
  }, []);

  // Load meals for selected date
  useEffect(() => {
    const loadMealsForDate = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const mealsForDate = await mealStorageUtils.getMealsForDate(selectedDate);
        // Sort by timestamp (newest first)
        mealsForDate.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setMeals(mealsForDate);
      } catch (err) {
        console.error("Error loading meals for date:", err);
        setMeals([]);
        setError(err instanceof Error ? err : new Error("Failed to load meals for date"));
      } finally {
        setIsLoading(false);
      }
    };

    loadMealsForDate();
  }, [selectedDate]);

  // =============================================================================
  // ACTIONS
  // =============================================================================

  const selectDate = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const navigateToPreviousWeek = useCallback(() => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
    updateWeek(newDate);
  }, [selectedDate, updateWeek]);

  const navigateToNextWeek = useCallback(() => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
    updateWeek(newDate);
  }, [selectedDate, updateWeek]);

  const handleCalendarDayPress = useCallback(
    (day: { dateString: string }) => {
      const selectedDateFromCalendar = new Date(day.dateString + "T12:00:00");
      setSelectedDate(selectedDateFromCalendar);
      updateWeek(selectedDateFromCalendar);
      setShowCalendarModal(false);
    },
    [updateWeek]
  );

  // =============================================================================
  // DERIVED DATA
  // =============================================================================

  const dateHasMeals = useCallback(
    (date: Date): boolean => {
      const dateStr = date.toISOString().split("T")[0];
      return dateStr ? datesWithMeals.has(dateStr) : false;
    },
    [datesWithMeals]
  );

  const formattedMonthYear = useMemo(() => {
    if (weekDays.length === 0) return "";
    const middleDate = weekDays[3];
    if (!middleDate) return "";
    return middleDate.toLocaleDateString("ko-KR", { month: "long", year: "numeric" });
  }, [weekDays]);

  const markedDates = useMemo(() => {
    const marks: Record<
      string,
      { marked: boolean; dotColor: string; selected?: boolean; selectedColor?: string }
    > = {};

    // Add dots for dates with meals
    datesWithMeals.forEach((dateStr) => {
      marks[dateStr] = {
        marked: true,
        dotColor: primaryColor,
      };
    });

    // Mark selected date
    const selectedDateStr = formatDateToString(selectedDate);
    if (marks[selectedDateStr]) {
      marks[selectedDateStr] = {
        ...marks[selectedDateStr],
        selected: true,
        selectedColor: primaryColor,
      };
    } else {
      marks[selectedDateStr] = {
        marked: false,
        dotColor: primaryColor,
        selected: true,
        selectedColor: primaryColor,
      };
    }

    return marks;
  }, [datesWithMeals, selectedDate, primaryColor]);

  // =============================================================================
  // RETURN
  // =============================================================================

  return {
    // Date state
    selectedDate,
    weekDays,
    formattedMonthYear,
    today,

    // Data
    meals,
    datesWithMeals,

    // States
    isLoading,
    error,

    // Modal state
    showCalendarModal,
    setShowCalendarModal,

    // Derived data
    markedDates,

    // Actions
    selectDate,
    navigateToPreviousWeek,
    navigateToNextWeek,
    handleCalendarDayPress,

    // Utilities
    dateHasMeals,
    isSameDay,
  };
}
