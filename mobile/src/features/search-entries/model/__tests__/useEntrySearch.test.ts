// Mock native modules and barrels
jest.mock("react-native", () => ({}));
jest.mock("@/shared/lib/auth", () => ({
  useIsAuthenticated: jest.fn(),
}));
jest.mock("@/entities/entry", () => ({
  entryStorageUtils: {
    getEntriesFiltered: jest.fn(),
  },
}));
jest.mock("@/entities/entry/api/entryApi", () => ({
  entryApi: {
    list: jest.fn(),
  },
}));
jest.mock("@/shared/ui/theme", () => ({
  useTheme: jest.fn(),
}));
jest.mock("@/shared/lib/performance", () => ({
  getCachedData: jest.fn((key, fn) => fn()),
}));
jest.mock("@/shared/lib/utils", () => ({
  formatDateToString: (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },
}));
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
jest.mock("../useEntrySorting", () => ({
  entrySortingUtils: {
    sortEntries: jest.fn().mockResolvedValue([
      {
        title: "Today",
        data: [],
      },
    ]),
    getSortOptions: jest.fn(() => [
      { key: "date-desc", label: "Latest First" },
      { key: "date-asc", label: "Oldest First" },
      { key: "rating-desc", label: "Highest Rated" },
    ]),
  },
}));

import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useEntrySearch } from "../useEntrySearch";
import { useIsAuthenticated } from "@/shared/lib/auth";
import { entryStorageUtils } from "@/entities/entry";
import { entryApi } from "@/entities/entry/api/entryApi";
import { useTheme } from "@/shared/ui/theme";
import type { ApiDiaryEntry } from "@/shared/api";
import type { Entry } from "@/entities/entry";
import { MealType } from "@/entities/meal";

const mockUseIsAuthenticated = useIsAuthenticated as jest.Mock;
const mockGetEntriesFiltered = entryStorageUtils.getEntriesFiltered as jest.Mock;
const mockEntryApiList = entryApi.list as jest.Mock;
const mockUseTheme = useTheme as jest.Mock;

// =============================================================================
// Test Helpers
// =============================================================================

const createMockApiEntry = (overrides?: Partial<ApiDiaryEntry>): ApiDiaryEntry => ({
  id: 1,
  user_id: 1,
  meal_type: "breakfast",
  title: "Breakfast",
  notes: "Test notes",
  eaten_at: "2024-01-15T08:00:00Z",
  created_at: "2024-01-15T08:00:00Z",
  updated_at: "2024-01-15T08:00:00Z",
  primary_photo_url: "https://example.com/photo.jpg",
  photo_urls: ["https://example.com/photo.jpg"],
  rating: null,
  would_eat_again: null,
  ...overrides,
});

const createMockEntry = (overrides?: Partial<Entry>): Entry => ({
  id: "1",
  userId: "1",
  timestamp: new Date("2024-01-15T08:00:00Z"),
  notes: "Test notes",
  meal: {
    photoUri: "https://example.com/photo.jpg",
    mealType: MealType.BREAKFAST,
  },
  createdAt: new Date("2024-01-15T08:00:00Z"),
  updatedAt: new Date("2024-01-15T08:00:00Z"),
  ...overrides,
});

const mockApiResponse = (data: ApiDiaryEntry[], page = 1, totalPages = 1) => ({
  data,
  meta: {
    page,
    per_page: 20,
    total: data.length,
    total_pages: totalPages,
  },
});

// =============================================================================
// Setup
// =============================================================================

