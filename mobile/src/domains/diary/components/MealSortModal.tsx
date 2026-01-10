import React from "react";
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/design-system/theme";
import { tokens } from "@/design-system/tokens";
import { SortMethod } from "@/domains/analytics";
import { SortMetadata } from "../hooks/useMealSorting";

// =============================================================================
// TYPES
// =============================================================================

export interface MealSortModalProps {
  visible: boolean;
  onClose: () => void;
  currentSortMethod: SortMethod;
  sortOptions: SortMetadata[];
  onSelect: (method: SortMethod) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MealSortModal({
  visible,
  onClose,
  currentSortMethod,
  sortOptions,
  onSelect,
}: MealSortModalProps) {
  const { colors } = useTheme();

  const renderSortOption = ({ item }: { item: SortMetadata }) => {
    const isSelected = currentSortMethod === item.key;

    return (
      <TouchableOpacity
        style={[
          styles.sortOption,
          isSelected && { backgroundColor: colors.interactive.primary + "20" },
        ]}
        onPress={() => onSelect(item.key)}
      >
        <View style={styles.sortOptionLeft}>
          <Ionicons
            name={item.icon as any}
            size={20}
            color={isSelected ? colors.interactive.primary : colors.text.secondary}
          />
          <View style={styles.sortOptionText}>
            <Text
              style={[
                styles.sortOptionLabel,
                { color: isSelected ? colors.interactive.primary : colors.text.primary },
              ]}
            >
              {item.label}
            </Text>
            {item.description && (
              <Text style={[styles.sortOptionDescription, { color: colors.text.secondary }]}>
                {item.description}
              </Text>
            )}
          </View>
        </View>
        {isSelected && (
          <Ionicons name="checkmark" size={20} color={colors.interactive.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.bg.primary }]}>
          <View style={[styles.header, { borderBottomColor: colors.border.default }]}>
            <Text style={[styles.title, { color: colors.text.primary }]}>Sort By</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={sortOptions}
            keyExtractor={(item) => item.key}
            renderItem={renderSortOption}
            style={styles.list}
          />
        </View>
      </View>
    </Modal>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modal: {
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    maxHeight: "70%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.layout.md,
    paddingVertical: tokens.spacing.component.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  list: {
    maxHeight: 400,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing.layout.md,
    paddingVertical: tokens.spacing.component.md,
  },
  sortOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: tokens.spacing.component.md,
  },
  sortOptionText: {
    flex: 1,
  },
  sortOptionLabel: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.medium,
    marginBottom: 2,
  },
  sortOptionDescription: {
    fontSize: tokens.typography.fontSize.caption,
  },
});

export default MealSortModal;
