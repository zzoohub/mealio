import { useState, useCallback, useMemo } from "react";
import { Meal } from "../types";
import { SortMethod } from "../../analytics";

export interface SortMetadata {
  key: SortMethod;
  label: string;
  icon: string;
  description: string;
  ascending: boolean;
}

export interface SortedSection {
  title: string;
  data: Meal[];
}

// Constants
const CHUNK_SIZE = 50;

// Sort metadata for UI display
const SORT_OPTIONS: SortMetadata[] = [
  {
    key: "date-desc",
    label: "Latest First",
    icon: "time",
    description: "Most recent meals first",
    ascending: false,
  },
  {
    key: "date-asc",
    label: "Oldest First",
    icon: "time-outline",
    description: "Oldest meals first",
    ascending: true,
  },
  {
    key: "calories-desc",
    label: "Highest Calories",
    icon: "flame",
    description: "Meals with most calories first",
    ascending: false,
  },
  {
    key: "calories-asc",
    label: "Lowest Calories",
    icon: "flame-outline",
    description: "Meals with least calories first",
    ascending: true,
  },
  {
    key: "protein-desc",
    label: "Highest Protein",
    icon: "fitness",
    description: "High protein meals first",
    ascending: false,
  },
  {
    key: "protein-asc",
    label: "Lowest Protein",
    icon: "fitness-outline",
    description: "Low protein meals first",
    ascending: true,
  },
  {
    key: "health-score-desc",
    label: "Healthiest First",
    icon: "heart",
    description: "Highest health score first",
    ascending: false,
  },
  {
    key: "health-score-asc",
    label: "Least Healthy",
    icon: "heart-outline",
    description: "Lowest health score first",
    ascending: true,
  },
  {
    key: "nutrition-density-desc",
    label: "Most Nutritious",
    icon: "nutrition",
    description: "Highest nutrition per calorie",
    ascending: false,
  },
  {
    key: "nutrition-density-asc",
    label: "Least Dense",
    icon: "nutrition-outline",
    description: "Lowest nutrition density",
    ascending: true,
  },
];

