import React from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/design-system/theme";
import { tokens } from "@/design-system/tokens";

// =============================================================================
// TYPES
// =============================================================================

export interface MealSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MealSearchBar({
  value,
  onChangeText,
  placeholder = "Search meals...",
}: MealSearchBarProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.searchBar, { backgroundColor: colors.bg.secondary }]}>
        <Ionicons name="search" size={20} color={colors.text.secondary} />
        <TextInput
          style={[styles.input, { color: colors.text.primary }]}
          placeholder={placeholder}
          placeholderTextColor={colors.text.secondary}
          value={value}
          onChangeText={onChangeText}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText("")}>
            <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: tokens.spacing.layout.md,
    paddingBottom: tokens.spacing.layout.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.component.md,
    paddingVertical: tokens.spacing.component.md,
    gap: tokens.spacing.component.md,
  },
  input: {
    flex: 1,
    fontSize: tokens.typography.fontSize.body,
  },
});

export default MealSearchBar;
