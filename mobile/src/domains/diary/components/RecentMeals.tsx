import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/lib/theme";
import { createElevation } from "@/styles/tokens";
import type { Meal } from "../types";
import { mealStorageUtils, generateMockMeals } from "../hooks/useMealStorage";

interface RecentMealsProps {
  onSeeAll?: () => void;
}

export default function RecentMeals({ onSeeAll }: RecentMealsProps) {
  const { theme } = useTheme();
  const [recentMeals, setRecentMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mockDataInitialized, setMockDataInitialized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadRecentMeals();
  }, []);

  const loadRecentMeals = async () => {
    try {
      setIsLoading(true);
      let meals = await mealStorageUtils.getRecentMeals(6);

      // For development: add mock data if no meals exist
      if (meals.length === 0 && !mockDataInitialized) {
        const mockMeals = generateMockMeals();
        // Save mock meals to storage so they can be found later
        for (const mockMeal of mockMeals) {
          await mealStorageUtils.saveMeal({
            userId: mockMeal.userId,
            name: mockMeal.name,
            photoUri: mockMeal.photoUri,
            timestamp: mockMeal.timestamp,
            mealType: mockMeal.mealType,
            nutrition: mockMeal.nutrition,
            ingredients: mockMeal.ingredients,
            aiAnalysis: mockMeal.aiAnalysis,
            location: mockMeal.location,
            notes: mockMeal.notes,
            isVerified: mockMeal.isVerified,
          });
        }
        // Reload meals after saving mock data
        meals = await mealStorageUtils.getRecentMeals(6);
        setMockDataInitialized(true);
      }

      setRecentMeals(meals);
    } catch (error) {
      console.error("Error loading recent meals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMealPress = (meal: Meal) => {
    // Navigate to meal detail for editing
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: 24,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
    },
    seeAllButton: {
      flexDirection: "row",
      alignItems: "center",
    },
    seeAllText: {
      fontSize: 14,
      color: theme.colors.primary,
      marginRight: 4,
    },
    mealsContainer: {
      paddingLeft: 0,
    },
    mealCard: {
      width: 140,
      marginRight: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      overflow: "hidden",
      ...createElevation("sm"),
    },
    mealImage: {
      width: "100%",
      height: 100,
      backgroundColor: theme.colors.border,
    },
    mealInfo: {
      padding: 12,
    },
    mealName: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.text,
      marginBottom: 4,
    },
    mealTime: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 6,
    },
    mealCalories: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.primary,
    },
    loadingContainer: {
      height: 100,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
    },
    emptyContainer: {
      height: 100,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      textAlign: "center",
    },
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Recent Meals</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading meals...</Text>
        </View>
      </View>
    );
  }

  if (recentMeals.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Recent Meals</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No meals logged yet. Start by taking a photo of your meal!</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Meals</Text>
        <TouchableOpacity style={styles.seeAllButton} onPress={onSeeAll}>
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mealsContainer}>
        {recentMeals.map(meal => (
          <TouchableOpacity
            key={meal.id}
            style={styles.mealCard}
            onPress={() => handleMealPress(meal)}
            activeOpacity={0.7}
          >
            <Image source={{ uri: meal.photoUri }} style={styles.mealImage} />
            <View style={styles.mealInfo}>
              <Text style={styles.mealName} numberOfLines={2}>
                {meal.name}
              </Text>
              <Text style={styles.mealTime}>{formatRelativeTime(meal.timestamp)}</Text>
              <Text style={styles.mealCalories}>{meal.nutrition.calories} cal</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
