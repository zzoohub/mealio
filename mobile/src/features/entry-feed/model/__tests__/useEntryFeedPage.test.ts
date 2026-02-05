// Mock native modules and barrels
jest.mock("react-native", () => ({}));
jest.mock("@/shared/lib/auth", () => ({
  useIsAuthenticated: jest.fn(() => true),
}));
jest.mock("@/entities/entry", () => ({
  entryStorageUtils: {
    getAllEntries: jest.fn(),
    getEntriesForDate: jest.fn(),
  },
  useEntryListQuery: jest.fn(),
}));
jest.mock("@/shared/lib/utils", () => {
  return {
    getWeekDays: (date: Date) => {
      const days: Date[] = [];
      const day = new Date(date);
      day.setDate(day.getDate() - day.getDay());
      for (let i = 0; i < 7; i++) {
        days.push(new Date(day));
        day.setDate(day.getDate() + 1);
      }
      return days;
    },
    isSameDay: (date1: Date, date2: Date) =>
      date1.toDateString() === date2.toDateString(),
    formatDateToString: (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },
    triggerHaptic: jest.fn(),
  };
});
jest.mock("@/entities/meal", () => ({
  MealType: {
    BREAKFAST: "breakfast",
    LUNCH: "lunch",
    DINNER: "dinner",
    SNACK: "snack",
    DESSERT: "dessert",
    DRINK: "drink",
    OTHER: "other",
  },
}));
jest.mock("../useWeekThumbnailsQuery", () => ({
  useWeekThumbnailsQuery: jest.fn(),
}));
jest.mock("../useMonthThumbnailsQuery", () => ({
  useMonthThumbnailsQuery: jest.fn(),
}));
jest.mock("@/shared/lib/i18n", () => ({
  getCurrentLanguage: jest.fn(() => "en"),
}));

import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useEntryFeedPage } from "../useEntryFeedPage";
import { useIsAuthenticated } from "@/shared/lib/auth";
import { useEntryListQuery } from "@/entities/entry";
import { useWeekThumbnailsQuery } from "../useWeekThumbnailsQuery";
import { useMonthThumbnailsQuery } from "../useMonthThumbnailsQuery";

const mockUseIsAuthenticated = useIsAuthenticated as jest.Mock;
const mockUseEntryListQuery = useEntryListQuery as jest.Mock;
const mockUseWeekThumbnailsQuery = useWeekThumbnailsQuery as jest.Mock;
const mockUseMonthThumbnailsQuery = useMonthThumbnailsQuery as jest.Mock;

// =============================================================================
// useEntryFeedPage — calendar thumbnails merge tests
// =============================================================================

