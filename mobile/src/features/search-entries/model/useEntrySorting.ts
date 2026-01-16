import { useState, useCallback, useMemo } from "react";
import { Entry, SortMethod } from "@/entities/entry";

export interface SortMetadata {
  key: SortMethod;
  label: string;
  icon: string;
  description: string;
  ascending: boolean;
}

export interface SortedSection {
  title: string;
  data: Entry[];
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

// Entry sorting utility functions
export const entrySortingUtils = {
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
  calculateNutritionDensity: (entry: Entry): number => {
    const nutrition = entry.meal.nutrition;
    if (!nutrition) return 0;
    const calories = nutrition.calories || 1; // Prevent division by zero
    const protein = nutrition.protein || 0;
    const fiber = nutrition.fiber || 0;

    // Calculate density as (protein + fiber) per 100 calories
    return ((protein + fiber) / calories) * 100;
  },

  /**
   * Gets health score from AI analysis or calculates a basic one
   */
  getHealthScore: (entry: Entry): number => {
    if (entry.meal.aiAnalysis?.insights?.healthScore) {
      return entry.meal.aiAnalysis.insights.healthScore;
    }

    const nutrition = entry.meal.nutrition;
    if (!nutrition) return 0;

    // Calculate basic health score based on nutrition balance
    const { calories = 0, protein = 0, fat = 0, fiber = 0 } = nutrition;

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
  getSortValue: (entry: Entry, sortMethod: SortMethod): number => {
    switch (sortMethod) {
      case "date-desc":
      case "date-asc":
        return entry.timestamp.getTime();

      case "calories-desc":
      case "calories-asc":
        return entry.meal.nutrition?.calories || 0;

      case "protein-desc":
      case "protein-asc":
        return entry.meal.nutrition?.protein || 0;

      case "health-score-desc":
      case "health-score-asc":
        return entrySortingUtils.getHealthScore(entry);

      case "nutrition-density-desc":
      case "nutrition-density-asc":
        return entrySortingUtils.calculateNutritionDensity(entry);

      default:
        return entry.timestamp.getTime();
    }
  },

  /**
   * Compares two entries based on sort method
   */
  compareEntries: (a: Entry, b: Entry, sortMethod: SortMethod): number => {
    const metadata = entrySortingUtils.getSortMetadata(sortMethod);
    const valueA = entrySortingUtils.getSortValue(a, sortMethod);
    const valueB = entrySortingUtils.getSortValue(b, sortMethod);

    const comparison = valueA - valueB;
    return metadata.ascending ? comparison : -comparison;
  },

  /**
   * Sorts entries in chunks for better performance with large datasets
   */
  sortEntriesInChunks: async (entries: Entry[], sortMethod: SortMethod): Promise<Entry[]> => {
    if (entries.length <= CHUNK_SIZE) {
      return entries.sort((a, b) => entrySortingUtils.compareEntries(a, b, sortMethod));
    }

    // Split into chunks
    const chunks: Entry[][] = [];
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      chunks.push(entries.slice(i, i + CHUNK_SIZE));
    }

    // Sort each chunk
    const sortedChunks = await Promise.all(
      chunks.map(chunk => Promise.resolve(chunk.sort((a, b) => entrySortingUtils.compareEntries(a, b, sortMethod)))),
    );

    // Merge sorted chunks
    let result = sortedChunks[0] || [];
    for (let i = 1; i < sortedChunks.length; i++) {
      const chunk = sortedChunks[i];
      if (chunk) {
        result = entrySortingUtils.mergeSortedArrays(result, chunk, sortMethod);
      }
    }

    return result;
  },

  /**
   * Merges two sorted arrays
   */
  mergeSortedArrays: (arr1: Entry[], arr2: Entry[], sortMethod: SortMethod): Entry[] => {
    const result: Entry[] = [];
    let i = 0,
      j = 0;

    while (i < arr1.length && j < arr2.length) {
      const entry1 = arr1[i];
      const entry2 = arr2[j];
      if (entry1 && entry2) {
        if (entrySortingUtils.compareEntries(entry1, entry2, sortMethod) <= 0) {
          result.push(entry1);
          i++;
        } else {
          result.push(entry2);
          j++;
        }
      } else {
        // Handle edge case where array contains undefined
        if (entry1) {
          result.push(entry1);
        }
        if (entry2) {
          result.push(entry2);
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
   * Groups sorted entries into sections
   */
  groupEntriesIntoSections: (sortedEntries: Entry[], sortMethod: SortMethod): SortedSection[] => {
    if (sortedEntries.length === 0) return [];

    // For date-based sorting, group by date
    if (sortMethod === "date-desc" || sortMethod === "date-asc") {
      return entrySortingUtils.groupByDate(sortedEntries);
    }

    // For other sorting methods, group by ranges
    return entrySortingUtils.groupByValueRange(sortedEntries, sortMethod);
  },

  /**
   * Groups entries by date
   */
  groupByDate: (entries: Entry[]): SortedSection[] => {
    const grouped = entries.reduce((acc, entry) => {
      const date = entry.timestamp.toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(entry);
      return acc;
    }, {} as Record<string, Entry[]>);

    return Object.entries(grouped)
      .map(([date, entries]) => {
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
          data: entries,
        } as SortedSection;
      })
      .sort((a, b) => {
        const dateA = new Date(a.data[0]?.timestamp ?? 0);
        const dateB = new Date(b.data[0]?.timestamp ?? 0);
        return dateB.getTime() - dateA.getTime();
      });
  },

  /**
   * Groups entries by value ranges for non-date sorting
   */
  groupByValueRange: (entries: Entry[], sortMethod: SortMethod): SortedSection[] => {
    const metadata = entrySortingUtils.getSortMetadata(sortMethod);

    switch (sortMethod) {
      case "calories-desc":
      case "calories-asc":
        return entrySortingUtils.groupByCalorieRanges(entries);

      case "protein-desc":
      case "protein-asc":
        return entrySortingUtils.groupByProteinRanges(entries);

      case "health-score-desc":
      case "health-score-asc":
        return entrySortingUtils.groupByHealthScore(entries);

      case "nutrition-density-desc":
      case "nutrition-density-asc":
        return entrySortingUtils.groupByDensityRanges(entries);

      default:
        // Single section for unsupported groupings
        return [
          {
            title: `All Entries (${metadata.label})`,
            data: entries,
          },
        ];
    }
  },

  /**
   * Groups entries by calorie ranges
   */
  groupByCalorieRanges: (entries: Entry[]): SortedSection[] => {
    const ranges = [
      { min: 0, max: 200, label: "Light (0-200 cal)" },
      { min: 200, max: 400, label: "Moderate (200-400 cal)" },
      { min: 400, max: 600, label: "Substantial (400-600 cal)" },
      { min: 600, max: 800, label: "Large (600-800 cal)" },
      { min: 800, max: Infinity, label: "Very Large (800+ cal)" },
    ];

    return entrySortingUtils.groupByRanges(entries, ranges, entry => entry.meal.nutrition?.calories || 0);
  },

  /**
   * Groups entries by protein ranges
   */
  groupByProteinRanges: (entries: Entry[]): SortedSection[] => {
    const ranges = [
      { min: 0, max: 10, label: "Low Protein (0-10g)" },
      { min: 10, max: 20, label: "Moderate Protein (10-20g)" },
      { min: 20, max: 30, label: "High Protein (20-30g)" },
      { min: 30, max: Infinity, label: "Very High Protein (30g+)" },
    ];

    return entrySortingUtils.groupByRanges(entries, ranges, entry => entry.meal.nutrition?.protein || 0);
  },

  /**
   * Groups entries by health score
   */
  groupByHealthScore: (entries: Entry[]): SortedSection[] => {
    const ranges = [
      { min: 80, max: 100, label: "Excellent (80-100)" },
      { min: 60, max: 80, label: "Good (60-80)" },
      { min: 40, max: 60, label: "Fair (40-60)" },
      { min: 0, max: 40, label: "Poor (0-40)" },
    ];

    return entrySortingUtils.groupByRanges(entries, ranges, entry => entrySortingUtils.getHealthScore(entry));
  },

  /**
   * Groups entries by nutrition density
   */
  groupByDensityRanges: (entries: Entry[]): SortedSection[] => {
    const ranges = [
      { min: 10, max: Infinity, label: "Very Dense (10+)" },
      { min: 5, max: 10, label: "Dense (5-10)" },
      { min: 2, max: 5, label: "Moderate (2-5)" },
      { min: 0, max: 2, label: "Low (0-2)" },
    ];

    return entrySortingUtils.groupByRanges(entries, ranges, entry => entrySortingUtils.calculateNutritionDensity(entry));
  },

  /**
   * Generic function to group entries by ranges
   */
  groupByRanges: (
    entries: Entry[],
    ranges: { min: number; max: number; label: string }[],
    valueExtractor: (entry: Entry) => number,
  ): SortedSection[] => {
    const sections: SortedSection[] = [];

    ranges.forEach(range => {
      const entriesInRange = entries.filter(entry => {
        const value = valueExtractor(entry);
        return value >= range.min && value < range.max;
      });

      if (entriesInRange.length > 0) {
        sections.push({
          title: `${range.label} (${entriesInRange.length})`,
          data: entriesInRange,
        });
      }
    });

    return sections;
  },

  /**
   * Main sorting function that handles large datasets efficiently
   */
  sortEntries: async (entries: Entry[], sortMethod: SortMethod): Promise<SortedSection[]> => {
    try {
      if (entries.length === 0) {
        return [];
      }

      // Sort entries
      const sortedEntries = await entrySortingUtils.sortEntriesInChunks(entries, sortMethod);

      // Group into sections
      return entrySortingUtils.groupEntriesIntoSections(sortedEntries, sortMethod);
    } catch (error) {
      console.error("Error sorting entries:", error);

      // Fallback to simple date-based grouping
      return entrySortingUtils.groupByDate(entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
    }
  },

  /**
   * Gets estimated sort time for UI feedback
   */
  getEstimatedSortTime: (entryCount: number): number => {
    // Rough estimates in milliseconds
    if (entryCount < 50) return 10;
    if (entryCount < 200) return 50;
    if (entryCount < 500) return 150;
    if (entryCount < 1000) return 300;
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

// Custom hook for entry sorting functionality
export const useEntrySorting = () => {
  const [sortingInProgress, setSortingInProgress] = useState(false);
  const [currentSortMethod, setCurrentSortMethod] = useState<SortMethod>("date-desc");

  const sortOptions = useMemo(() => entrySortingUtils.getSortOptions(), []);

  const sortEntries = useCallback(async (entries: Entry[], sortMethod: SortMethod): Promise<SortedSection[]> => {
    setSortingInProgress(true);
    setCurrentSortMethod(sortMethod);

    try {
      const result = await entrySortingUtils.sortEntries(entries, sortMethod);
      return result;
    } finally {
      setSortingInProgress(false);
    }
  }, []);

  const getSortMetadata = useCallback((sortMethod: SortMethod) => {
    return entrySortingUtils.getSortMetadata(sortMethod);
  }, []);

  const getEstimatedSortTime = useCallback((entryCount: number) => {
    return entrySortingUtils.getEstimatedSortTime(entryCount);
  }, []);

  const isExpensiveSort = useCallback((sortMethod: SortMethod) => {
    return entrySortingUtils.isExpensiveSort(sortMethod);
  }, []);

  return {
    sortingInProgress,
    currentSortMethod,
    sortOptions,
    sortEntries,
    getSortMetadata,
    getEstimatedSortTime,
    isExpensiveSort,
    // Direct access to utils for advanced usage
    utils: entrySortingUtils,
  };
};

export default entrySortingUtils;
