import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import type { Entry } from "@/entities/entry";
import {
  useEntrySearchPage,
  MealTypeFilterChips,
  DateQuickFilters,
  ActiveFilters,
  SearchGridItem,
  EntryDateRangeModal,
} from "@/features/search-entries";
import { useTheme } from "@/shared/ui/theme";
import { tokens } from "@/shared/ui/tokens";
import { useOverlayHelpers } from "@/app/providers/overlay";
import { useDiaryI18n, useCommonI18n } from "@/shared/lib/i18n";

// =============================================================================
// CONSTANTS
// =============================================================================

const GRID_GAP = 1;
const NUM_COLUMNS = 3;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function DiarySearchScreen() {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const itemSize = useMemo(
    () => (screenWidth - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS,
    [screenWidth],
  );
  const { bottomSheet } = useOverlayHelpers();
  const diaryI18n = useDiaryI18n();
  const commonI18n = useCommonI18n();

  // Use the extracted hook for all state and logic
  const {
    filteredEntries,
    isLoading,
    isLoadingMore,
    searchQuery,
    setSearchQuery,
    clearSearch,
    selectedMealTypes,
    setSelectedMealTypes,
    removeMealType,
    datePreset,
    calendarRange,
    customDateLabel,
    handleDatePresetChange,
    setCustomDateRange,
    setDateRangePreset,
    clearDateRange,
    showSortSheet,
    wouldEatAgain,
    toggleWouldEatAgain,
    handleEntryPress,
    handleClearAllFilters,
    loadMore,
    goBack,
  } = useEntrySearchPage();

  // Open date range modal via overlay
  const handleOpenDateRangeModal = useCallback(() => {
    bottomSheet(({ close }) => (
      <EntryDateRangeModal
        initialStartDate={calendarRange.startDate}
        initialEndDate={calendarRange.endDate}
        onApply={(startDate, endDate) => {
          setCustomDateRange(startDate, endDate);
          handleDatePresetChange("custom");
        }}
        onPresetSelect={(days) => {
          setDateRangePreset(days);
          handleDatePresetChange("custom");
        }}
        onClear={() => {
          clearDateRange();
          handleDatePresetChange(null);
        }}
        onClose={close}
      />
    ));
  }, [bottomSheet, calendarRange.startDate, calendarRange.endDate, setCustomDateRange, setDateRangePreset, handleDatePresetChange, clearDateRange]);

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const renderItem = useCallback(
    ({ item }: { item: Entry }) => (
      <SearchGridItem entry={item} size={itemSize} onPress={handleEntryPress} />
    ),
    [handleEntryPress, itemSize]
  );

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={colors.interactive.primary} />
      </View>
    );
  }, [isLoadingMore, colors.interactive.primary]);

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={48} color={colors.text.tertiary} />
        <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
          {diaryI18n.searchNoResults}
        </Text>
        <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
          {searchQuery || selectedMealTypes.length > 0 || datePreset
            ? diaryI18n.searchAdjustFilters
            : diaryI18n.searchRecordPrompt}
        </Text>
      </View>
    ),
    [colors, searchQuery, selectedMealTypes.length, datePreset]
  );

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      {/* Search Bar Row */}
      <View style={styles.searchRow}>
        <Pressable
          onPress={goBack}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>

        <View style={[styles.searchBar, { backgroundColor: colors.bg.secondary }]}>
          <Ionicons name="search" size={18} color={colors.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder={commonI18n.search}
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={clearSearch}>
              <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={toggleWouldEatAgain}
          style={styles.iconButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={wouldEatAgain ? "bookmark" : "bookmark-outline"}
            size={20}
            color={wouldEatAgain ? colors.interactive.primary : colors.text.primary}
          />
        </Pressable>

        <Pressable
          onPress={showSortSheet}
          style={styles.iconButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="swap-vertical" size={20} color={colors.text.primary} />
        </Pressable>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* Meal Type Filter */}
        <MealTypeFilterChips selected={selectedMealTypes} onChange={setSelectedMealTypes} />

        {/* Date Quick Filters */}
        <DateQuickFilters
          selected={datePreset}
          onChange={handleDatePresetChange}
          onCustomPress={handleOpenDateRangeModal}
        />

        {/* Active Filters */}
        <ActiveFilters
          searchQuery={searchQuery}
          mealTypes={selectedMealTypes}
          datePreset={datePreset}
          customDateLabel={customDateLabel}
          wouldEatAgain={wouldEatAgain}
          onRemoveSearch={clearSearch}
          onRemoveMealType={removeMealType}
          onRemoveDate={() => {
            handleDatePresetChange(null);
          }}
          onRemoveWouldEatAgain={toggleWouldEatAgain}
          onClearAll={handleClearAllFilters}
        />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.interactive.primary} />
        </View>
      ) : (
        <FlashList
          data={filteredEntries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={NUM_COLUMNS}
          estimatedItemSize={itemSize}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: tokens.spacing.component.sm,
    gap: tokens.spacing.component.sm,
  },
  backButton: {
    padding: tokens.spacing.component.xs,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.component.md,
    paddingVertical: tokens.spacing.component.sm,
    borderRadius: tokens.radius.md,
    gap: tokens.spacing.component.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: tokens.typography.fontSize.body,
    padding: 0,
  },
  iconButton: {
    padding: tokens.spacing.component.xs,
  },
  filtersContainer: {
    gap: tokens.spacing.component.sm,
    paddingBottom: tokens.spacing.component.md,
    paddingTop: tokens.spacing.component.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  gridContent: {
    // No horizontal padding - edge-to-edge
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  loadingMore: {
    paddingVertical: tokens.spacing.layout.md,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.layout.lg,
    paddingTop: tokens.spacing.layout.xl * 2,
    gap: tokens.spacing.component.md,
  },
  emptyTitle: {
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  emptyText: {
    fontSize: tokens.typography.fontSize.body,
    textAlign: "center",
  },
});
