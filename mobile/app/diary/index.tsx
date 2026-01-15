import React, { useCallback } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import * as ImagePicker from "expo-image-picker";
import type { Entry } from "@/entities/entry";
import { useDiaryPage, WeekDaySelector, EntryFeedItem } from "@/features/diary-feed";
import { formatDateToString, isSameDay } from "@/shared/lib/utils";
import { useDiaryI18n } from "@/shared/lib/i18n";
import { useTheme } from "@/shared/ui/design-system/theme";
import { tokens } from "@/shared/ui/design-system/tokens";
import { useOverlayHelpers } from "@/app/providers/overlay";

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function DiaryPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const diary = useDiaryI18n();
  const { bottomSheet } = useOverlayHelpers();

  // Use the extracted hook for all state and logic
  const {
    selectedDate,
    formattedMonthYear,
    today,
    entries,
    isLoading,
    markedDates,
    selectDate,
    handleCalendarDayPress,
    handleVisibleWeekChange,
    dateHasEntries,
  } = useDiaryPage(colors.interactive.primary);

  // =============================================================================
  // COMPUTED
  // =============================================================================

  const isToday = isSameDay(selectedDate, today);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleEntryPress = (entry: Entry) => {
    router.push(`/diary/${entry.id}`);
  };

  const handleOpenCalendar = useCallback(() => {
    bottomSheet(({ close }) => (
      <>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border.default }]}>
          <TouchableOpacity onPress={close} style={styles.modalCloseButton}>
            <Ionicons name="close" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{diary.selectDate}</Text>
          <View style={styles.modalCloseButton} />
        </View>

        <View style={styles.calendarContainer}>
          <Calendar
            current={formatDateToString(selectedDate)}
            maxDate={formatDateToString(today)}
            onDayPress={(day: { dateString: string }) => {
              handleCalendarDayPress(day);
              close();
            }}
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
      </>
    ));
  }, [bottomSheet, colors, diary.selectDate, selectedDate, markedDates, handleCalendarDayPress]);

  const handleLoadFromAlbum = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      // TODO: Navigate to processing flow with selected photos
      router.push("/");
    }
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

        <TouchableOpacity style={styles.headerTitleContainer} onPress={handleOpenCalendar}>
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
              onPress={isToday ? () => router.push("/") : handleLoadFromAlbum}
            >
              <Ionicons name={isToday ? "camera" : "images-outline"} size={20} color="white" />
              <Text style={styles.addMealButtonText}>{isToday ? diary.recordMeal : diary.loadFromAlbum}</Text>
            </TouchableOpacity>
            <View style={styles.secondaryLink}>
              {isToday ? (
                <TouchableOpacity onPress={handleLoadFromAlbum}>
                  <Text style={[styles.secondaryLinkText, { color: colors.text.secondary }]}>
                    {diary.orSelectFromPhotos}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.secondaryLinkText}> </Text>
              )}
            </View>
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

      {/* FAB - show when entries exist */}
      {!isLoading && entries.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.interactive.primary }]}
          onPress={isToday ? () => router.push("/") : handleLoadFromAlbum}
          activeOpacity={0.8}
        >
          <Ionicons name={isToday ? "camera" : "images-outline"} size={22} color="white" />
        </TouchableOpacity>
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
    paddingVertical: tokens.spacing.component.md,
    paddingHorizontal: 20,
    borderRadius: tokens.radius.md,
    gap: tokens.spacing.component.sm,
    marginTop: tokens.spacing.component.md,
  },
  addMealButtonText: {
    color: "white",
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  secondaryLink: {
    paddingVertical: tokens.spacing.component.sm,
  },
  secondaryLinkText: {
    fontSize: tokens.typography.fontSize.bodySmall,
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
  fab: {
    position: "absolute",
    bottom: tokens.spacing.layout.lg,
    right: tokens.spacing.layout.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
});