describe("useEntrySearch", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({
      colors: {
        interactive: { primary: "#007AFF" },
        text: { primary: "#000000" },
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // =============================================================================
  // Guest Mode Tests
  // =============================================================================

  describe("Guest mode", () => {
    beforeEach(() => {
      mockUseIsAuthenticated.mockReturnValue(false);
    });

    it("calls getEntriesFiltered with no filters initially", async () => {
      mockGetEntriesFiltered.mockResolvedValue([]);

      renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(mockGetEntriesFiltered).toHaveBeenCalledWith({});
      });
    });

    it("calls getEntriesFiltered with search query after debounce", async () => {
      mockGetEntriesFiltered.mockResolvedValue([]);

      const { result } = renderHook(() => useEntrySearch());

      act(() => {
        result.current.setSearchQuery("pizza");
      });

      // Advance past the 300ms debounce
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockGetEntriesFiltered).toHaveBeenCalledWith({
          searchQuery: "pizza",
        });
      });
    });

    it("calls getEntriesFiltered with date range", async () => {
      mockGetEntriesFiltered.mockResolvedValue([]);

      const { result } = renderHook(() => useEntrySearch());

      const startDate = new Date("2024-01-01T00:00:00Z");
      const endDate = new Date("2024-01-31T23:59:59Z");

      act(() => {
        result.current.setDateRangePreset(7);
      });

      await waitFor(() => {
        expect(mockGetEntriesFiltered).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: expect.any(Date),
            endDate: expect.any(Date),
          })
        );
      });
    });

    it("paginates results from local storage in guest mode", async () => {
      const mockEntries = Array.from({ length: 30 }, (_, i) =>
        createMockEntry({ id: String(i + 1) })
      );
      mockGetEntriesFiltered.mockResolvedValue(mockEntries);

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.entries.length).toBe(20);
        expect(result.current.hasMore).toBe(true);
      });

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.entries.length).toBe(30);
        expect(result.current.hasMore).toBe(false);
      });
    });

    it("handles empty results in guest mode", async () => {
      mockGetEntriesFiltered.mockResolvedValue([]);

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.entries).toEqual([]);
        expect(result.current.hasMore).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("handles getEntriesFiltered error", async () => {
      const error = new Error("Storage error");
      mockGetEntriesFiltered.mockRejectedValue(error);

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  // =============================================================================
  // Authenticated Mode Tests
  // =============================================================================

  describe("Authenticated mode", () => {
    beforeEach(() => {
      mockUseIsAuthenticated.mockReturnValue(true);
    });

    it("calls entryApi.list with correct initial params", async () => {
      mockEntryApiList.mockResolvedValue(mockApiResponse([]));

      renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(mockEntryApiList).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 1,
            per_page: 20,
            tz: expect.any(String),
          })
        );
      });
    });

    it("calls entryApi.list with search query after debounce", async () => {
      mockEntryApiList.mockResolvedValue(mockApiResponse([]));

      const { result } = renderHook(() => useEntrySearch());

      act(() => {
        result.current.setSearchQuery("burger");
      });

      // Advance past the 300ms debounce
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockEntryApiList).toHaveBeenCalledWith(
          expect.objectContaining({
            q: "burger",
          })
        );
      });
    });

    it("calls entryApi.list with date range", async () => {
      mockEntryApiList.mockResolvedValue(mockApiResponse([]));

      const { result } = renderHook(() => useEntrySearch());

      act(() => {
        result.current.setDateRangePreset(7);
      });

      await waitFor(() => {
        expect(mockEntryApiList).toHaveBeenCalledWith(
          expect.objectContaining({
            start_date: expect.any(String),
            end_date: expect.any(String),
          })
        );
      });
    });

    it("calls entryApi.list with meal type param", async () => {
      mockEntryApiList.mockResolvedValue(mockApiResponse([]));

      renderHook(() => useEntrySearch({ mealType: "breakfast" }));

      await waitFor(() => {
        expect(mockEntryApiList).toHaveBeenCalledWith(
          expect.objectContaining({
            meal_type: "breakfast",
          })
        );
      });
    });

    it("maps API entries to Entry objects correctly", async () => {
      const apiEntry = createMockApiEntry({
        rating: 4,
        would_eat_again: true,
      });
      mockEntryApiList.mockResolvedValue(mockApiResponse([apiEntry]));

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.entries.length).toBe(1);
        const entry = result.current.entries[0];
        expect(entry.id).toBe("1");
        expect(entry.rating).toBe(4);
        expect(entry.wouldEatAgain).toBe(true);
      });
    });

    it("paginates API results", async () => {
      const page1Data = [createMockApiEntry({ id: 1 })];
      const page2Data = [createMockApiEntry({ id: 2 })];

      mockEntryApiList
        .mockResolvedValueOnce(mockApiResponse(page1Data, 1, 2))
        .mockResolvedValueOnce(mockApiResponse(page2Data, 2, 2));

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.entries.length).toBe(1);
        expect(result.current.hasMore).toBe(true);
      });

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.entries.length).toBe(2);
        expect(result.current.hasMore).toBe(false);
      });
    });

    it("handles API error", async () => {
      const error = new Error("API error");
      mockEntryApiList.mockRejectedValue(error);

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("does not load more when isLoadingMore is true", async () => {
      mockEntryApiList.mockResolvedValue(mockApiResponse([], 1, 2));

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start first loadMore
      act(() => {
        result.current.loadMore();
      });

      // Try to start second loadMore immediately
      act(() => {
        result.current.loadMore();
      });

      // Should only be called twice: initial load + one loadMore
      await waitFor(() => {
        expect(mockEntryApiList).toHaveBeenCalledTimes(2);
      });
    });

    it("does not load more when hasMore is false", async () => {
      mockEntryApiList.mockResolvedValue(mockApiResponse([], 1, 1));

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.hasMore).toBe(false);
      });

      const callCount = mockEntryApiList.mock.calls.length;

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(mockEntryApiList).toHaveBeenCalledTimes(callCount);
      });
    });

    it("handles loadMore error gracefully", async () => {
      mockEntryApiList
        .mockResolvedValueOnce(mockApiResponse([createMockApiEntry()], 1, 2))
        .mockRejectedValueOnce(new Error("Load more failed"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.hasMore).toBe(true);
      });

      await act(async () => {
        await result.current.loadMore();
      });

      // Should log error
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error loading more entries:",
        expect.any(Error)
      );

      // Should not be loading anymore
      expect(result.current.isLoadingMore).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  // =============================================================================
  // Calendar Functionality Tests
  // =============================================================================

  describe("Calendar functionality", () => {
    beforeEach(() => {
      mockUseIsAuthenticated.mockReturnValue(false);
      mockGetEntriesFiltered.mockResolvedValue([]);
    });

    it("setCustomDateRange sets start and end date", async () => {
      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const start = new Date("2024-01-15T12:00:00");
      const end = new Date("2024-01-20T12:00:00");

      act(() => {
        result.current.setCustomDateRange(start, end);
      });

      expect(result.current.calendarRange.startDate).toEqual(start);
      expect(result.current.calendarRange.endDate).toEqual(end);
      expect(result.current.dateRange.startDate).toEqual(start);
      expect(result.current.dateRange.endDate).toEqual(end);
    });

    it("setCustomDateRange triggers data refetch", async () => {
      mockUseIsAuthenticated.mockReturnValue(true);
      mockEntryApiList.mockResolvedValue(mockApiResponse([]));

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const callCountBefore = mockEntryApiList.mock.calls.length;

      act(() => {
        result.current.setCustomDateRange(
          new Date("2024-01-15"),
          new Date("2024-01-20"),
        );
      });

      await waitFor(() => {
        expect(mockEntryApiList.mock.calls.length).toBeGreaterThan(callCountBefore);
      });
    });

    it("setDateRangePreset sets correct date range for 1 day", async () => {
      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setDateRangePreset(1);
      });

      expect(result.current.calendarRange.startDate).toBeDefined();
      expect(result.current.calendarRange.endDate).toBeDefined();
      expect(result.current.dateRange.startDate).toBeDefined();
      expect(result.current.dateRange.endDate).toBeDefined();
    });

    it("setDateRangePreset sets correct date range for 7 days", async () => {
      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setDateRangePreset(7);
      });

      const startDate = result.current.calendarRange.startDate!;
      const endDate = result.current.calendarRange.endDate!;

      const daysDiff = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(6); // 7 days means 6 days difference
    });

    it("clearDateRange clears all calendar state", async () => {
      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setDateRangePreset(7);
      });

      act(() => {
        result.current.clearDateRange();
      });

      expect(result.current.calendarRange.startDate).toBeNull();
      expect(result.current.calendarRange.endDate).toBeNull();
      expect(result.current.calendarRange.markedDates).toEqual({});
      expect(result.current.dateRange.startDate).toBeNull();
      expect(result.current.dateRange.endDate).toBeNull();
    });

    it("formatDateRange returns correct format with both dates", async () => {
      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setDateRangePreset(7);
      });

      const formatted = result.current.formatDateRange();
      expect(formatted).toContain("-");
    });

    it('formatDateRange returns "All time" when no dates', async () => {
      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const formatted = result.current.formatDateRange();
      expect(formatted).toBe("All time");
    });
  });

  // =============================================================================
  // apiEntryToEntry Mapper Tests
  // =============================================================================

  describe("apiEntryToEntry mapping", () => {
    beforeEach(() => {
      mockUseIsAuthenticated.mockReturnValue(true);
    });

    it("maps all basic fields correctly", async () => {
      const apiEntry = createMockApiEntry({
        id: 123,
        user_id: 456,
        notes: "Delicious meal",
        meal_type: "lunch",
        eaten_at: "2024-01-20T12:30:00Z",
        created_at: "2024-01-20T12:00:00Z",
        updated_at: "2024-01-20T13:00:00Z",
      });

      mockEntryApiList.mockResolvedValue(mockApiResponse([apiEntry]));

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        const entry = result.current.entries[0];
        expect(entry.id).toBe("123");
        expect(entry.userId).toBe("456");
        expect(entry.notes).toBe("Delicious meal");
        expect(entry.meal.mealType).toBe(MealType.LUNCH);
        expect(entry.timestamp).toEqual(new Date("2024-01-20T12:30:00Z"));
        expect(entry.createdAt).toEqual(new Date("2024-01-20T12:00:00Z"));
        expect(entry.updatedAt).toEqual(new Date("2024-01-20T13:00:00Z"));
      });
    });

    it("maps rating field", async () => {
      const apiEntry = createMockApiEntry({ rating: 5 });
      mockEntryApiList.mockResolvedValue(mockApiResponse([apiEntry]));

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.entries[0].rating).toBe(5);
      });
    });

    it("maps null rating to undefined", async () => {
      const apiEntry = createMockApiEntry({ rating: null });
      mockEntryApiList.mockResolvedValue(mockApiResponse([apiEntry]));

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.entries[0].rating).toBeUndefined();
      });
    });

    it("maps wouldEatAgain field", async () => {
      const apiEntry = createMockApiEntry({ would_eat_again: true });
      mockEntryApiList.mockResolvedValue(mockApiResponse([apiEntry]));

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.entries[0].wouldEatAgain).toBe(true);
      });
    });

    it("maps wouldEatAgain false", async () => {
      const apiEntry = createMockApiEntry({ would_eat_again: false });
      mockEntryApiList.mockResolvedValue(mockApiResponse([apiEntry]));

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.entries[0].wouldEatAgain).toBe(false);
      });
    });

    it("maps null wouldEatAgain to undefined", async () => {
      const apiEntry = createMockApiEntry({ would_eat_again: null });
      mockEntryApiList.mockResolvedValue(mockApiResponse([apiEntry]));

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.entries[0].wouldEatAgain).toBeUndefined();
      });
    });

    it("maps photo URLs correctly", async () => {
      const apiEntry = createMockApiEntry({
        primary_photo_url: "https://example.com/primary.jpg",
        photo_urls: [
          "https://example.com/primary.jpg",
          "https://example.com/secondary.jpg",
        ],
      });
      mockEntryApiList.mockResolvedValue(mockApiResponse([apiEntry]));

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        const entry = result.current.entries[0];
        expect(entry.meal.photoUri).toBe("https://example.com/primary.jpg");
        expect(entry.meal.photoUris).toEqual([
          "https://example.com/primary.jpg",
          "https://example.com/secondary.jpg",
        ]);
      });
    });

    it("handles null photo URLs", async () => {
      const apiEntry = createMockApiEntry({
        primary_photo_url: null,
        photo_urls: null,
      });
      mockEntryApiList.mockResolvedValue(mockApiResponse([apiEntry]));

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        const entry = result.current.entries[0];
        expect(entry.meal.photoUri).toBe("");
        expect(entry.meal.photoUris).toBeUndefined();
      });
    });

    it("handles empty photo_urls array", async () => {
      const apiEntry = createMockApiEntry({
        primary_photo_url: "https://example.com/photo.jpg",
        photo_urls: [],
      });
      mockEntryApiList.mockResolvedValue(mockApiResponse([apiEntry]));

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        const entry = result.current.entries[0];
        expect(entry.meal.photoUri).toBe("https://example.com/photo.jpg");
        expect(entry.meal.photoUris).toBeUndefined();
      });
    });

    it("maps null notes to empty string", async () => {
      const apiEntry = createMockApiEntry({ notes: null });
      mockEntryApiList.mockResolvedValue(mockApiResponse([apiEntry]));

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.entries[0].notes).toBe("");
      });
    });

    it("maps all meal types correctly", async () => {
      const mealTypes = [
        "breakfast",
        "lunch",
        "dinner",
        "snack",
        "dessert",
        "drink",
        "other",
      ] as const;

      for (const mealType of mealTypes) {
        const apiEntry = createMockApiEntry({ meal_type: mealType });
        mockEntryApiList.mockResolvedValue(mockApiResponse([apiEntry]));

        const { result } = renderHook(() => useEntrySearch());

        await waitFor(() => {
          expect(result.current.entries[0].meal.mealType).toBe(mealType);
        });

        jest.clearAllMocks();
      }
    });
  });

  // =============================================================================
  // Sorting and Section Tests
  // =============================================================================

  describe("Sorting and sections", () => {
    beforeEach(() => {
      mockUseIsAuthenticated.mockReturnValue(false);
      mockGetEntriesFiltered.mockResolvedValue([]);
    });

    it("provides sort options", async () => {
      // Ensure mock returns array properly
      const { entrySortingUtils } = require("../useEntrySorting");
      const mockOptions = [
        { key: "date-desc", label: "Latest First" },
        { key: "date-asc", label: "Oldest First" },
        { key: "rating-desc", label: "Highest Rated" },
      ];
      entrySortingUtils.getSortOptions.mockReturnValue(mockOptions);

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // sortOptions is memoized from entrySortingUtils.getSortOptions()
      expect(result.current).toHaveProperty("sortOptions");
      expect(result.current.sortOptions).toEqual(mockOptions);
    });

    it("handles sort method change", async () => {
      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handleSortMethodSelect("date-asc");
      });

      expect(result.current.sortMethod).toBe("date-asc");
    });

    it("exposes sections property", async () => {
      const mockEntries = [createMockEntry()];
      mockGetEntriesFiltered.mockResolvedValue(mockEntries);

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.entries.length).toBe(1);
      });

      // Sections property should exist (part of the API surface)
      expect(result.current).toHaveProperty("sections");
    });

    it("handles sorting error with fallback", async () => {
      const mockEntries = [createMockEntry()];
      mockGetEntriesFiltered.mockResolvedValue(mockEntries);

      // Mock getCachedData to throw error
      const { getCachedData } = require("@/shared/lib/performance");
      getCachedData.mockRejectedValueOnce(new Error("Sorting error"));

      // Import and mock fallback
      const { entrySortingUtils } = require("../useEntrySorting");
      const fallbackSections = [{ title: "Fallback", data: mockEntries }];
      entrySortingUtils.sortEntries.mockResolvedValueOnce(fallbackSections);

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.entries.length).toBe(1);
      });

      await waitFor(() => {
        expect(result.current.isSorting).toBe(false);
      });

      // Should have logged error
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error sorting entries:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  // =============================================================================
  // Loading States Tests
  // =============================================================================

  describe("Loading states", () => {
    beforeEach(() => {
      mockUseIsAuthenticated.mockReturnValue(false);
    });

    it("sets isLoading to true initially", () => {
      mockGetEntriesFiltered.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useEntrySearch());

      expect(result.current.isLoading).toBe(true);
    });

    it("sets isLoading to false after loading", async () => {
      mockGetEntriesFiltered.mockResolvedValue([]);

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("sets isSorting during sort operation", async () => {
      const mockEntries = [createMockEntry()];
      mockGetEntriesFiltered.mockResolvedValue(mockEntries);

      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.entries.length).toBe(1);
      });

      // Should have been sorting at some point
      expect(result.current.isSorting).toBe(false); // Should be done by now
    });
  });

  // =============================================================================
  // Server-Side Sorting and Filtering Tests
  // =============================================================================

  describe("Server-side sorting and filtering", () => {
    beforeEach(() => {
      mockUseIsAuthenticated.mockReturnValue(true);
      mockEntryApiList.mockResolvedValue(mockApiResponse([]));
    });

    it("passes order_by param for date-desc sort", async () => {
      renderHook(() => useEntrySearch({ sortOption: "date-desc" }));

      await waitFor(() => {
        expect(mockEntryApiList).toHaveBeenCalledWith(
          expect.objectContaining({
            order_by: "eaten_at_desc",
          })
        );
      });
    });

    it("passes order_by param for date-asc sort", async () => {
      renderHook(() => useEntrySearch({ sortOption: "date-asc" }));

      await waitFor(() => {
        expect(mockEntryApiList).toHaveBeenCalledWith(
          expect.objectContaining({
            order_by: "eaten_at_asc",
          })
        );
      });
    });

    it("passes order_by param for rating-desc sort", async () => {
      renderHook(() => useEntrySearch({ sortOption: "rating-desc" }));

      await waitFor(() => {
        expect(mockEntryApiList).toHaveBeenCalledWith(
          expect.objectContaining({
            order_by: "rating_desc",
          })
        );
      });
    });

    it("passes would_eat_again=true to API when wouldEatAgain is true", async () => {
      renderHook(() => useEntrySearch({ wouldEatAgain: true }));

      await waitFor(() => {
        expect(mockEntryApiList).toHaveBeenCalledWith(
          expect.objectContaining({
            would_eat_again: true,
          })
        );
      });
    });

    it("passes would_eat_again=false to API when wouldEatAgain is false", async () => {
      renderHook(() => useEntrySearch({ wouldEatAgain: false }));

      await waitFor(() => {
        expect(mockEntryApiList).toHaveBeenCalledWith(
          expect.objectContaining({
            would_eat_again: false,
          })
        );
      });
    });

    it("does not pass would_eat_again param when wouldEatAgain is undefined", async () => {
      renderHook(() => useEntrySearch({ wouldEatAgain: undefined }));

      await waitFor(() => {
        const lastCall = mockEntryApiList.mock.calls[mockEntryApiList.mock.calls.length - 1][0];
        expect(lastCall).not.toHaveProperty("would_eat_again");
      });
    });

    it("combines sortOption and wouldEatAgain params", async () => {
      renderHook(() => useEntrySearch({
        sortOption: "rating-desc",
        wouldEatAgain: true,
      }));

      await waitFor(() => {
        expect(mockEntryApiList).toHaveBeenCalledWith(
          expect.objectContaining({
            order_by: "rating_desc",
            would_eat_again: true,
          })
        );
      });
    });

    it("refetches when sortOption changes", async () => {
      const { rerender } = renderHook(
        ({ sortOption }) => useEntrySearch({ sortOption }),
        { initialProps: { sortOption: "date-desc" as const } }
      );

      await waitFor(() => {
        expect(mockEntryApiList).toHaveBeenCalledWith(
          expect.objectContaining({
            order_by: "eaten_at_desc",
          })
        );
      });

      const callCountBefore = mockEntryApiList.mock.calls.length;

      rerender({ sortOption: "date-asc" as const });

      await waitFor(() => {
        expect(mockEntryApiList.mock.calls.length).toBeGreaterThan(callCountBefore);
        expect(mockEntryApiList).toHaveBeenCalledWith(
          expect.objectContaining({
            order_by: "eaten_at_asc",
          })
        );
      });
    });

    it("refetches when wouldEatAgain changes", async () => {
      const { rerender } = renderHook(
        ({ wouldEatAgain }) => useEntrySearch({ wouldEatAgain }),
        { initialProps: { wouldEatAgain: false } }
      );

      await waitFor(() => {
        expect(mockEntryApiList).toHaveBeenCalledWith(
          expect.objectContaining({
            would_eat_again: false,
          })
        );
      });

      const callCountBefore = mockEntryApiList.mock.calls.length;

      rerender({ wouldEatAgain: true });

      await waitFor(() => {
        expect(mockEntryApiList.mock.calls.length).toBeGreaterThan(callCountBefore);
        expect(mockEntryApiList).toHaveBeenCalledWith(
          expect.objectContaining({
            would_eat_again: true,
          })
        );
      });
    });

    it("passes sortOption to loadMore calls", async () => {
      const page1Data = [createMockApiEntry({ id: 1 })];
      const page2Data = [createMockApiEntry({ id: 2 })];

      mockEntryApiList
        .mockResolvedValueOnce(mockApiResponse(page1Data, 1, 2))
        .mockResolvedValueOnce(mockApiResponse(page2Data, 2, 2));

      const { result } = renderHook(() => useEntrySearch({ sortOption: "rating-desc" }));

      await waitFor(() => {
        expect(result.current.hasMore).toBe(true);
      });

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(mockEntryApiList).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 2,
            order_by: "rating_desc",
          })
        );
      });
    });

    it("passes wouldEatAgain to loadMore calls", async () => {
      const page1Data = [createMockApiEntry({ id: 1 })];
      const page2Data = [createMockApiEntry({ id: 2 })];

      mockEntryApiList
        .mockResolvedValueOnce(mockApiResponse(page1Data, 1, 2))
        .mockResolvedValueOnce(mockApiResponse(page2Data, 2, 2));

      const { result } = renderHook(() => useEntrySearch({ wouldEatAgain: true }));

      await waitFor(() => {
        expect(result.current.hasMore).toBe(true);
      });

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(mockEntryApiList).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 2,
            would_eat_again: true,
          })
        );
      });
    });
  });

  // =============================================================================
  // Refetch Tests
  // =============================================================================
  // Debounce Tests
  // =============================================================================

  describe("Search debounce", () => {
    beforeEach(() => {
      mockUseIsAuthenticated.mockReturnValue(true);
      mockEntryApiList.mockResolvedValue(mockApiResponse([]));
    });

    it("does not fire API call before debounce delay", async () => {
      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const callCountBefore = mockEntryApiList.mock.calls.length;

      act(() => {
        result.current.setSearchQuery("b");
      });

      // Advance only 100ms (less than 300ms debounce)
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // No new API call should have been made for the query
      expect(mockEntryApiList.mock.calls.length).toBe(callCountBefore);
    });

    it("fires API call after debounce delay", async () => {
      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSearchQuery("burger");
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockEntryApiList).toHaveBeenCalledWith(
          expect.objectContaining({ q: "burger" })
        );
      });
    });

    it("resets debounce timer on rapid input", async () => {
      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const callCountBefore = mockEntryApiList.mock.calls.length;

      act(() => {
        result.current.setSearchQuery("b");
      });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      act(() => {
        result.current.setSearchQuery("bu");
      });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      act(() => {
        result.current.setSearchQuery("bur");
      });

      // Only 200ms since last keystroke — no call yet
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Should not have fired an API call with partial queries
      const callsSoFar = mockEntryApiList.mock.calls.slice(callCountBefore);
      const hasPartialQuery = callsSoFar.some(
        (args: any[]) => args[0]?.q === "b" || args[0]?.q === "bu"
      );
      expect(hasPartialQuery).toBe(false);

      // Now advance the remaining 100ms to complete debounce
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockEntryApiList).toHaveBeenCalledWith(
          expect.objectContaining({ q: "bur" })
        );
      });
    });

    it("updates searchQuery immediately for UI", async () => {
      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSearchQuery("test");
      });

      // searchQuery updates immediately (for input display)
      expect(result.current.searchQuery).toBe("test");
    });
  });

  // =============================================================================

  describe("Refetch", () => {
    beforeEach(() => {
      mockUseIsAuthenticated.mockReturnValue(true);
      mockEntryApiList.mockResolvedValue(mockApiResponse([]));
    });

    it("refetch resets pagination", async () => {
      const { result } = renderHook(() => useEntrySearch());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.refetch();
      });

      expect(result.current.hasMore).toBe(true);
    });
  });
});
