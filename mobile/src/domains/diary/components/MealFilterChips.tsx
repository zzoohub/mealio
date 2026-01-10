import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/design-system/theme";
import { tokens } from "@/design-system/tokens";
import { SortMethod } from "@/domains/analytics";
import { mealSortingUtils } from "../hooks/useMealSorting";

// =============================================================================
// TYPES
// =============================================================================

export interface MealFilterChipsProps {
  sortMethod: SortMethod;
  dateRangeLabel: string;
  showClearButton: boolean;
  onSortPress: () => void;
  onDateRangePress: () => void;
  onClear: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MealFilterChips({
  sortMethod,
  dateRangeLabel,
  showClearButton,
  onSortPress,
  onDateRangePress,
  onClear,
}: MealFilterChipsProps) {
  const { colors } = useTheme();
  const sortMetadata = mealSortingUtils.getSortMetadata(sortMethod);

  return (
    <View style={styles.container}>
      {/* Sort Indicator */}
      <TouchableOpacity
        style={[styles.filterButton, { backgroundColor: colors.bg.secondary }]}
        onPress={onSortPress}
      >
        <Ionicons
          name={sortMetadata.icon as any}
          size={16}
          color={colors.interactive.primary}
        />
        <Text style={[styles.filterText, { color: colors.text.primary }]}>
          {sortMetadata.label}
        </Text>
      </TouchableOpacity>

      {/* Date Range Filter */}
      <TouchableOpacity
        style={[styles.filterButton, styles.dateRangeButton, { backgroundColor: colors.bg.secondary }]}
        onPress={onDateRangePress}
      >
        <Ionicons name="calendar-outline" size={16} color={colors.interactive.primary} />
        <Text
          style={[styles.filterText, { color: colors.text.secondary }]}
          numberOfLines={1}
        >
          {dateRangeLabel}
        </Text>
      </TouchableOpacity>

      {/* Clear Button */}
      {showClearButton && (
        <TouchableOpacity
          style={[styles.clearButton, { backgroundColor: colors.bg.secondary }]}
          onPress={onClear}
        >
          <Ionicons name="close" size={16} color={colors.text.secondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.layout.md,
    paddingBottom: tokens.spacing.layout.md,
    gap: tokens.spacing.component.md,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.component.md,
    paddingVertical: tokens.spacing.component.sm,
    borderRadius: tokens.radius.sm,
    gap: tokens.spacing.component.sm,
  },
  dateRangeButton: {
    flex: 1,
  },
  filterText: {
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  clearButton: {
    padding: tokens.spacing.component.sm,
    borderRadius: tokens.radius.sm,
  },
});

export default MealFilterChips;
