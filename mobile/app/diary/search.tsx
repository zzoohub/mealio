import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Entry,
  useDiarySearchPage,
  MealTypeFilterChips,
  DateQuickFilters,
  ActiveFilters,
  SearchGridItem,
  EntryDateRangeModal,
} from "@/domains/diary";
import { useTheme } from "@/design-system/theme";
import { tokens } from "@/design-system/tokens";

// =============================================================================
// CONSTANTS
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_GAP = 1;
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function DiarySearchScreen() {
  const { colors } = useTheme();

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
    dateRange,
    calendarRange,
    customDateLabel,
    handleDatePresetChange,
    handleDayPress,
    setDateRangePreset,
    clearDateRange,
    showSortSheet,
    showDateRangeModal,
    setShowDateRangeModal,
    handleCustomDatePress,
    handleDateModalClose,
    handleEntryPress,
    handleClearAllFilters,
    loadMore,
    goBack,
  } = useDiarySearchPage();

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const renderItem = useCallback(
    ({ item }: { item: Entry }) => (
      <SearchGridItem entry={item} size={ITEM_SIZE} onPress={handleEntryPress} />
    ),
    [handleEntryPress]
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
          검색 결과가 없습니다
        </Text>
        <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
          {searchQuery || selectedMealTypes.length > 0 || datePreset
            ? "필터를 조정해보세요"
            : "식사를 기록하면 여기에 표시됩니다"}
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
        <TouchableOpacity
          onPress={goBack}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <View style={[styles.searchBar, { backgroundColor: colors.bg.secondary }]}>
          <Ionicons name="search" size={18} color={colors.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="검색..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={showSortSheet}
          style={styles.iconButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="swap-vertical" size={20} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* Meal Type Filter */}
        <MealTypeFilterChips selected={selectedMealTypes} onChange={setSelectedMealTypes} />

        {/* Date Quick Filters */}
        <DateQuickFilters
          selected={datePreset}
          onChange={handleDatePresetChange}
          onCustomPress={handleCustomDatePress}
        />

        {/* Active Filters */}
        <ActiveFilters
          searchQuery={searchQuery}
          mealTypes={selectedMealTypes}
          datePreset={datePreset}
          customDateLabel={customDateLabel}
          onRemoveSearch={clearSearch}
          onRemoveMealType={removeMealType}
          onRemoveDate={() => {
            handleDatePresetChange(null);
          }}
          onClearAll={handleClearAllFilters}
        />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.interactive.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Date Range Modal */}
      <EntryDateRangeModal
        visible={showDateRangeModal}
        onClose={handleDateModalClose}
        calendarRange={calendarRange}
        onDayPress={handleDayPress}
        onPresetSelect={(days) => {
          setDateRangePreset(days);
          handleDatePresetChange("custom");
        }}
        onClear={() => {
          clearDateRange();
          handleDatePresetChange(null);
        }}
      />
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
