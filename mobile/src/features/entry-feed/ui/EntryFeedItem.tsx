import React, { memo, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import type { Entry } from "@/entities/entry";
import { MealType } from "@/entities/meal";
import { useTheme } from "@/shared/ui/theme";
import { tokens } from "@/shared/ui/tokens";
import { formatTime } from "@/shared/lib/utils";
import { useCommonI18n } from "@/shared/lib/i18n";
import { PhotoCarousel } from "@/shared/ui/styled";

// =============================================================================
// CONSTANTS
// =============================================================================


// =============================================================================
// TYPES
// =============================================================================

export interface EntryFeedItemProps {
  entry: Entry;
  onPress?: (entry: Entry) => void;
  showDivider?: boolean;
}

// =============================================================================
// UTILITIES
// =============================================================================

const getMealTypeIcon = (mealType: MealType): string => {
  switch (mealType) {
    case MealType.BREAKFAST:
      return "sunny-outline";
    case MealType.LUNCH:
      return "sunny";
    case MealType.DINNER:
      return "moon-outline";
    case MealType.SNACK:
      return "nutrition-outline";
    default:
      return "restaurant-outline";
  }
};

// =============================================================================
// COMPONENT
// =============================================================================

export const EntryFeedItem = memo(function EntryFeedItem({ entry, onPress }: EntryFeedItemProps) {
  const { colors } = useTheme();
  const common = useCommonI18n();

  const getMealTypeLabel = (mealType: MealType): string => {
    switch (mealType) {
      case MealType.BREAKFAST: return common.mealTypeBreakfast;
      case MealType.LUNCH: return common.mealTypeLunch;
      case MealType.DINNER: return common.mealTypeDinner;
      case MealType.SNACK: return common.mealTypeSnack;
      default: return common.mealTypeMeal;
    }
  };

  const handlePress = useCallback(() => {
    onPress?.(entry);
  }, [onPress, entry]);

  const hasNotes = entry.notes && entry.notes.trim().length > 0;
  const locationLabel = entry.location?.address?.split(",")[0];

  const photoUris = entry.meal.photoUris ?? (entry.meal.photoUri ? [entry.meal.photoUri] : []);

  return (
    <View style={styles.container}>
      {/* Photo Carousel — outside Pressable so PagerView receives swipe gestures */}
      <View>
        <PhotoCarousel photoUris={photoUris} onPhotoPress={onPress ? () => handlePress() : undefined} />

        {/* Bookmark - Top Right */}
        {entry.wouldEatAgain && (
          <View style={styles.bookmarkContainer}>
            <Ionicons name="bookmark" size={24} color="white" />
          </View>
        )}
      </View>

      {/* Info Section - Below Photo */}
      <Pressable style={styles.infoSection} onPress={handlePress}>
        {/* Notes */}
        {hasNotes && (
          <Text
            style={[styles.notes, { color: colors.text.primary }]}
            numberOfLines={2}
          >
            {entry.notes}
          </Text>
        )}

        {/* Meta Row */}
        <View style={styles.metaRow}>
          <Ionicons
            name={getMealTypeIcon(entry.meal.mealType) as any}
            size={12}
            color={colors.text.tertiary}
          />
          <Text style={[styles.metaText, { color: colors.text.tertiary }]}>
            {getMealTypeLabel(entry.meal.mealType)}
          </Text>
          <Text style={[styles.metaDot, { color: colors.text.tertiary }]}>·</Text>
          <Text style={[styles.metaText, { color: colors.text.tertiary }]}>
            {formatTime(entry.timestamp)}
          </Text>
          {locationLabel && (
            <>
              <Text style={[styles.metaDot, { color: colors.text.tertiary }]}>·</Text>
              <Text
                style={[styles.metaText, styles.locationText, { color: colors.text.tertiary }]}
                numberOfLines={1}
              >
                {locationLabel}
              </Text>
            </>
          )}
        </View>
      </Pressable>
    </View>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: tokens.spacing.layout.md,
  },
  bookmarkContainer: {
    position: "absolute",
    top: tokens.spacing.component.md,
    right: tokens.spacing.component.md,
    // Add shadow for visibility
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  infoSection: {
    paddingHorizontal: tokens.spacing.component.md,
    paddingVertical: tokens.spacing.component.sm,
    gap: tokens.spacing.component.xs,
  },
  notes: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.normal,
    lineHeight: tokens.typography.fontSize.body * 1.4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.component.xs,
  },
  metaText: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.normal,
  },
  metaDot: {
    fontSize: tokens.typography.fontSize.caption,
  },
  locationText: {
    flex: 1,
  },
});

export default EntryFeedItem;
