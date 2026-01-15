import { useState, useCallback, useEffect } from "react";
import type { Entry, EntryFilter } from "@/entities/entry";
import { MealType, type NutritionInfo } from "@/entities/meal";
import { storage } from "@/shared/lib/storage";
import { GUEST_LIMITS, ERROR_MESSAGES } from "@/shared/config";

const ENTRIES_STORAGE_KEY = "@diary_entries";

// =============================================================================
// GUEST ENTRY LIMIT
// =============================================================================

export class GuestEntryLimitError extends Error {
  constructor() {
    super(ERROR_MESSAGES.GUEST_ENTRY_LIMIT_REACHED);
    this.name = "GuestEntryLimitError";
  }
}

// =============================================================================
// HELPERS
// =============================================================================

const generateEntryId = (): string => {
  return `entry_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// =============================================================================
// ENTRY STORAGE UTILS
// =============================================================================

export const entryStorageUtils = {
  canGuestSaveEntry: async (isLoggedIn: boolean): Promise<boolean> => {
    if (isLoggedIn) return true;
    const entries = await entryStorageUtils.getAllEntries();
    return entries.length < GUEST_LIMITS.MAX_ENTRIES;
  },

  getGuestEntriesRemaining: async (isLoggedIn: boolean): Promise<number> => {
    if (isLoggedIn) return Infinity;
    const entries = await entryStorageUtils.getAllEntries();
    return Math.max(0, GUEST_LIMITS.MAX_ENTRIES - entries.length);
  },

  getEntryCount: async (): Promise<number> => {
    const entries = await entryStorageUtils.getAllEntries();
    return entries.length;
  },

  saveEntry: async (
    entry: Omit<Entry, "id" | "createdAt" | "updatedAt">,
    isLoggedIn: boolean = false
  ): Promise<Entry> => {
    try {
      if (!isLoggedIn) {
        const canSave = await entryStorageUtils.canGuestSaveEntry(isLoggedIn);
        if (!canSave) {
          throw new GuestEntryLimitError();
        }
      }

      const newEntry: Entry = {
        ...entry,
        id: generateEntryId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingEntries = await entryStorageUtils.getAllEntries();
      const updatedEntries = [newEntry, ...existingEntries];

      await storage.set(ENTRIES_STORAGE_KEY, updatedEntries);
      return newEntry;
    } catch (error) {
      if (error instanceof GuestEntryLimitError) {
        throw error;
      }
      console.error("Error saving entry:", error);
      throw new Error("Failed to save entry");
    }
  },

  updateEntry: async (
    entryId: string,
    updates: Partial<Omit<Entry, "id" | "createdAt">>
  ): Promise<Entry> => {
    try {
      const entries = await entryStorageUtils.getAllEntries();
      const entryIndex = entries.findIndex((e) => e.id === entryId);

      if (entryIndex === -1) {
        throw new Error("Entry not found");
      }

      const existingEntry = entries[entryIndex]!;
      const updatedEntry: Entry = {
        ...existingEntry,
        ...updates,
        id: existingEntry.id,
        createdAt: existingEntry.createdAt,
        updatedAt: new Date(),
        meal: updates.meal
          ? { ...existingEntry.meal, ...updates.meal }
          : existingEntry.meal,
      };

      entries[entryIndex] = updatedEntry;
      await storage.set(ENTRIES_STORAGE_KEY, entries);

      return updatedEntry;
    } catch (error) {
      console.error("Error updating entry:", error);
      throw new Error("Failed to update entry");
    }
  },

  getEntryById: async (entryId: string): Promise<Entry | null> => {
    try {
      const entries = await entryStorageUtils.getAllEntries();
      return entries.find((e) => e.id === entryId) || null;
    } catch (error) {
      console.error("Error getting entry:", error);
      return null;
    }
  },

  getAllEntries: async (): Promise<Entry[]> => {
    try {
      const entries = await storage.get<Entry[]>(ENTRIES_STORAGE_KEY, []);
      if (!entries || entries.length === 0) return [];
      return entries.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
        createdAt: new Date(entry.createdAt),
        updatedAt: new Date(entry.updatedAt),
      }));
    } catch (error) {
      console.error("Error getting entries:", error);
      return [];
    }
  },

  getEntriesFiltered: async (filter: EntryFilter = {}): Promise<Entry[]> => {
    try {
      let entries = await entryStorageUtils.getAllEntries();

      entries = entries.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );

      if (filter.startDate) {
        entries = entries.filter((e) => e.timestamp >= filter.startDate!);
      }

      if (filter.endDate) {
        entries = entries.filter((e) => e.timestamp <= filter.endDate!);
      }

      if (filter.mealType) {
        entries = entries.filter((e) => e.meal.mealType === filter.mealType);
      }

      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        entries = entries.filter(
          (e) =>
            e.notes.toLowerCase().includes(query) ||
            e.meal.ingredients?.some((ing) =>
              ing.toLowerCase().includes(query)
            )
        );
      }

      return entries;
    } catch (error) {
      console.error("Error filtering entries:", error);
      return [];
    }
  },

  getRecentEntries: async (limit: number = 8): Promise<Entry[]> => {
    try {
      const entries = await entryStorageUtils.getAllEntries();
      return entries
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error("Error getting recent entries:", error);
      return [];
    }
  },

  getEntriesForDate: async (date: Date): Promise<Entry[]> => {
    const startOfDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const endOfDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59
    );

    return entryStorageUtils.getEntriesFiltered({
      startDate: startOfDay,
      endDate: endOfDay,
    });
  },

  getTodaysEntries: async (): Promise<Entry[]> => {
    return entryStorageUtils.getEntriesForDate(new Date());
  },

  deleteEntry: async (entryId: string): Promise<void> => {
    try {
      const entries = await entryStorageUtils.getAllEntries();
      const filteredEntries = entries.filter((e) => e.id !== entryId);
      await storage.set(ENTRIES_STORAGE_KEY, filteredEntries);
    } catch (error) {
      console.error("Error deleting entry:", error);
      throw new Error("Failed to delete entry");
    }
  },

  clearAllEntries: async (): Promise<void> => {
    try {
      await storage.remove(ENTRIES_STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing entries:", error);
      throw new Error("Failed to clear entries");
    }
  },

  getNutritionStats: async (
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalEntries: number;
    averageCalories: number;
    totalNutrition: NutritionInfo;
  }> => {
    try {
      const entries = await entryStorageUtils.getEntriesFiltered({
        startDate,
        endDate,
      });

      if (entries.length === 0) {
        return {
          totalEntries: 0,
          averageCalories: 0,
          totalNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        };
      }

      const totalNutrition = entries.reduce(
        (acc, entry) => ({
          calories: acc.calories + (entry.meal.nutrition?.calories || 0),
          protein: acc.protein + (entry.meal.nutrition?.protein || 0),
          carbs: acc.carbs + (entry.meal.nutrition?.carbs || 0),
          fat: acc.fat + (entry.meal.nutrition?.fat || 0),
          fiber: (acc.fiber || 0) + (entry.meal.nutrition?.fiber || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
      );

      return {
        totalEntries: entries.length,
        averageCalories: Math.round(totalNutrition.calories / entries.length),
        totalNutrition,
      };
    } catch (error) {
      console.error("Error getting nutrition stats:", error);
      return {
        totalEntries: 0,
        averageCalories: 0,
        totalNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      };
    }
  },
};

// =============================================================================
// HOOK
// =============================================================================

interface UseEntryStorageOptions {
  isLoggedIn?: boolean;
}

export const useEntryStorage = (options: UseEntryStorageOptions = {}) => {
  const { isLoggedIn = false } = options;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loadedEntries = await entryStorageUtils.getAllEntries();
      setEntries(loadedEntries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entries");
    } finally {
      setLoading(false);
    }
  }, []);

  const canSaveEntry = useCallback(async (): Promise<boolean> => {
    return entryStorageUtils.canGuestSaveEntry(isLoggedIn);
  }, [isLoggedIn]);

  const getEntriesRemaining = useCallback(async (): Promise<number> => {
    return entryStorageUtils.getGuestEntriesRemaining(isLoggedIn);
  }, [isLoggedIn]);

  const entriesRemaining = isLoggedIn
    ? Infinity
    : Math.max(0, GUEST_LIMITS.MAX_ENTRIES - entries.length);

  const isAtGuestLimit = !isLoggedIn && entries.length >= GUEST_LIMITS.MAX_ENTRIES;

  const saveEntry = useCallback(
    async (entry: Omit<Entry, "id" | "createdAt" | "updatedAt">) => {
      setError(null);
      try {
        const newEntry = await entryStorageUtils.saveEntry(entry, isLoggedIn);
        setEntries((prev) => [newEntry, ...prev]);
        return newEntry;
      } catch (err) {
        if (err instanceof GuestEntryLimitError) {
          setError(err.message);
          throw err;
        }
        const errorMessage =
          err instanceof Error ? err.message : "Failed to save entry";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [isLoggedIn]
  );

  const updateEntry = useCallback(
    async (
      entryId: string,
      updates: Partial<Omit<Entry, "id" | "createdAt">>
    ) => {
      setError(null);
      try {
        const updatedEntry = await entryStorageUtils.updateEntry(
          entryId,
          updates
        );
        setEntries((prev) =>
          prev.map((e) => (e.id === entryId ? updatedEntry : e))
        );
        return updatedEntry;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update entry";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  const deleteEntry = useCallback(async (entryId: string) => {
    setError(null);
    try {
      await entryStorageUtils.deleteEntry(entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete entry";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getEntriesFiltered = useCallback(
    async (filter: EntryFilter = {}) => {
      setError(null);
      try {
        return await entryStorageUtils.getEntriesFiltered(filter);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to filter entries";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  const getRecentEntries = useCallback(async (limit: number = 8) => {
    setError(null);
    try {
      return await entryStorageUtils.getRecentEntries(limit);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get recent entries";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getTodaysEntries = useCallback(async () => {
    setError(null);
    try {
      return await entryStorageUtils.getTodaysEntries();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get today's entries";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getNutritionStats = useCallback(
    async (startDate: Date, endDate: Date) => {
      setError(null);
      try {
        return await entryStorageUtils.getNutritionStats(startDate, endDate);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get nutrition stats";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  const clearAllEntries = useCallback(async () => {
    setError(null);
    try {
      await entryStorageUtils.clearAllEntries();
      setEntries([]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to clear entries";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    entries,
    loading,
    error,
    loadEntries,
    saveEntry,
    updateEntry,
    deleteEntry,
    getEntriesFiltered,
    getRecentEntries,
    getTodaysEntries,
    getNutritionStats,
    clearAllEntries,
    canSaveEntry,
    getEntriesRemaining,
    entriesRemaining,
    isAtGuestLimit,
    utils: entryStorageUtils,
  };
};

// =============================================================================
// MOCK DATA GENERATOR
// =============================================================================

export function generateMockEntries(): Entry[] {
  const mockEntries: Entry[] = [
    {
      id: "entry_1",
      userId: "user_1",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      notes: "",
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        address: "San Francisco, CA",
      },
      meal: {
        photoUri: "https://via.placeholder.com/300x200",
        mealType: MealType.LUNCH,
        nutrition: { calories: 380, protein: 32, carbs: 18, fat: 22, fiber: 8 },
        ingredients: ["Grilled chicken", "Mixed greens", "Tomatoes"],
      },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: "entry_2",
      userId: "user_1",
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      notes: "Perfect start to the day!",
      meal: {
        photoUri: "https://via.placeholder.com/300x200",
        mealType: MealType.BREAKFAST,
        nutrition: { calories: 320, protein: 12, carbs: 45, fat: 8, fiber: 6 },
        ingredients: ["Oats", "Yogurt", "Berries"],
      },
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
  ];

  return mockEntries;
}
