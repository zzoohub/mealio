import { useState, useCallback, useEffect } from "react";
import { Meal, MealHistoryFilter, MealType } from "../types";
import type { NutritionInfo } from "../types";
import { storage } from "@/lib/storage";

const MEALS_STORAGE_KEY = "@meal_log_meals";

// Helper function to generate unique meal IDs
const generateMealId = (): string => {
  return `meal_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// Meal storage utility functions
export const mealStorageUtils = {
  // Save a new meal
  saveMeal: async (meal: Omit<Meal, "id" | "createdAt" | "updatedAt">): Promise<Meal> => {
    try {
      const newMeal: Meal = {
        ...meal,
        id: generateMealId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingMeals = await mealStorageUtils.getAllMeals();
      const updatedMeals = [newMeal, ...existingMeals];

      await storage.set(MEALS_STORAGE_KEY, updatedMeals);
      return newMeal;
    } catch (error) {
      console.error("Error saving meal:", error);
      throw new Error("Failed to save meal");
    }
  },

  // Update an existing meal
  updateMeal: async (mealId: string, updates: Partial<Omit<Meal, "id" | "createdAt">>): Promise<Meal> => {
    try {
      const meals = await mealStorageUtils.getAllMeals();
      const mealIndex = meals.findIndex(meal => meal.id === mealId);

      if (mealIndex === -1) {
        throw new Error("Meal not found");
      }

      const existingMeal = meals[mealIndex]!;
      const updatedMeal: Meal = {
        id: existingMeal.id,
        userId: updates.userId ?? existingMeal.userId,
        name: updates.name ?? existingMeal.name,
        photoUri: updates.photoUri ?? existingMeal.photoUri,
        timestamp: updates.timestamp ?? existingMeal.timestamp,
        mealType: updates.mealType ?? existingMeal.mealType,
        nutrition: updates.nutrition ?? existingMeal.nutrition,
        ingredients: updates.ingredients ?? existingMeal.ingredients,
        aiAnalysis: updates.aiAnalysis ?? existingMeal.aiAnalysis,
        location: updates.location ?? existingMeal.location,
        notes: updates.notes ?? existingMeal.notes,
        isVerified: updates.isVerified ?? existingMeal.isVerified,
        createdAt: existingMeal.createdAt,
        updatedAt: new Date(),
      };

      meals[mealIndex] = updatedMeal;
      await storage.set(MEALS_STORAGE_KEY, meals);

      return updatedMeal;
    } catch (error) {
      console.error("Error updating meal:", error);
      throw new Error("Failed to update meal");
    }
  },

  // Get all meals
  getAllMeals: async (): Promise<Meal[]> => {
    try {
      const meals = await storage.get<Meal[]>(MEALS_STORAGE_KEY, []);
      if (!meals || meals.length === 0) return [];
      // Convert date strings back to Date objects
      return meals.map((meal: any) => ({
        ...meal,
        timestamp: new Date(meal.timestamp),
        createdAt: new Date(meal.createdAt),
        updatedAt: new Date(meal.updatedAt),
      }));
    } catch (error) {
      console.error("Error getting meals:", error);
      return [];
    }
  },

  // Get meals with filtering
  getMealsFiltered: async (filter: MealHistoryFilter = {}): Promise<Meal[]> => {
    try {
      let meals = await mealStorageUtils.getAllMeals();

      // Sort by timestamp (newest first)
      meals = meals.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Apply filters
      if (filter.startDate) {
        meals = meals.filter(meal => meal.timestamp >= filter.startDate!);
      }

      if (filter.endDate) {
        meals = meals.filter(meal => meal.timestamp <= filter.endDate!);
      }

      if (filter.mealType) {
        meals = meals.filter(meal => meal.mealType === filter.mealType);
      }

      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        meals = meals.filter(
          meal =>
            meal.name.toLowerCase().includes(query) ||
            meal.ingredients.some(ingredient => ingredient.toLowerCase().includes(query)),
        );
      }

      return meals;
    } catch (error) {
      console.error("Error filtering meals:", error);
      return [];
    }
  },

  // Get recent meals (for dashboard)
  getRecentMeals: async (limit: number = 8): Promise<Meal[]> => {
    try {
      const meals = await mealStorageUtils.getAllMeals();
      return meals.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
    } catch (error) {
      console.error("Error getting recent meals:", error);
      return [];
    }
  },

  // Get meals for a specific date
  getMealsForDate: async (date: Date): Promise<Meal[]> => {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

    return mealStorageUtils.getMealsFiltered({
      startDate: startOfDay,
      endDate: endOfDay,
    });
  },

  // Get meals for today
  getTodaysMeals: async (): Promise<Meal[]> => {
    return mealStorageUtils.getMealsForDate(new Date());
  },

  // Delete a meal
  deleteMeal: async (mealId: string): Promise<void> => {
    try {
      const meals = await mealStorageUtils.getAllMeals();
      const filteredMeals = meals.filter(meal => meal.id !== mealId);
      await storage.set(MEALS_STORAGE_KEY, filteredMeals);
    } catch (error) {
      console.error("Error deleting meal:", error);
      throw new Error("Failed to delete meal");
    }
  },

  // Clear all meals (for testing/reset)
  clearAllMeals: async (): Promise<void> => {
    try {
      await storage.remove(MEALS_STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing meals:", error);
      throw new Error("Failed to clear meals");
    }
  },

  // Get nutrition statistics for a date range
  getNutritionStats: async (
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalMeals: number;
    averageCalories: number;
    totalNutrition: NutritionInfo;
  }> => {
    try {
      const meals = await mealStorageUtils.getMealsFiltered({ startDate, endDate });

      if (meals.length === 0) {
        return {
          totalMeals: 0,
          averageCalories: 0,
          totalNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        };
      }

      const totalNutrition = meals.reduce(
        (acc, meal) => ({
          calories: acc.calories + meal.nutrition.calories,
          protein: acc.protein + meal.nutrition.protein,
          carbs: acc.carbs + meal.nutrition.carbs,
          fat: acc.fat + meal.nutrition.fat,
          fiber: (acc.fiber || 0) + (meal.nutrition.fiber || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      );

      return {
        totalMeals: meals.length,
        averageCalories: Math.round(totalNutrition.calories / meals.length),
        totalNutrition,
      };
    } catch (error) {
      console.error("Error getting nutrition stats:", error);
      return {
        totalMeals: 0,
        averageCalories: 0,
        totalNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      };
    }
  },
};

// Custom hook for meal storage functionality
export const useMealStorage = () => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all meals on mount
  useEffect(() => {
    loadMeals();
  }, []);

  const loadMeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loadedMeals = await mealStorageUtils.getAllMeals();
      setMeals(loadedMeals);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load meals");
    } finally {
      setLoading(false);
    }
  }, []);

  const saveMeal = useCallback(async (meal: Omit<Meal, "id" | "createdAt" | "updatedAt">) => {
    setError(null);
    try {
      const newMeal = await mealStorageUtils.saveMeal(meal);
      setMeals(prev => [newMeal, ...prev]);
      return newMeal;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save meal";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const updateMeal = useCallback(async (mealId: string, updates: Partial<Omit<Meal, "id" | "createdAt">>) => {
    setError(null);
    try {
      const updatedMeal = await mealStorageUtils.updateMeal(mealId, updates);
      setMeals(prev => prev.map(meal => (meal.id === mealId ? updatedMeal : meal)));
      return updatedMeal;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update meal";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const deleteMeal = useCallback(async (mealId: string) => {
    setError(null);
    try {
      await mealStorageUtils.deleteMeal(mealId);
      setMeals(prev => prev.filter(meal => meal.id !== mealId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete meal";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getMealsFiltered = useCallback(async (filter: MealHistoryFilter = {}) => {
    setError(null);
    try {
      return await mealStorageUtils.getMealsFiltered(filter);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to filter meals";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getRecentMeals = useCallback(async (limit: number = 8) => {
    setError(null);
    try {
      return await mealStorageUtils.getRecentMeals(limit);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get recent meals";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getTodaysMeals = useCallback(async () => {
    setError(null);
    try {
      return await mealStorageUtils.getTodaysMeals();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get today's meals";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getNutritionStats = useCallback(async (startDate: Date, endDate: Date) => {
    setError(null);
    try {
      return await mealStorageUtils.getNutritionStats(startDate, endDate);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get nutrition stats";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const clearAllMeals = useCallback(async () => {
    setError(null);
    try {
      await mealStorageUtils.clearAllMeals();
      setMeals([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to clear meals";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    meals,
    loading,
    error,
    loadMeals,
    saveMeal,
    updateMeal,
    deleteMeal,
    getMealsFiltered,
    getRecentMeals,
    getTodaysMeals,
    getNutritionStats,
    clearAllMeals,
    // Direct access to utils for advanced usage
    utils: mealStorageUtils,
  };
};

// Mock data generator for testing
export function generateMockMeals(): Meal[] {
  const mockMeals: Meal[] = [
    {
      id: "meal_1",
      userId: "user_1",
      name: "Grilled Chicken Salad",
      photoUri: "https://via.placeholder.com/300x200",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      mealType: MealType.LUNCH,
      nutrition: { calories: 380, protein: 32, carbs: 18, fat: 22, fiber: 8 },
      ingredients: ["Grilled chicken breast", "Mixed greens", "Cherry tomatoes", "Cucumber", "Olive oil dressing"],
      aiAnalysis: {
        detectedMeals: ["chicken", "salad", "tomatoes"],
        confidence: 85,
        estimatedCalories: 380,
        mealCategory: MealType.LUNCH,
        ingredients: ["chicken", "lettuce", "tomatoes", "cucumber"],
        insights: {
          healthScore: 85,
          nutritionBalance: "High protein, low carbs",
          recommendations: ["Great protein source!", "Add some healthy fats"],
        },
      },
      location: { latitude: 37.7749, longitude: -122.4194, address: "San Francisco, CA" },
      notes: "",
      isVerified: true,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: "meal_2",
      userId: "user_1",
      name: "Overnight Oats",
      photoUri: "https://via.placeholder.com/300x200",
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      mealType: MealType.BREAKFAST,
      nutrition: { calories: 320, protein: 12, carbs: 45, fat: 8, fiber: 6 },
      ingredients: ["Rolled oats", "Greek yogurt", "Blueberries", "Chia seeds", "Honey"],
      aiAnalysis: {
        detectedMeals: ["oats", "yogurt", "berries"],
        confidence: 92,
        estimatedCalories: 320,
        mealCategory: MealType.BREAKFAST,
        ingredients: ["oats", "yogurt", "blueberries", "seeds"],
        insights: {
          healthScore: 90,
          nutritionBalance: "High fiber, balanced macros",
          recommendations: ["Perfect breakfast choice!", "Good source of probiotics"],
        },
      },
      location: { latitude: 34.0522, longitude: -118.2437, address: "Los Angeles, CA" },
      notes: "",
      isVerified: false,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      id: "meal_3",
      userId: "user_1",
      name: "Salmon with Sweet Potato",
      photoUri: "https://via.placeholder.com/300x200",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      mealType: MealType.DINNER,
      nutrition: { calories: 520, protein: 35, carbs: 32, fat: 28, fiber: 4 },
      ingredients: ["Grilled salmon", "Roasted sweet potato", "Steamed broccoli", "Lemon"],
      aiAnalysis: {
        detectedMeals: ["salmon", "sweet potato", "broccoli"],
        confidence: 88,
        estimatedCalories: 520,
        mealCategory: MealType.DINNER,
        ingredients: ["salmon", "sweet potato", "broccoli"],
        insights: {
          healthScore: 95,
          nutritionBalance: "Excellent omega-3 source",
          recommendations: ["Perfect balance of nutrients", "Great for heart health"],
        },
      },
      location: { latitude: 40.7128, longitude: -74.006, address: "New York, NY" },
      notes: "",
      isVerified: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  ];

  return mockMeals;
}