describe("useEntryFeedPage - calendar thumbnails merge", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsAuthenticated.mockReturnValue(true);
    mockUseEntryListQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
    });
    mockUseWeekThumbnailsQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
    });
    mockUseMonthThumbnailsQuery.mockReturnValue({
      data: null,
      isLoading: false,
    });
  });

  it("merges calendar thumbnails across different months", async () => {
    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    // Simulate first month data
    act(() => {
      mockUseMonthThumbnailsQuery.mockReturnValue({
        data: {
          data: [
            {
              id: 1,
              user_id: 1,
              meal_type: "breakfast",
              notes: null,
              eaten_at: "2024-01-15T08:00:00Z",
              created_at: "2024-01-15T08:00:00Z",
              updated_at: "2024-01-15T08:00:00Z",
              primary_photo_url: "https://example.com/jan-photo.jpg",
              photo_urls: ["https://example.com/jan-photo.jpg"],
            },
          ],
        },
        isLoading: false,
      });
    });

    // Trigger calendar month change for January
    act(() => {
      result.current.handleCalendarMonthChange({
        dateString: "2024-01-01",
        year: 2024,
        month: 1,
      });
    });

    // Wait for state update
    await waitFor(() => {
      expect(result.current.calendarThumbnails.size).toBeGreaterThan(0);
    });

    const januarySize = result.current.calendarThumbnails.size;

    // Simulate second month data (February)
    act(() => {
      mockUseMonthThumbnailsQuery.mockReturnValue({
        data: {
          data: [
            {
              id: 2,
              user_id: 1,
              meal_type: "lunch",
              notes: null,
              eaten_at: "2024-02-20T12:00:00Z",
              created_at: "2024-02-20T12:00:00Z",
              updated_at: "2024-02-20T12:00:00Z",
              primary_photo_url: "https://example.com/feb-photo.jpg",
              photo_urls: ["https://example.com/feb-photo.jpg"],
            },
          ],
        },
        isLoading: false,
      });
    });

    // Trigger calendar month change for February
    act(() => {
      result.current.handleCalendarMonthChange({
        dateString: "2024-02-01",
        year: 2024,
        month: 2,
      });
    });

    // Wait for state update
    await waitFor(() => {
      expect(result.current.calendarThumbnails.size).toBeGreaterThan(
        januarySize
      );
    });

    // Verify both months' thumbnails are present
    expect(result.current.calendarThumbnails.has("2024-01-15")).toBe(true);
    expect(result.current.calendarThumbnails.has("2024-02-20")).toBe(true);
  });

  it("preserves previous month thumbnails when loading new month", async () => {
    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    // Load January data
    act(() => {
      mockUseMonthThumbnailsQuery.mockReturnValue({
        data: {
          data: [
            {
              id: 1,
              user_id: 1,
              meal_type: "breakfast",
              notes: null,
              eaten_at: "2024-01-15T08:00:00Z",
              created_at: "2024-01-15T08:00:00Z",
              updated_at: "2024-01-15T08:00:00Z",
              primary_photo_url: "https://example.com/jan-photo.jpg",
              photo_urls: ["https://example.com/jan-photo.jpg"],
            },
          ],
        },
        isLoading: false,
      });
    });

    act(() => {
      result.current.handleCalendarMonthChange({
        dateString: "2024-01-01",
        year: 2024,
        month: 1,
      });
    });

    await waitFor(() => {
      expect(result.current.calendarThumbnails.has("2024-01-15")).toBe(true);
    });

    const januaryThumbnail =
      result.current.calendarThumbnails.get("2024-01-15");

    // Load February data
    act(() => {
      mockUseMonthThumbnailsQuery.mockReturnValue({
        data: {
          data: [
            {
              id: 2,
              user_id: 1,
              meal_type: "lunch",
              notes: null,
              eaten_at: "2024-02-20T12:00:00Z",
              created_at: "2024-02-20T12:00:00Z",
              updated_at: "2024-02-20T12:00:00Z",
              primary_photo_url: "https://example.com/feb-photo.jpg",
              photo_urls: ["https://example.com/feb-photo.jpg"],
            },
          ],
        },
        isLoading: false,
      });
    });

    act(() => {
      result.current.handleCalendarMonthChange({
        dateString: "2024-02-01",
        year: 2024,
        month: 2,
      });
    });

    await waitFor(() => {
      expect(result.current.calendarThumbnails.has("2024-02-20")).toBe(true);
    });

    // Verify January thumbnail is still present
    expect(result.current.calendarThumbnails.has("2024-01-15")).toBe(true);
    expect(result.current.calendarThumbnails.get("2024-01-15")).toBe(
      januaryThumbnail
    );
  });

  it("handles empty month data without clearing previous months", async () => {
    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    // Load January with data
    act(() => {
      mockUseMonthThumbnailsQuery.mockReturnValue({
        data: {
          data: [
            {
              id: 1,
              user_id: 1,
              meal_type: "breakfast",
              notes: null,
              eaten_at: "2024-01-15T08:00:00Z",
              created_at: "2024-01-15T08:00:00Z",
              updated_at: "2024-01-15T08:00:00Z",
              primary_photo_url: "https://example.com/jan-photo.jpg",
              photo_urls: ["https://example.com/jan-photo.jpg"],
            },
          ],
        },
        isLoading: false,
      });
    });

    act(() => {
      result.current.handleCalendarMonthChange({
        dateString: "2024-01-01",
        year: 2024,
        month: 1,
      });
    });

    await waitFor(() => {
      expect(result.current.calendarThumbnails.has("2024-01-15")).toBe(true);
    });

    // Load February with no data
    act(() => {
      mockUseMonthThumbnailsQuery.mockReturnValue({
        data: { data: [] },
        isLoading: false,
      });
    });

    act(() => {
      result.current.handleCalendarMonthChange({
        dateString: "2024-02-01",
        year: 2024,
        month: 2,
      });
    });

    // Wait a bit
    await waitFor(() => {
      expect(result.current.calendarThumbnails.size).toBeGreaterThanOrEqual(1);
    });

    // January should still be present
    expect(result.current.calendarThumbnails.has("2024-01-15")).toBe(true);
  });

  it("updates existing date thumbnail when reloading same month", async () => {
    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    // Load January data
    act(() => {
      mockUseMonthThumbnailsQuery.mockReturnValue({
        data: {
          data: [
            {
              id: 1,
              user_id: 1,
              meal_type: "breakfast",
              notes: null,
              eaten_at: "2024-01-15T08:00:00Z",
              created_at: "2024-01-15T08:00:00Z",
              updated_at: "2024-01-15T08:00:00Z",
              primary_photo_url: "https://example.com/old-photo.jpg",
              photo_urls: ["https://example.com/old-photo.jpg"],
            },
          ],
        },
        isLoading: false,
      });
    });

    act(() => {
      result.current.handleCalendarMonthChange({
        dateString: "2024-01-01",
        year: 2024,
        month: 1,
      });
    });

    await waitFor(() => {
      expect(result.current.calendarThumbnails.get("2024-01-15")).toBe(
        "https://example.com/old-photo.jpg"
      );
    });

    // Reload January with updated photo
    act(() => {
      mockUseMonthThumbnailsQuery.mockReturnValue({
        data: {
          data: [
            {
              id: 1,
              user_id: 1,
              meal_type: "breakfast",
              notes: null,
              eaten_at: "2024-01-15T08:00:00Z",
              created_at: "2024-01-15T08:00:00Z",
              updated_at: "2024-01-15T08:00:00Z",
              primary_photo_url: "https://example.com/new-photo.jpg",
              photo_urls: ["https://example.com/new-photo.jpg"],
            },
          ],
        },
        isLoading: false,
      });
    });

    act(() => {
      result.current.handleCalendarMonthChange({
        dateString: "2024-01-01",
        year: 2024,
        month: 1,
      });
    });

    await waitFor(() => {
      expect(result.current.calendarThumbnails.get("2024-01-15")).toBe(
        "https://example.com/new-photo.jpg"
      );
    });
  });

  it("builds correct month range for handleCalendarMonthChange", () => {
    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    act(() => {
      result.current.handleCalendarMonthChange({
        dateString: "2024-01-15",
        year: 2024,
        month: 1,
      });
    });

    // Check that month query was called
    expect(mockUseMonthThumbnailsQuery).toHaveBeenCalled();
  });

  it("handles month with different number of days", () => {
    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    // February (28 days in non-leap year)
    act(() => {
      result.current.handleCalendarMonthChange({
        dateString: "2023-02-01",
        year: 2023,
        month: 2,
      });
    });

    // January (31 days)
    act(() => {
      result.current.handleCalendarMonthChange({
        dateString: "2024-01-01",
        year: 2024,
        month: 1,
      });
    });

    // No errors should occur
    expect(result.current.calendarThumbnails).toBeDefined();
  });

  it("does not query month thumbnails when not authenticated", () => {
    mockUseIsAuthenticated.mockReturnValue(false);
    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    act(() => {
      result.current.handleCalendarMonthChange({
        dateString: "2024-01-01",
        year: 2024,
        month: 1,
      });
    });

    // Month query should be called with enabled=false
    const lastCall =
      mockUseMonthThumbnailsQuery.mock.calls[
        mockUseMonthThumbnailsQuery.mock.calls.length - 1
      ];
    expect(lastCall[2]).toBe(false); // enabled parameter
  });
});

