/**
 * SearchGridItem - Compact grid item for search results
 *
 * Shows photo with date/time overlay at bottom.
 * Designed for 3-column grid layout.
 */

import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/design-system/theme";
import { tokens } from "@/design-system/tokens";
import { Entry } from "../../types";

// =============================================================================
// TYPES
// =============================================================================

export interface SearchGridItemProps {
  entry: Entry;
  size: number;
  onPress?: (entry: Entry) => void;
}

// =============================================================================
// UTILITIES
// =============================================================================

function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const time = date.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${year}.${month}.${day} ${time}`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SearchGridItem({ entry, size, onPress }: SearchGridItemProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    onPress?.(entry);
  };

  return (
    <TouchableOpacity
      style={[styles.container, { width: size, height: size }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Photo */}
      <View style={[styles.imageContainer, { backgroundColor: colors.bg.secondary }]}>
        {entry.meal.photoUri ? (
          <Image source={{ uri: entry.meal.photoUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <Ionicons name="image-outline" size={24} color={colors.text.tertiary} />
        )}
      </View>

      {/* Date/Time Overlay */}
      <View style={styles.infoOverlay}>
        <Text style={styles.dateTimeText} numberOfLines={1}>
          {formatDateTime(entry.timestamp)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    // No border radius - edge-to-edge grid
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  infoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: tokens.spacing.component.xs,
    paddingVertical: 2,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  dateTimeText: {
    fontSize: 10,
    fontWeight: tokens.typography.fontWeight.medium,
    color: "rgba(255, 255, 255, 0.9)",
  },
});

export default SearchGridItem;
