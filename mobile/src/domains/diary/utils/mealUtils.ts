import { MealType } from "../types";

// Meal-specific utilities

export const getCurrentMealType = (): MealType => {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 11) {
    return MealType.BREAKFAST;
  } else if (hour >= 11 && hour < 16) {
    return MealType.LUNCH;
  } else if (hour >= 16 && hour < 22) {
    return MealType.DINNER;
  } else {
    return MealType.SNACK;
  }
};

// Nutrition formatting utilities
export const formatCalories = (calories: number): string => {
  return `${Math.round(calories)} cal`;
};

export const formatWeight = (weight: number, unit: "kg" | "lbs" = "kg"): string => {
  return `${weight.toFixed(1)} ${unit}`;
};

// Image utilities for meal photos
export const getImageAspectRatio = async (uri: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image.width / image.height);
    };
    image.onerror = reject;
    image.src = uri;
  });
};

export const compressImageUri = (uri: string, quality = 0.8): Promise<string> => {
  // This would typically use a library like expo-image-manipulator
  // For now, return the original URI
  return Promise.resolve(uri);
};