import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Entry, MealType } from "../types";
import { useTheme } from "@/design-system/theme";
import { tokens } from "@/design-system/tokens";
import { formatTime } from "../utils/dateUtils";

// =============================================================================
// CONSTANTS
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PHOTO_SIZE = SCREEN_WIDTH; // Full width, 1:1 aspect ratio

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

const getMealTypeLabel = (mealType: MealType): string => {
  switch (mealType) {
    case MealType.BREAKFAST:
      return "아침";
    case MealType.LUNCH:
      return "점심";
    case MealType.DINNER:
      return "저녁";
    case MealType.SNACK:
      return "간식";
    default:
      return "식사";
  }
};

// =============================================================================
// COMPONENT
// =============================================================================

export function EntryFeedItem({ entry, onPress }: EntryFeedItemProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    onPress?.(entry);
  };

  const hasNotes = entry.notes && entry.notes.trim().length > 0;
  const locationLabel = entry.location?.restaurantName || entry.location?.address?.split(",")[0];

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.95}>
      {/* Photo */}
      <View style={[styles.photoContainer, { backgroundColor: colors.bg.secondary }]}>
        {entry.meal.photoUri ? (
          <Image
            source={{ uri: entry.meal.photoUri }}
            style={styles.photo}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="image-outline" size={48} color={colors.text.tertiary} />
        )}

        {/* Bookmark - Top Right */}
        {entry.wouldEatAgain && (
          <View style={styles.bookmarkContainer}>
            <Ionicons name="bookmark" size={24} color="white" />
          </View>
        )}
      </View>

      {/* Info Section - Below Photo */}
      <View style={styles.infoSection}>
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
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: tokens.spacing.layout.md,
  },
  photoContainer: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  photo: {
    width: "100%",
    height: "100%",
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
