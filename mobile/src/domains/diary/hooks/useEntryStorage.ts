import { useState, useCallback, useEffect } from "react";
import { Entry, EntryFilter, Meal, MealType, NutritionInfo } from "../types";
import { storage } from "@/lib/storage";

const ENTRIES_STORAGE_KEY = "@diary_entries";

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
  // Save a new entry
  saveEntry: async (entry: Omit<Entry, "id" | "createdAt" | "updatedAt">): Promise<Entry> => {
    try {
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
      console.error("Error saving entry:", error);
      throw new Error("Failed to save entry");
    }
  },

  // Update an existing entry
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

  // Get a single entry by ID
  getEntryById: async (entryId: string): Promise<Entry | null> => {
    try {
      const entries = await entryStorageUtils.getAllEntries();
      return entries.find((e) => e.id === entryId) || null;
    } catch (error) {
      console.error("Error getting entry:", error);
      return null;
    }
  },

  // Get all entries
  getAllEntries: async (): Promise<Entry[]> => {
    try {
      const entries = await storage.get<Entry[]>(ENTRIES_STORAGE_KEY, []);
      if (!entries || entries.length === 0) return [];
      // Convert date strings back to Date objects
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

  // Get entries with filtering
  getEntriesFiltered: async (filter: EntryFilter = {}): Promise<Entry[]> => {
    try {
      let entries = await entryStorageUtils.getAllEntries();

      // Sort by timestamp (newest first)
      entries = entries.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );

      // Apply filters
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

  // Get recent entries (for dashboard)
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

  // Get entries for a specific date
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

  // Get entries for today
  getTodaysEntries: async (): Promise<Entry[]> => {
    return entryStorageUtils.getEntriesForDate(new Date());
  },

  // Delete an entry
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

  // Clear all entries (for testing/reset)
  clearAllEntries: async (): Promise<void> => {
    try {
      await storage.remove(ENTRIES_STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing entries:", error);
      throw new Error("Failed to clear entries");
    }
  },

  // Get nutrition statistics for a date range
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

export const useEntryStorage = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all entries on mount
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

  const saveEntry = useCallback(
    async (entry: Omit<Entry, "id" | "createdAt" | "updatedAt">) => {
      setError(null);
      try {
        const newEntry = await entryStorageUtils.saveEntry(entry);
        setEntries((prev) => [newEntry, ...prev]);
        return newEntry;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to save entry";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
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
        ingredients: [
          "Grilled chicken breast",
          "Mixed greens",
          "Cherry tomatoes",
          "Cucumber",
          "Olive oil dressing",
        ],
        aiAnalysis: {
          detectedMeals: ["chicken", "salad", "tomatoes"],
          confidence: 85,
          nutrition: { calories: 380, protein: 32, carbs: 18, fat: 22, fiber: 8 },
          mealCategory: MealType.LUNCH,
          ingredients: ["chicken", "lettuce", "tomatoes", "cucumber"],
          insights: {
            healthScore: 85,
            nutritionBalance: "High protein, low carbs",
            recommendations: ["Great protein source!", "Add some healthy fats"],
          },
        },
        isVerified: true,
      },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: "entry_2",
      userId: "user_1",
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      notes: "Perfect start to the day!",
      location: {
        latitude: 34.0522,
        longitude: -118.2437,
        address: "Los Angeles, CA",
      },
      meal: {
        photoUri: "https://via.placeholder.com/300x200",
        mealType: MealType.BREAKFAST,
        nutrition: { calories: 320, protein: 12, carbs: 45, fat: 8, fiber: 6 },
        ingredients: [
          "Rolled oats",
          "Greek yogurt",
          "Blueberries",
          "Chia seeds",
          "Honey",
        ],
        aiAnalysis: {
          detectedMeals: ["oats", "yogurt", "berries"],
          confidence: 92,
          nutrition: { calories: 320, protein: 12, carbs: 45, fat: 8, fiber: 6 },
          mealCategory: MealType.BREAKFAST,
          ingredients: ["oats", "yogurt", "blueberries", "seeds"],
          insights: {
            healthScore: 90,
            nutritionBalance: "High fiber, balanced macros",
            recommendations: [
              "Perfect breakfast choice!",
              "Good source of probiotics",
            ],
          },
        },
        isVerified: false,
      },
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      id: "entry_3",
      userId: "user_1",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      notes: "Dinner at home with family",
      location: {
        latitude: 40.7128,
        longitude: -74.006,
        address: "New York, NY",
      },
      meal: {
        photoUri: "https://via.placeholder.com/300x200",
        mealType: MealType.DINNER,
        nutrition: { calories: 520, protein: 35, carbs: 32, fat: 28, fiber: 4 },
        ingredients: [
          "Grilled salmon",
          "Roasted sweet potato",
          "Steamed broccoli",
          "Lemon",
        ],
        aiAnalysis: {
          detectedMeals: ["salmon", "sweet potato", "broccoli"],
          confidence: 88,
          nutrition: { calories: 520, protein: 35, carbs: 32, fat: 28, fiber: 4 },
          mealCategory: MealType.DINNER,
          ingredients: ["salmon", "sweet potato", "broccoli"],
          insights: {
            healthScore: 95,
            nutritionBalance: "Excellent omega-3 source",
            recommendations: [
              "Perfect balance of nutrients",
              "Great for heart health",
            ],
          },
        },
        isVerified: true,
      },
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  ];

  return mockEntries;
}

