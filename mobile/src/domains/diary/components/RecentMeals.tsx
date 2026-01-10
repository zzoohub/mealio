/**
 * RecentMeals - Horizontal scrolling list of recent meals
 *
 * Displays the user's most recent meals in a horizontal carousel.
 * Uses Card component from design system for meal items.
 *
 * Features:
 * - Horizontal scroll with meal cards
 * - Loading and empty states
 * - Navigation to meal detail
 * - "See All" action to view full history
 *
 * @example
 * ```tsx
 * <RecentMeals onSeeAll={() => navigation.navigate('MealHistory')} />
 * ```
 */

import React, { useState, useEffect } from 'react';
import { ScrollView, Image, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Box, Text, HStack, VStack, Card } from '@/design-system/styled';
import { createStyles, useStyles } from '@/design-system/theme';
import { tokens } from '@/design-system/tokens';
import type { Meal } from '../types';
import { mealStorageUtils, generateMockMeals } from '../hooks/useMealStorage';

// =============================================================================
// TYPES
// =============================================================================

interface RecentMealsProps {
  onSeeAll?: () => void;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface MealCardItemProps {
  meal: Meal;
  onPress: () => void;
  formatTime: (date: Date) => string;
}

function MealCardItem({ meal, onPress, formatTime }: MealCardItemProps) {
  const s = useStyles(mealCardStyles);

  return (
    <Card
      variant="elevated"
      pressable
      onPress={onPress}
      style={s.card}
    >
      <Image source={{ uri: meal.photoUri }} style={s.image} />
      <VStack gap="xs" style={s.content}>
        <Text variant="bodySmall" weight="medium" numberOfLines={2}>
          {meal.name}
        </Text>
        <Text variant="caption" color="secondary">
          {formatTime(meal.timestamp)}
        </Text>
        <Text variant="caption" color="link" weight="medium">
          {meal.nutrition.calories} cal
        </Text>
      </VStack>
    </Card>
  );
}

interface HeaderProps {
  onSeeAll?: (() => void) | undefined;
}

function Header({ onSeeAll }: HeaderProps) {
  const s = useStyles(headerStyles);

  return (
    <HStack justify="space-between" align="center" style={{ marginBottom: tokens.spacing.component.lg }}>
      <Text variant="h3" weight="semibold">
        Recent Meals
      </Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <HStack gap="xs" align="center">
            <Text variant="bodySmall" color="link">
              See All
            </Text>
            <Ionicons
              name="chevron-forward"
              size={tokens.size.icon.xs}
              color={s.chevron.color}
            />
          </HStack>
        </TouchableOpacity>
      )}
    </HStack>
  );
}

// Constants for consistent height across all states
// Card height: image (100) + content padding (12*2) + text lines (~60) = ~184
// This minHeight ensures loading/empty states match the scrollable content area
const CONTENT_MIN_HEIGHT = 184;

function LoadingState() {
  return (
    <Box mb="lg">
      <Header />
      <Box minHeight={CONTENT_MIN_HEIGHT} center>
        <Text variant="bodySmall" color="secondary">
          Loading meals...
        </Text>
      </Box>
    </Box>
  );
}

function EmptyState() {
  return (
    <Box mb="lg">
      <Header />
      <Box minHeight={CONTENT_MIN_HEIGHT} center>
        <Text variant="bodySmall" color="secondary" align="center">
          No meals logged yet. Start by taking a photo of your meal!
        </Text>
      </Box>
    </Box>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function RecentMeals({ onSeeAll }: RecentMealsProps) {
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
      console.error('Error loading recent meals:', error);
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

  if (isLoading) {
    return <LoadingState />;
  }

  if (recentMeals.length === 0) {
    return <EmptyState />;
  }

  return (
    <Box mb="lg">
      <Header onSeeAll={onSeeAll} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 0 }}
      >
        {recentMeals.map((meal) => (
          <MealCardItem
            key={meal.id}
            meal={meal}
            onPress={() => handleMealPress(meal)}
            formatTime={formatRelativeTime}
          />
        ))}
      </ScrollView>
    </Box>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const mealCardStyles = createStyles((colors) => ({
  card: {
    width: 140,
    marginRight: tokens.spacing.component.md,
    overflow: 'hidden' as const,
  },
  image: {
    width: '100%' as const,
    height: 100,
    backgroundColor: colors.border.default,
  },
  content: {
    padding: tokens.spacing.component.md,
  },
}));

const headerStyles = createStyles((colors) => ({
  chevron: {
    color: colors.interactive.primary,
  },
}));
