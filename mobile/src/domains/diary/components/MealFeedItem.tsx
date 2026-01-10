import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Meal } from "../types";
import { useTheme } from "@/design-system/theme";
import { tokens } from "@/design-system/tokens";
import { formatTime } from "../utils/dateUtils";

// =============================================================================
// CONSTANTS
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FEED_PADDING = 16;
const PHOTO_WIDTH = SCREEN_WIDTH - FEED_PADDING * 2;
const PHOTO_HEIGHT = PHOTO_WIDTH * 0.75; // 4:3 aspect ratio

// =============================================================================
// TYPES
// =============================================================================

export interface MealFeedItemProps {
  meal: Meal;
  onPress?: (meal: Meal) => void;
  showDivider?: boolean;
}

// =============================================================================
// UTILITIES
// =============================================================================

const getMealTypeEmoji = (mealType: string): string => {
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

const getMealTypeLabel = (mealType: string): string => {
  switch (mealType.toLowerCase()) {
    case "breakfast":
      return "Breakfast";
    case "lunch":
      return "Lunch";
    case "dinner":
      return "Dinner";
    case "snack":
      return "Snack";
    default:
      return "Meal";
  }
};

// =============================================================================
// COMPONENT
// =============================================================================

export function MealFeedItem({ meal, onPress, showDivider = false }: MealFeedItemProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    onPress?.(meal);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.9}>
      {/* Photo */}
      <View style={[styles.photoContainer, { backgroundColor: colors.bg.secondary }]}>
        {meal.photoUri ? (
          <Image
            source={{ uri: meal.photoUri }}
            style={styles.photo}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="image-outline" size={48} color={colors.text.secondary} />
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.mealTypeRow}>
          <Ionicons
            name={getMealTypeEmoji(meal.mealType) as any}
            size={18}
            color={colors.interactive.primary}
          />
          <Text style={[styles.mealType, { color: colors.text.primary }]}>
            {getMealTypeLabel(meal.mealType)}
          </Text>
        </View>
        <View style={styles.meta}>
          <Text style={[styles.time, { color: colors.text.secondary }]}>
            {formatTime(meal.timestamp)}
          </Text>
          {meal.location?.address && (
            <>
              <Text style={[styles.dividerDot, { color: colors.text.secondary }]}>·</Text>
              <Text
                style={[styles.location, { color: colors.text.secondary }]}
                numberOfLines={1}
              >
                {meal.location.restaurantName || meal.location.address.split(",")[0]}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Divider */}
      {showDivider && (
        <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
      )}
    </TouchableOpacity>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.component.md,
  },
  photoContainer: {
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    borderRadius: tokens.radius.lg,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  info: {
    gap: tokens.spacing.component.xs,
  },
  mealTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.component.sm,
  },
  mealType: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.component.sm,
  },
  time: {
    fontSize: tokens.typography.fontSize.bodySmall,
  },
  dividerDot: {
    fontSize: tokens.typography.fontSize.bodySmall,
  },
  location: {
    fontSize: tokens.typography.fontSize.bodySmall,
    flex: 1,
  },
  divider: {
    height: 1,
    marginTop: tokens.spacing.component.md,
  },
});

export default MealFeedItem;