// Meal sorting utility functions
export const mealSortingUtils = {
  /**
   * Gets all available sort options with metadata
   */
  getSortOptions: (): SortMetadata[] => {
    return [...SORT_OPTIONS];
  },

  /**
   * Gets metadata for a specific sort method
   */
  getSortMetadata: (sortMethod: SortMethod): SortMetadata => {
    const metadata = SORT_OPTIONS.find(option => option.key === sortMethod);
    if (!metadata) {
      // Fallback to first option if not found
      return SORT_OPTIONS[0]!;
    }
    return metadata;
  },

  /**
   * Calculates nutrition density score (protein + fiber) per 100 calories
   */
  calculateNutritionDensity: (meal: Meal): number => {
    const calories = meal.nutrition.calories || 1; // Prevent division by zero
    const protein = meal.nutrition.protein || 0;
    const fiber = meal.nutrition.fiber || 0;

    // Calculate density as (protein + fiber) per 100 calories
    return ((protein + fiber) / calories) * 100;
  },

  /**
   * Gets health score from AI analysis or calculates a basic one
   */
  getHealthScore: (meal: Meal): number => {
    if (meal.aiAnalysis?.insights?.healthScore) {
      return meal.aiAnalysis.insights.healthScore;
    }

    // Calculate basic health score based on nutrition balance
    const { calories = 0, protein = 0, carbs = 0, fat = 0, fiber = 0 } = meal.nutrition;

    if (calories === 0) return 0;

    const proteinRatio = (protein / calories) * 100;
    const fiberScore = Math.min(fiber * 4, 20); // Cap at 20
    const fatRatio = (fat / calories) * 100;

    // Basic scoring algorithm (0-100)
    let score = 50; // Base score

    // Bonus for adequate protein (>15% of calories)
    if (proteinRatio > 15) score += 20;
    else if (proteinRatio > 10) score += 10;

    // Bonus for fiber
    score += fiberScore;

    // Penalty for excessive fat (>35% of calories)
    if (fatRatio > 35) score -= 15;
    else if (fatRatio > 30) score -= 10;

    return Math.max(0, Math.min(100, score));
  },

  /**
   * Gets sort value for comparison
   */
  getSortValue: (meal: Meal, sortMethod: SortMethod): number => {
    switch (sortMethod) {
      case "date-desc":
      case "date-asc":
        return meal.timestamp.getTime();

      case "calories-desc":
      case "calories-asc":
        return meal.nutrition.calories || 0;

      case "protein-desc":
      case "protein-asc":
        return meal.nutrition.protein || 0;

      case "health-score-desc":
      case "health-score-asc":
        return mealSortingUtils.getHealthScore(meal);

      case "nutrition-density-desc":
      case "nutrition-density-asc":
        return mealSortingUtils.calculateNutritionDensity(meal);

      default:
        return meal.timestamp.getTime();
    }
  },

  /**
   * Compares two meals based on sort method
   */
  compareMeals: (a: Meal, b: Meal, sortMethod: SortMethod): number => {
    const metadata = mealSortingUtils.getSortMetadata(sortMethod);
    const valueA = mealSortingUtils.getSortValue(a, sortMethod);
    const valueB = mealSortingUtils.getSortValue(b, sortMethod);

    const comparison = valueA - valueB;
    return metadata.ascending ? comparison : -comparison;
  },

  /**
   * Sorts meals in chunks for better performance with large datasets
   */
  sortMealsInChunks: async (meals: Meal[], sortMethod: SortMethod): Promise<Meal[]> => {
    if (meals.length <= CHUNK_SIZE) {
      return meals.sort((a, b) => mealSortingUtils.compareMeals(a, b, sortMethod));
    }

    // Split into chunks
    const chunks: Meal[][] = [];
    for (let i = 0; i < meals.length; i += CHUNK_SIZE) {
      chunks.push(meals.slice(i, i + CHUNK_SIZE));
    }

    // Sort each chunk
    const sortedChunks = await Promise.all(
      chunks.map(chunk => Promise.resolve(chunk.sort((a, b) => mealSortingUtils.compareMeals(a, b, sortMethod)))),
    );

    // Merge sorted chunks
    let result = sortedChunks[0] || [];
    for (let i = 1; i < sortedChunks.length; i++) {
      const chunk = sortedChunks[i];
      if (chunk) {
        result = mealSortingUtils.mergeSortedArrays(result, chunk, sortMethod);
      }
    }

    return result;
  },

  /**
   * Merges two sorted arrays
   */
  mergeSortedArrays: (arr1: Meal[], arr2: Meal[], sortMethod: SortMethod): Meal[] => {
    const result: Meal[] = [];
    let i = 0,
      j = 0;

    while (i < arr1.length && j < arr2.length) {
      const meal1 = arr1[i];
      const meal2 = arr2[j];
      if (meal1 && meal2) {
        if (mealSortingUtils.compareMeals(meal1, meal2, sortMethod) <= 0) {
          result.push(meal1);
          i++;
        } else {
          result.push(meal2);
          j++;
        }
      } else {
        // Handle edge case where array contains undefined
        if (meal1) {
          result.push(meal1);
        }
        if (meal2) {
          result.push(meal2);
        }
        i++;
        j++;
      }
    }

    // Add remaining elements
    result.push(...arr1.slice(i), ...arr2.slice(j));
    return result;
  },

  /**
   * Groups sorted meals into sections
   */
  groupMealsIntoSections: (sortedMeals: Meal[], sortMethod: SortMethod): SortedSection[] => {
    if (sortedMeals.length === 0) return [];

    // For date-based sorting, group by date
    if (sortMethod === "date-desc" || sortMethod === "date-asc") {
      return mealSortingUtils.groupByDate(sortedMeals);
    }

    // For other sorting methods, group by ranges
    return mealSortingUtils.groupByValueRange(sortedMeals, sortMethod);
  },

  /**
   * Groups meals by date
   */
  groupByDate: (meals: Meal[]): SortedSection[] => {
    const grouped = meals.reduce((acc, meal) => {
      const date = meal.timestamp.toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(meal);
      return acc;
    }, {} as Record<string, Meal[]>);

    return Object.entries(grouped)
      .map(([date, meals]) => {
        const sectionDate = new Date(date);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let title: string;
        if (sectionDate.toDateString() === today.toDateString()) {
          title = "Today";
        } else if (sectionDate.toDateString() === yesterday.toDateString()) {
          title = "Yesterday";
        } else {
          title = sectionDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          });
        }

        return {
          title,
          data: meals,
        } as SortedSection;
      })
      .sort((a, b) => {
        const dateA = new Date(a.data[0]?.timestamp ?? 0);
        const dateB = new Date(b.data[0]?.timestamp ?? 0);
        return dateB.getTime() - dateA.getTime();
      });
  },

  /**
   * Groups meals by value ranges for non-date sorting
   */
  groupByValueRange: (meals: Meal[], sortMethod: SortMethod): SortedSection[] => {
    const metadata = mealSortingUtils.getSortMetadata(sortMethod);

    switch (sortMethod) {
      case "calories-desc":
      case "calories-asc":
        return mealSortingUtils.groupByCalorieRanges(meals);

      case "protein-desc":
      case "protein-asc":
        return mealSortingUtils.groupByProteinRanges(meals);

      case "health-score-desc":
      case "health-score-asc":
        return mealSortingUtils.groupByHealthScore(meals);

      case "nutrition-density-desc":
      case "nutrition-density-asc":
        return mealSortingUtils.groupByDensityRanges(meals);

      default:
        // Single section for unsupported groupings
        return [
          {
            title: `All Meals (${metadata.label})`,
            data: meals,
          },
        ];
    }
  },

  /**
   * Groups meals by calorie ranges
   */
  groupByCalorieRanges: (meals: Meal[]): SortedSection[] => {
    const ranges = [
      { min: 0, max: 200, label: "Light (0-200 cal)" },
      { min: 200, max: 400, label: "Moderate (200-400 cal)" },
      { min: 400, max: 600, label: "Substantial (400-600 cal)" },
      { min: 600, max: 800, label: "Large (600-800 cal)" },
      { min: 800, max: Infinity, label: "Very Large (800+ cal)" },
    ];

    return mealSortingUtils.groupByRanges(meals, ranges, meal => meal.nutrition.calories || 0);
  },

  /**
   * Groups meals by protein ranges
   */
  groupByProteinRanges: (meals: Meal[]): SortedSection[] => {
    const ranges = [
      { min: 0, max: 10, label: "Low Protein (0-10g)" },
      { min: 10, max: 20, label: "Moderate Protein (10-20g)" },
      { min: 20, max: 30, label: "High Protein (20-30g)" },
      { min: 30, max: Infinity, label: "Very High Protein (30g+)" },
    ];

    return mealSortingUtils.groupByRanges(meals, ranges, meal => meal.nutrition.protein || 0);
  },

  /**
   * Groups meals by health score
   */
  groupByHealthScore: (meals: Meal[]): SortedSection[] => {
    const ranges = [
      { min: 80, max: 100, label: "Excellent (80-100)" },
      { min: 60, max: 80, label: "Good (60-80)" },
      { min: 40, max: 60, label: "Fair (40-60)" },
      { min: 0, max: 40, label: "Poor (0-40)" },
    ];

    return mealSortingUtils.groupByRanges(meals, ranges, meal => mealSortingUtils.getHealthScore(meal));
  },

  /**
   * Groups meals by nutrition density
   */
  groupByDensityRanges: (meals: Meal[]): SortedSection[] => {
    const ranges = [
      { min: 10, max: Infinity, label: "Very Dense (10+)" },
      { min: 5, max: 10, label: "Dense (5-10)" },
      { min: 2, max: 5, label: "Moderate (2-5)" },
      { min: 0, max: 2, label: "Low (0-2)" },
    ];

    return mealSortingUtils.groupByRanges(meals, ranges, meal => mealSortingUtils.calculateNutritionDensity(meal));
  },

  /**
   * Generic function to group meals by ranges
   */
  groupByRanges: (
    meals: Meal[],
    ranges: { min: number; max: number; label: string }[],
    valueExtractor: (meal: Meal) => number,
  ): SortedSection[] => {
    const sections: SortedSection[] = [];

    ranges.forEach(range => {
      const mealsInRange = meals.filter(meal => {
        const value = valueExtractor(meal);
        return value >= range.min && value < range.max;
      });

      if (mealsInRange.length > 0) {
        sections.push({
          title: `${range.label} (${mealsInRange.length})`,
          data: mealsInRange,
        });
      }
    });

    return sections;
  },

  /**
   * Main sorting function that handles large datasets efficiently
   */
  sortMeals: async (meals: Meal[], sortMethod: SortMethod): Promise<SortedSection[]> => {
    try {
      if (meals.length === 0) {
        return [];
      }

      // Sort meals
      const sortedMeals = await mealSortingUtils.sortMealsInChunks(meals, sortMethod);

      // Group into sections
      return mealSortingUtils.groupMealsIntoSections(sortedMeals, sortMethod);
    } catch (error) {
      console.error("Error sorting meals:", error);

      // Fallback to simple date-based grouping
      return mealSortingUtils.groupByDate(meals.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
    }
  },

  /**
   * Gets estimated sort time for UI feedback
   */
  getEstimatedSortTime: (mealCount: number): number => {
    // Rough estimates in milliseconds
    if (mealCount < 50) return 10;
    if (mealCount < 200) return 50;
    if (mealCount < 500) return 150;
    if (mealCount < 1000) return 300;
    return 500;
  },

  /**
   * Checks if sorting method requires expensive calculations
   */
  isExpensiveSort: (sortMethod: SortMethod): boolean => {
    return ["health-score-desc", "health-score-asc", "nutrition-density-desc", "nutrition-density-asc"].includes(
      sortMethod,
    );
  },
};

