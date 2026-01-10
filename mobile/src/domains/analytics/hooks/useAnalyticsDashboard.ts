import { useState, useEffect, useCallback, useMemo } from "react";
import { useAnalyticsStore, type TimePeriod } from "../stores/analyticsStore";

// =============================================================================
// TYPES (Interface-First Design)
// =============================================================================

export interface CalendarRangeState {
  startDate: Date | null;
  endDate: Date | null;
  markedDates: Record<string, any>;
}

export interface UseAnalyticsDashboardReturn {
  // Period state
  globalPeriod: TimePeriod;
  handlePeriodChange: (period: "day" | "week" | "month") => void;

  // Calendar state
  showCalendarModal: boolean;
  setShowCalendarModal: (show: boolean) => void;
  calendarRange: CalendarRangeState;
  markedDates: Record<string, any>;

  // Calendar actions
  handleDayPress: (day: { dateString: string }) => void;
  clearDateRange: () => void;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useAnalyticsDashboard(primaryColor: string, textColor: string): UseAnalyticsDashboardReturn {
  const { globalPeriod, setGlobalPeriod } = useAnalyticsStore();

  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});

  const [calendarRange, setCalendarRange] = useState<CalendarRangeState>({
    startDate: null,
    endDate: null,
    markedDates: {},
  });

  // Update calendar marked dates when period changes
  useEffect(() => {
    updateMarkedDates();
  }, [globalPeriod]);

  const updateMarkedDates = useCallback(() => {
    const marked: Record<string, any> = {};

    if (globalPeriod.type === "custom" && globalPeriod.startDate && globalPeriod.endDate) {
      const start = new Date(globalPeriod.startDate);
      const end = new Date(globalPeriod.endDate);

      const startDateString = start.toISOString().split("T")[0];
      if (startDateString) {
        marked[startDateString] = {
          startingDay: true,
          color: primaryColor,
          textColor: "white",
        };
      }

      const endDateString = end.toISOString().split("T")[0];
      if (endDateString) {
        marked[endDateString] = {
          endingDay: true,
          color: primaryColor,
          textColor: "white",
        };
      }

      const currentDate = new Date(start);
      currentDate.setDate(currentDate.getDate() + 1);

      while (currentDate < end) {
        const dateString = currentDate.toISOString().split("T")[0];
        if (dateString) {
          marked[dateString] = {
            color: primaryColor,
            textColor: "white",
          };
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    setMarkedDates(marked);
  }, [globalPeriod, primaryColor]);

  const updateCalendarRange = useCallback(
    (start: Date | null, end: Date | null) => {
      const newMarkedDates: Record<string, any> = {};

      if (start && !end) {
        const dateString = start.toISOString().split("T")[0];
        if (dateString) {
          newMarkedDates[dateString] = {
            startingDay: true,
            color: primaryColor,
            textColor: "white",
          };
        }
      } else if (start && end) {
        const startString = start.toISOString().split("T")[0];
        const endString = end.toISOString().split("T")[0];

        if (startString && endString && startString === endString) {
          newMarkedDates[startString] = {
            startingDay: true,
            endingDay: true,
            color: primaryColor,
            textColor: "white",
          };
        } else if (startString && endString) {
          newMarkedDates[startString] = {
            startingDay: true,
            color: primaryColor,
            textColor: "white",
          };
          newMarkedDates[endString] = {
            endingDay: true,
            color: primaryColor,
            textColor: "white",
          };

          const currentDate = new Date(start);
          currentDate.setDate(currentDate.getDate() + 1);

          while (currentDate < end) {
            const dateString = currentDate.toISOString().split("T")[0];
            if (dateString) {
              newMarkedDates[dateString] = {
                color: primaryColor + "40",
                textColor: textColor,
              };
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      }

      setCalendarRange({ startDate: start, endDate: end, markedDates: newMarkedDates });

      if (start && end) {
        setGlobalPeriod({
          type: "custom",
          startDate: start,
          endDate: end,
        });
      }
    },
    [primaryColor, textColor, setGlobalPeriod]
  );

  const clearDateRange = useCallback(() => {
    setCalendarRange({ startDate: null, endDate: null, markedDates: {} });
    setGlobalPeriod({ type: "day" });
  }, [setGlobalPeriod]);

  const handlePeriodChange = useCallback(
    (newPeriod: "day" | "week" | "month") => {
      setGlobalPeriod({ type: newPeriod });
    },
    [setGlobalPeriod]
  );

  const handleDayPress = useCallback(
    (day: { dateString: string }) => {
      const selectedDate = new Date(day.dateString);
      const { startDate, endDate } = calendarRange;

      if (!startDate || (startDate && endDate)) {
        updateCalendarRange(selectedDate, null);
      } else if (startDate && !endDate) {
        if (selectedDate >= startDate) {
          updateCalendarRange(startDate, selectedDate);
        } else {
          updateCalendarRange(selectedDate, null);
        }
      }
    },
    [calendarRange, updateCalendarRange]
  );

  return {
    // Period state
    globalPeriod,
    handlePeriodChange,

    // Calendar state
    showCalendarModal,
    setShowCalendarModal,
    calendarRange,
    markedDates,

    // Calendar actions
    handleDayPress,
    clearDateRange,
  };
}
