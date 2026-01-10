import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  SectionList,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Entry,
  useEntrySearch,
  EntryListItem,
  EntrySearchBar,
  EntryFilterChips,
  EntrySortModal,
  EntryDateRangeModal,
  SortedSection,
} from "@/domains/diary";
import { useDiaryI18n } from "@/lib/i18n";
import { useTheme } from "@/design-system/theme";
import { tokens } from "@/design-system/tokens";

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function DiarySearchScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const diary = useDiaryI18n();

  // Use the extracted hook for all state and logic
  const {
    sections,
    isLoading,
    isLoadingMore,
    searchQuery,
    setSearchQuery,
    sortMethod,
    sortOptions,
    dateRange,
    calendarRange,
    formatDateRange,
    handleDayPress,
    setDateRangePreset,
    clearDateRange,
    showSortModal,
    setShowSortModal,
    showDateRangeModal,
    setShowDateRangeModal,
    loadMore,
    handleSortMethodSelect,
  } = useEntrySearch();

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleEntryPress = (entry: Entry) => {
    router.push(`/diary/${entry.id}`);
  };

  const handleQuickCapture = () => {
    router.push("/");
  };

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const renderEntryItem = ({ item }: { item: Entry }) => (
    <EntryListItem entry={item} onPress={handleEntryPress} />
  );

  const renderSectionHeader = ({ section }: { section: SortedSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.bg.primary }]}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
        {section.title}
      </Text>
      <Text style={[styles.sectionCount, { color: colors.text.secondary }]}>
        {section.data.length} {diary.stat("meals")}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color={colors.interactive.primary} />
        <Text style={[styles.loadingMoreText, { color: colors.text.secondary }]}>
          {diary.loadMore}
        </Text>
      </View>
    );
  };

  const showClearButton =
    Boolean(dateRange.startDate) ||
    Boolean(dateRange.endDate);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          {diary.diaryHistory}
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => setShowSortModal(true)}
            style={styles.headerButton}
          >
            <Ionicons name="funnel" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowDateRangeModal(true)}
            style={styles.headerButton}
          >
            <Ionicons name="calendar" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <EntrySearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={diary.searchPlaceholder}
      />

      {/* Filter Chips */}
      <EntryFilterChips
        sortMethod={sortMethod}
        dateRangeLabel={formatDateRange()}
        showClearButton={showClearButton}
        onSortPress={() => setShowSortModal(true)}
        onDateRangePress={() => setShowDateRangeModal(true)}
        onClear={clearDateRange}
      />

      {/* Content */}
      <View style={styles.contentWrapper}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.interactive.primary} />
            <Text style={[styles.loadingText, { color: colors.text.primary }]}>
              Loading your meals...
            </Text>
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={64} color={colors.text.secondary} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              {diary.noMealsFound}
            </Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              {searchQuery
                ? "Try adjusting your search"
                : "Start logging meals to see your history here!"}
            </Text>
            <TouchableOpacity
              style={[styles.addMealButton, { backgroundColor: colors.interactive.primary }]}
              onPress={handleQuickCapture}
            >
              <Ionicons name="camera" size={20} color="white" />
              <Text style={styles.addMealButtonText}>Quick Capture</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item: Entry) => item.id}
            renderItem={renderEntryItem}
            renderSectionHeader={renderSectionHeader}
            ListFooterComponent={renderFooter}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            style={styles.mealsList}
            contentContainerStyle={styles.mealsListContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
          />
        )}
      </View>

      {/* Sort Modal */}
      <EntrySortModal
        visible={showSortModal}
        onClose={() => setShowSortModal(false)}
        currentSortMethod={sortMethod}
        sortOptions={sortOptions}
        onSelect={handleSortMethodSelect}
      />

      {/* Date Range Modal */}
      <EntryDateRangeModal
        visible={showDateRangeModal}
        onClose={() => setShowDateRangeModal(false)}
        calendarRange={calendarRange}
        onDayPress={handleDayPress}
        onPresetSelect={setDateRangePreset}
        onClear={clearDateRange}
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
  contentWrapper: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing.layout.md,
    paddingTop: tokens.spacing.component.md,
    paddingBottom: tokens.spacing.component.md,
  },
  backButton: {
    padding: tokens.spacing.component.xs,
  },
  headerTitle: {
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.semibold,
    flex: 1,
    textAlign: "center",
  },
  headerButtons: {
    flexDirection: "row",
    gap: tokens.spacing.component.sm,
  },
  headerButton: {
    padding: tokens.spacing.component.sm,
    borderRadius: tokens.radius.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: tokens.spacing.component.md,
  },
  loadingText: {
    fontSize: tokens.typography.fontSize.body,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.layout.xl,
    gap: tokens.spacing.component.md,
  },
  emptyTitle: {
    fontSize: tokens.typography.fontSize.h3,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  emptyText: {
    fontSize: tokens.typography.fontSize.body,
    textAlign: "center",
    lineHeight: tokens.typography.lineHeight.body * tokens.typography.fontSize.body,
  },
  addMealButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.layout.lg,
    paddingVertical: tokens.spacing.component.md,
    borderRadius: tokens.radius.md,
    gap: tokens.spacing.component.sm,
    marginTop: tokens.spacing.component.sm,
  },
  addMealButtonText: {
    color: "white",
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  mealsList: {
    flex: 1,
  },
  mealsListContent: {
    paddingHorizontal: tokens.spacing.layout.md,
    paddingBottom: tokens.spacing.layout.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: tokens.spacing.component.md,
  },
  sectionTitle: {
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  sectionCount: {
    fontSize: tokens.typography.fontSize.bodySmall,
  },
  loadingMoreContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: tokens.spacing.layout.md,
    gap: tokens.spacing.component.sm,
  },
  loadingMoreText: {
    fontSize: tokens.typography.fontSize.bodySmall,
  },
});
