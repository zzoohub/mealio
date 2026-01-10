import React from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { Entry, useDiaryPage, WeekDaySelector, EntryFeedItem } from "@/domains/diary";
import { formatDateToString } from "@/domains/diary/utils/dateUtils";
import { useDiaryI18n } from "@/lib/i18n";
import { useTheme } from "@/design-system/theme";
import { tokens } from "@/design-system/tokens";
import { BottomSheet } from "@/design-system/styled";

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function DiaryPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const diary = useDiaryI18n();

  // Use the extracted hook for all state and logic
  const {
    selectedDate,
    formattedMonthYear,
    today,
    entries,
    isLoading,
    showCalendarModal,
    setShowCalendarModal,
    markedDates,
    selectDate,
    handleCalendarDayPress,
    handleVisibleWeekChange,
    dateHasEntries,
  } = useDiaryPage(colors.interactive.primary);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleEntryPress = (entry: Entry) => {
    router.push(`/diary/${entry.id}`);
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerSideButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerTitleContainer} onPress={() => setShowCalendarModal(true)}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{formattedMonthYear}</Text>
          <Ionicons name="chevron-down" size={18} color={colors.text.secondary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/diary/search")} style={styles.headerSideButton}>
          <Ionicons name="search" size={22} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Week Navigation */}
      <WeekDaySelector
        selectedDate={selectedDate}
        today={today}
        onDateSelect={selectDate}
        onVisibleWeekChange={handleVisibleWeekChange}
        dateHasEntries={dateHasEntries}
      />

      {/* Content */}
      <View style={styles.contentWrapper}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.interactive.primary} />
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={64} color={colors.text.secondary} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{diary.noMealsFound}</Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              {selectedDate.toLocaleDateString("ko-KR", {
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </Text>
            <TouchableOpacity
              style={[styles.addMealButton, { backgroundColor: colors.interactive.primary }]}
              onPress={() => router.push("/")}
            >
              <Ionicons name="camera" size={20} color="white" />
              <Text style={styles.addMealButtonText}>{diary.recordMeal}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            {/* Feed - edge-to-edge */}
            {entries.map(entry => (
              <EntryFeedItem key={entry.id} entry={entry} onPress={handleEntryPress} />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Calendar Modal */}
      <BottomSheet visible={showCalendarModal} onClose={() => setShowCalendarModal(false)} height="auto">
        <View style={[styles.modalHeader, { borderBottomColor: colors.border.default }]}>
          <TouchableOpacity onPress={() => setShowCalendarModal(false)} style={styles.modalCloseButton}>
            <Ionicons name="close" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{diary.selectDate}</Text>
          <View style={styles.modalCloseButton} />
        </View>

        <View style={styles.calendarContainer}>
          <Calendar
            current={formatDateToString(selectedDate)}
            onDayPress={handleCalendarDayPress}
            markedDates={markedDates}
            theme={{
              backgroundColor: colors.bg.secondary,
              calendarBackground: colors.bg.secondary,
              textSectionTitleColor: colors.text.secondary,
              selectedDayBackgroundColor: colors.interactive.primary,
              selectedDayTextColor: "white",
              todayTextColor: colors.interactive.primary,
              dayTextColor: colors.text.primary,
              textDisabledColor: colors.text.secondary + "60",
              dotColor: colors.interactive.primary,
              selectedDotColor: "white",
              arrowColor: colors.interactive.primary,
              disabledArrowColor: colors.text.secondary,
              monthTextColor: colors.text.primary,
              indicatorColor: colors.interactive.primary,
              textDayFontWeight: "400",
              textMonthFontWeight: "600",
              textDayHeaderFontWeight: "500",
              textDayFontSize: tokens.typography.fontSize.body,
              textMonthFontSize: tokens.typography.fontSize.h4,
              textDayHeaderFontSize: tokens.typography.fontSize.bodySmall,
            }}
          />
        </View>
      </BottomSheet>
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
    paddingTop: tokens.spacing.component.sm,
    paddingBottom: tokens.spacing.component.sm,
  },
  headerSideButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.component.xs,
  },
  headerTitle: {
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.layout.xl,
    paddingBottom: 80,
    gap: tokens.spacing.component.md,
  },
  emptyTitle: {
    fontSize: tokens.typography.fontSize.h3,
    fontWeight: tokens.typography.fontWeight.semibold,
    marginTop: tokens.spacing.component.md,
  },
  emptyText: {
    fontSize: tokens.typography.fontSize.bodySmall,
    textAlign: "center",
  },
  addMealButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.layout.lg,
    paddingVertical: tokens.spacing.component.md,
    borderRadius: tokens.radius.md,
    gap: tokens.spacing.component.sm,
    marginTop: tokens.spacing.component.md,
  },
  addMealButtonText: {
    color: "white",
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  contentScroll: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing.component.md,
    paddingVertical: tokens.spacing.component.md,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.semibold,
    flex: 1,
    textAlign: "center",
  },
  calendarContainer: {
    padding: tokens.spacing.component.md,
    paddingBottom: tokens.spacing.layout.xl,
    minHeight: 370,
  },
});