// =============================================================================
// useEntryFeedPage — general functionality tests
// =============================================================================

describe("useEntryFeedPage - general functionality", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsAuthenticated.mockReturnValue(true);
    mockUseEntryListQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
    });
    mockUseWeekThumbnailsQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
    });
    mockUseMonthThumbnailsQuery.mockReturnValue({
      data: null,
      isLoading: false,
    });
  });

  it("initializes with today's date", () => {
    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    expect(result.current.selectedDate).toBeInstanceOf(Date);
    expect(result.current.today).toBeInstanceOf(Date);
  });

  it("prevents selecting future dates", () => {
    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const initialDate = result.current.selectedDate;

    act(() => {
      result.current.selectDate(futureDate);
    });

    // Date should not change
    expect(result.current.selectedDate).toEqual(initialDate);
  });

  it("allows selecting past dates", () => {
    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7);

    act(() => {
      result.current.selectDate(pastDate);
    });

    expect(result.current.selectedDate.getDate()).toBe(pastDate.getDate());
  });

  it("allows selecting today's date", () => {
    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    const today = new Date();

    act(() => {
      result.current.selectDate(today);
    });

    expect(result.current.selectedDate.toDateString()).toBe(
      today.toDateString()
    );
  });

  it("handles calendar day press", () => {
    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    act(() => {
      result.current.handleCalendarDayPress({
        dateString: "2024-01-15",
      });
    });

    expect(result.current.selectedDate.getDate()).toBe(15);
    expect(result.current.selectedDate.getMonth()).toBe(0); // January
    expect(result.current.selectedDate.getFullYear()).toBe(2024);
  });

  it("prevents calendar day press for future dates", () => {
    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const futureDateString = `${futureDate.getFullYear()}-${String(
      futureDate.getMonth() + 1
    ).padStart(2, "0")}-${String(futureDate.getDate()).padStart(2, "0")}`;

    const initialDate = result.current.selectedDate;

    act(() => {
      result.current.handleCalendarDayPress({
        dateString: futureDateString,
      });
    });

    // Date should not change
    expect(result.current.selectedDate).toEqual(initialDate);
  });

  it("builds week range from visible week days", () => {
    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    const weekDays = [
      new Date("2024-01-07"),
      new Date("2024-01-08"),
      new Date("2024-01-09"),
      new Date("2024-01-10"),
      new Date("2024-01-11"),
      new Date("2024-01-12"),
      new Date("2024-01-13"),
    ];

    act(() => {
      result.current.handleVisibleWeekChange(weekDays);
    });

    // Week query should be called with correct range
    const lastCall =
      mockUseWeekThumbnailsQuery.mock.calls[
        mockUseWeekThumbnailsQuery.mock.calls.length - 1
      ];
    expect(lastCall[0]).toBe("2024-01-07"); // startDate
    expect(lastCall[1]).toBe("2024-01-13"); // endDate
  });

  it("builds dateThumbnails from week query", async () => {
    mockUseWeekThumbnailsQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 1,
            user_id: 1,
            meal_type: "breakfast",
            notes: null,
            eaten_at: "2024-01-15T08:00:00Z",
            created_at: "2024-01-15T08:00:00Z",
            updated_at: "2024-01-15T08:00:00Z",
            primary_photo_url: "https://example.com/photo.jpg",
            photo_urls: ["https://example.com/photo.jpg"],
          },
        ],
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    await waitFor(() => {
      expect(result.current.dateThumbnails.size).toBeGreaterThan(0);
    });

    expect(result.current.dateThumbnails.has("2024-01-15")).toBe(true);
    expect(result.current.dateThumbnails.get("2024-01-15")).toBe(
      "https://example.com/photo.jpg"
    );
  });

  it("returns loading state from diary query", () => {
    mockUseEntryListQuery.mockReturnValue({
      data: null,
      isLoading: true,
    });

    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    expect(result.current.isLoading).toBe(true);
  });

  it("returns entries from diary query", () => {
    mockUseEntryListQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 1,
            user_id: 1,
            meal_type: "breakfast",
            notes: "Test notes",
            eaten_at: "2024-01-15T08:00:00Z",
            created_at: "2024-01-15T08:00:00Z",
            updated_at: "2024-01-15T08:00:00Z",
            primary_photo_url: "https://example.com/photo.jpg",
            photo_urls: ["https://example.com/photo.jpg"],
          },
        ],
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    expect(result.current.entries.length).toBe(1);
    expect(result.current.entries[0].id).toBe("1");
    expect(result.current.entries[0].notes).toBe("Test notes");
  });

  it("handles API response without photo_urls (backward compat)", () => {
    mockUseEntryListQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 1,
            user_id: 1,
            meal_type: "breakfast",
            notes: null,
            eaten_at: "2024-01-15T08:00:00Z",
            created_at: "2024-01-15T08:00:00Z",
            updated_at: "2024-01-15T08:00:00Z",
            primary_photo_url: "https://example.com/photo.jpg",
            // photo_urls intentionally omitted — old API response
          },
        ],
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    expect(result.current.entries.length).toBe(1);
    expect(result.current.entries[0].meal.photoUri).toBe("https://example.com/photo.jpg");
    expect(result.current.entries[0].meal.photoUris).toBeUndefined();
  });

  it("builds markedDates from dateThumbnails", async () => {
    mockUseWeekThumbnailsQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 1,
            user_id: 1,
            meal_type: "breakfast",
            notes: null,
            eaten_at: "2024-01-15T08:00:00Z",
            created_at: "2024-01-15T08:00:00Z",
            updated_at: "2024-01-15T08:00:00Z",
            primary_photo_url: "https://example.com/photo.jpg",
            photo_urls: ["https://example.com/photo.jpg"],
          },
        ],
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    await waitFor(() => {
      expect(result.current.markedDates["2024-01-15"]).toBeDefined();
    });

    expect(result.current.markedDates["2024-01-15"].marked).toBe(true);
    expect(result.current.markedDates["2024-01-15"].dotColor).toBe("#007AFF");
  });
});

