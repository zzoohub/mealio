import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Meal } from "../types";
import { useTheme } from "@/design-system/theme";
import { tokens } from "@/design-system/tokens";

// =============================================================================
// TYPES
// =============================================================================

export interface MealListItemProps {
  meal: Meal;
  onPress?: (meal: Meal) => void;
}

// =============================================================================
// UTILITIES
// =============================================================================

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const getMealTypeIcon = (mealType: string): string => {
  switch (mealType.toLowerCase()) {
    case "breakfast":
      return "sunrise";
    case "lunch":
      return "sunny";
    case "dinner":
      return "moon";
    case "snack":
      return "nutrition";
    default:
      return "restaurant";
  }
};

const getMealTypeEmoji = (mealType: string): string => {
  switch (mealType.toLowerCase()) {
    case "breakfast":
      return "breakfast";
    case "lunch":
      return "lunch";
    case "dinner":
      return "moon";
    case "snack":
      return "nutrition";
    default:
      return "restaurant";
  }
};

// =============================================================================
// COMPONENT
// =============================================================================

export const MealListItem = React.memo(function MealListItem({
  meal,
  onPress,
}: MealListItemProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    onPress?.(meal);
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.bg.secondary }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Photo */}
      <View style={styles.photoContainer}>
        {meal.photoUri ? (
          <Image source={{ uri: meal.photoUri }} style={styles.photo} />
        ) : (
          <View style={[styles.placeholderPhoto, { backgroundColor: colors.border.default }]}>
            <Ionicons name="camera" size={20} color={colors.text.secondary} />
          </View>
        )}

        {/* Verification badge */}
        {meal.isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={12} color={colors.interactive.secondary} />
          </View>
        )}
      </View>

      {/* Meal Details */}
      <View style={styles.details}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons
              name={getMealTypeIcon(meal.mealType) as any}
              size={16}
              color={colors.interactive.primary}
            />
            <Text style={[styles.name, { color: colors.text.primary }]} numberOfLines={1}>
              {meal.name}
            </Text>
            <Text style={[styles.time, { color: colors.text.secondary }]}>
              {formatTime(meal.timestamp)}
            </Text>
          </View>

          {/* AI Insights Preview */}
          <View
            style={[
              styles.insightsPreview,
              { opacity: meal.aiAnalysis?.insights ? 1 : 0 },
            ]}
          >
            <View style={styles.healthScore}>
              <Ionicons name="fitness" size={12} color={colors.interactive.secondary} />
              <Text style={[styles.healthScoreText, { color: colors.interactive.secondary }]}>
                {meal.aiAnalysis?.insights?.healthScore ?? 0}/100
              </Text>
            </View>
            <Text
              style={[styles.nutritionBalance, { color: colors.text.secondary }]}
              numberOfLines={1}
            >
              {meal.aiAnalysis?.insights?.nutritionBalance ?? ""}
            </Text>
          </View>
        </View>

        {/* Nutrition Summary */}
        <View style={styles.nutritionRow}>
          <View style={styles.nutritionItem}>
            <Text style={[styles.nutritionValue, { color: colors.interactive.primary }]}>
              {meal.nutrition.calories}
            </Text>
            <Text style={[styles.nutritionLabel, { color: colors.text.secondary }]}>cal</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={[styles.nutritionValue, { color: colors.interactive.primary }]}>
              {meal.nutrition.protein}g
            </Text>
            <Text style={[styles.nutritionLabel, { color: colors.text.secondary }]}>protein</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={[styles.nutritionValue, { color: colors.interactive.primary }]}>
              {meal.nutrition.carbs}g
            </Text>
            <Text style={[styles.nutritionLabel, { color: colors.text.secondary }]}>carbs</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={[styles.nutritionValue, { color: colors.interactive.primary }]}>
              {meal.nutrition.fat}g
            </Text>
            <Text style={[styles.nutritionLabel, { color: colors.text.secondary }]}>fat</Text>
          </View>
        </View>

        {/* Ingredients Preview */}
        <View style={styles.ingredientsPreview}>
          <Text
            style={[styles.ingredientsText, { color: colors.text.secondary }]}
            numberOfLines={2}
          >
            {meal.ingredients.join(", ")}
          </Text>
        </View>

        {/* AI Recommendations */}
        <View
          style={[
            styles.recommendationPreview,
            {
              opacity:
                meal.aiAnalysis?.insights?.recommendations &&
                meal.aiAnalysis.insights.recommendations.length > 0
                  ? 1
                  : 0,
            },
          ]}
        >
          <Ionicons name="bulb" size={12} color={colors.status.warning} />
          <Text
            style={[styles.recommendationText, { color: colors.status.warning }]}
            numberOfLines={1}
          >
            {meal.aiAnalysis?.insights?.recommendations?.[0] ?? ""}
          </Text>
        </View>
      </View>

      {/* Edit Arrow */}
      <View style={styles.editArrow}>
        <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
      </View>
    </TouchableOpacity>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.component.md,
    marginBottom: tokens.spacing.component.md,
    alignItems: "flex-start",
  },
  photoContainer: {
    position: "relative",
    marginRight: tokens.spacing.component.md,
  },
  photo: {
    width: 60,
    height: 60,
    borderRadius: tokens.radius.sm,
  },
  placeholderPhoto: {
    width: 60,
    height: 60,
    borderRadius: tokens.radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: tokens.radius.sm,
    padding: 2,
  },
  details: {
    flex: 1,
    gap: tokens.spacing.component.sm,
  },
  header: {
    gap: tokens.spacing.component.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.component.sm,
  },
  name: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
    flex: 1,
  },
  time: {
    fontSize: tokens.typography.fontSize.bodySmall,
  },
  insightsPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.component.md,
    minHeight: 18,
  },
  healthScore: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.component.xs,
  },
  healthScoreText: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  nutritionBalance: {
    fontSize: tokens.typography.fontSize.caption,
    flex: 1,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: tokens.spacing.component.xs,
  },
  nutritionItem: {
    alignItems: "center",
    flex: 1,
  },
  nutritionValue: {
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  nutritionLabel: {
    fontSize: tokens.typography.fontSize.caption,
  },
  ingredientsPreview: {
    paddingTop: tokens.spacing.component.xs,
  },
  ingredientsText: {
    fontSize: tokens.typography.fontSize.caption,
    lineHeight: tokens.typography.lineHeight.body * tokens.typography.fontSize.caption,
  },
  recommendationPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.component.sm,
    paddingTop: tokens.spacing.component.xs,
    minHeight: 20,
  },
  recommendationText: {
    fontSize: tokens.typography.fontSize.caption,
    fontStyle: "italic",
    flex: 1,
  },
  editArrow: {
    justifyContent: "center",
    marginLeft: tokens.spacing.component.sm,
  },
});

export default MealListItem;