// Custom hook for meal sorting functionality
export const useMealSorting = () => {
  const [sortingInProgress, setSortingInProgress] = useState(false);
  const [currentSortMethod, setCurrentSortMethod] = useState<SortMethod>("date-desc");

  const sortOptions = useMemo(() => mealSortingUtils.getSortOptions(), []);

  const sortMeals = useCallback(async (meals: Meal[], sortMethod: SortMethod): Promise<SortedSection[]> => {
    setSortingInProgress(true);
    setCurrentSortMethod(sortMethod);

    try {
      const result = await mealSortingUtils.sortMeals(meals, sortMethod);
      return result;
    } finally {
      setSortingInProgress(false);
    }
  }, []);

  const getSortMetadata = useCallback((sortMethod: SortMethod) => {
    return mealSortingUtils.getSortMetadata(sortMethod);
  }, []);

  const getEstimatedSortTime = useCallback((mealCount: number) => {
    return mealSortingUtils.getEstimatedSortTime(mealCount);
  }, []);

  const isExpensiveSort = useCallback((sortMethod: SortMethod) => {
    return mealSortingUtils.isExpensiveSort(sortMethod);
  }, []);

  return {
    sortingInProgress,
    currentSortMethod,
    sortOptions,
    sortMeals,
    getSortMetadata,
    getEstimatedSortTime,
    isExpensiveSort,
    // Direct access to utils for advanced usage
    utils: mealSortingUtils,
  };
};

export default mealSortingUtils;