// =============================================================================
// useEntryFeedPage — guest mode (unauthenticated) tests
// =============================================================================

describe("useEntryFeedPage - guest mode", () => {
  const { entryStorageUtils } = require("@/entities/entry");

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsAuthenticated.mockReturnValue(false);
    mockUseEntryListQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
    });
    mockUseWeekThumbnailsQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
    });
    mockUseMonthThumbnailsQuery.mockReturnValue({
      data: null,
      isLoading: false,
    });
  });

  it("loads all entries for thumbnails in guest mode", async () => {
    const mockEntries = [
      {
        id: "1",
        userId: "guest",
        timestamp: new Date("2024-01-15T08:00:00Z"),
        notes: "Breakfast",
        meal: {
          photoUri: "file:///photo1.jpg",
          mealType: "breakfast" as any,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        userId: "guest",
        timestamp: new Date("2024-01-16T12:00:00Z"),
        notes: "Lunch",
        meal: {
          photoUri: "file:///photo2.jpg",
          mealType: "lunch" as any,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    entryStorageUtils.getAllEntries.mockResolvedValue(mockEntries);

    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    await waitFor(() => {
      expect(result.current.dateThumbnails.size).toBeGreaterThan(0);
    });

    expect(entryStorageUtils.getAllEntries).toHaveBeenCalled();
    expect(result.current.dateThumbnails.has("2024-01-15")).toBe(true);
    expect(result.current.dateThumbnails.has("2024-01-16")).toBe(true);
  });

  it("handles getAllEntries error in guest mode", async () => {
    entryStorageUtils.getAllEntries.mockRejectedValue(
      new Error("Storage error")
    );
    entryStorageUtils.getEntriesForDate.mockResolvedValue([]);

    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toBe("Storage error");
  });

  it("loads entries for selected date in guest mode", async () => {
    const mockEntries = [
      {
        id: "1",
        userId: "guest",
        timestamp: new Date("2024-01-15T08:00:00Z"),
        notes: "Breakfast",
        meal: {
          photoUri: "file:///photo1.jpg",
          mealType: "breakfast" as any,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    entryStorageUtils.getAllEntries.mockResolvedValue([]);
    entryStorageUtils.getEntriesForDate.mockResolvedValue(mockEntries);

    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    await waitFor(() => {
      expect(result.current.entries.length).toBeGreaterThan(0);
    });

    expect(entryStorageUtils.getEntriesForDate).toHaveBeenCalled();
    expect(result.current.entries[0].id).toBe("1");
  });

  it("handles getEntriesForDate error in guest mode", async () => {
    entryStorageUtils.getAllEntries.mockResolvedValue([]);
    entryStorageUtils.getEntriesForDate.mockRejectedValue(
      new Error("Failed to load entries for date")
    );

    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toBe("Failed to load entries for date");
    expect(result.current.entries).toEqual([]);
  });

  it("uses dateThumbnails as calendarThumbnails in guest mode", async () => {
    const mockEntries = [
      {
        id: "1",
        userId: "guest",
        timestamp: new Date("2024-01-15T08:00:00Z"),
        notes: "Breakfast",
        meal: {
          photoUri: "file:///photo1.jpg",
          mealType: "breakfast" as any,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    entryStorageUtils.getAllEntries.mockResolvedValue(mockEntries);
    entryStorageUtils.getEntriesForDate.mockResolvedValue([]);

    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    await waitFor(() => {
      expect(result.current.calendarThumbnails.size).toBeGreaterThan(0);
    });

    // In guest mode, calendarThumbnails should match dateThumbnails
    expect(result.current.calendarThumbnails.has("2024-01-15")).toBe(true);
    expect(result.current.calendarThumbnails.get("2024-01-15")).toBe(
      "file:///photo1.jpg"
    );
  });

  it("returns guest loading state", async () => {
    entryStorageUtils.getAllEntries.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    entryStorageUtils.getEntriesForDate.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    // Should be loading initially
    expect(result.current.isLoading).toBe(true);
  });

  it("handles formattedMonthYear with empty visible week days", () => {
    entryStorageUtils.getAllEntries.mockResolvedValue([]);
    entryStorageUtils.getEntriesForDate.mockResolvedValue([]);

    const { result } = renderHook(() => useEntryFeedPage("#007AFF"));

    // formattedMonthYear should be derived from visibleWeekDays
    expect(result.current.formattedMonthYear).toBeDefined();
  });
});
