import React, { useCallback, useRef } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import type { DateData } from "react-native-calendars";
import * as ImagePicker from "expo-image-picker";
import type { Entry } from "@/entities/entry";
import { useEntryFeedPage, WeekDaySelector, EntryFeedItem } from "@/features/entry-feed";
import { formatDateToString, isSameDay } from "@/shared/lib/utils";
import { useDiaryI18n } from "@/shared/lib/i18n";
import { useTheme } from "@/shared/ui/theme";
import { tokens } from "@/shared/ui/tokens";
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
    handleCalendarMonthChange,
    dateThumbnails,
    calendarThumbnails,
  } = useEntryFeedPage(colors.interactive.primary);

  // Ref to hold calendarThumbnails for the custom day component (avoids stale closures)
  const calendarThumbnailsRef = useRef(calendarThumbnails);
  calendarThumbnailsRef.current = calendarThumbnails;

  // =============================================================================
  // COMPUTED
  // =============================================================================

  const isToday = isSameDay(selectedDate, today);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleEntryPress = useCallback(
    (entry: Entry) => {
      router.push(`/diary/${entry.id}`);
    },
    [router],
  );

  const renderCalendarDay = useCallback(
    (dayProps: { date?: DateData; state?: string; marking?: { selected?: boolean; marked?: boolean } }, onDayPress: (day: DateData) => void) => {
      if (!dayProps.date) return <View />;
      const { date, state, marking } = dayProps;
      const dateStr = date.dateString;
      const isDisabled = state === "disabled";
      const isSelected = !!marking?.selected;
      const isTodayDate = dateStr === formatDateToString(today);
      const thumbnailUrl = calendarThumbnailsRef.current.get(dateStr) ?? null;
      const hasThumbnail = !!thumbnailUrl && !isDisabled;

      return (
        <Pressable
          style={[
            styles.calendarDay,
            hasThumbnail && styles.calendarDayWithThumbnail,
          ]}
          onPress={() => !isDisabled && onDayPress(date)}
          disabled={isDisabled}
        >
          {hasThumbnail && (
            <>
              <Image
                source={{ uri: thumbnailUrl }}
                style={styles.calendarDayThumbnail}
                blurRadius={4}
                contentFit="cover"
              />
              <View style={styles.calendarDayOverlay} />
            </>
          )}
          {isSelected && (
            <View style={[styles.calendarDaySelectionBorder, { borderColor: colors.interactive.primary }]} pointerEvents="none" />
          )}
          <Text
            style={[
              styles.calendarDayText,
              { color: hasThumbnail ? "white" : colors.text.primary },
              isTodayDate && !isSelected && !hasThumbnail && { color: colors.interactive.primary, fontWeight: tokens.typography.fontWeight.bold },
              isSelected && !hasThumbnail && { color: colors.interactive.primary, fontWeight: tokens.typography.fontWeight.bold },
              isDisabled && { color: colors.text.secondary, opacity: 0.4 },
            ]}
          >
            {date.day}
          </Text>
        </Pressable>
      );
    },
    [colors, today],
  );

  const handleOpenCalendar = useCallback(() => {
    // Trigger initial month thumbnail fetch
    const selDate = selectedDate;
    handleCalendarMonthChange({
      dateString: formatDateToString(selDate),
      year: selDate.getFullYear(),
      month: selDate.getMonth() + 1,
    });

    bottomSheet(({ close }) => (
      <>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{diary.selectDate}</Text>
          <Pressable onPress={close} style={styles.modalCloseButton}>
            <Ionicons name="close" size={22} color={colors.text.secondary} />
          </Pressable>
        </View>

        <View style={styles.calendarContainer}>
          <Calendar
            current={formatDateToString(selectedDate)}
            maxDate={formatDateToString(today)}
            onDayPress={(day: DateData) => {
              handleCalendarDayPress(day);
              close();
            }}
            onMonthChange={(date: DateData) => {
              handleCalendarMonthChange({
                dateString: date.dateString,
                year: date.year,
                month: date.month,
              });
            }}
            markedDates={markedDates}
            dayComponent={(props: { date?: DateData; state?: string; marking?: { selected?: boolean; marked?: boolean } }) =>
              renderCalendarDay(props, (day) => {
                handleCalendarDayPress(day);
                close();
              })
            }
            theme={{
              backgroundColor: colors.bg.secondary,
              calendarBackground: colors.bg.secondary,
              textSectionTitleColor: colors.text.secondary,
              arrowColor: colors.interactive.primary,
              disabledArrowColor: colors.text.secondary,
              monthTextColor: colors.text.primary,
              indicatorColor: colors.interactive.primary,
              textMonthFontWeight: "600",
              textDayHeaderFontWeight: "500",
              textMonthFontSize: tokens.typography.fontSize.h4,
              textDayHeaderFontSize: tokens.typography.fontSize.bodySmall,
            }}
          />
        </View>
      </>
    ));
  }, [bottomSheet, colors, diary.selectDate, selectedDate, markedDates, handleCalendarDayPress, handleCalendarMonthChange, renderCalendarDay, today]);

  const handleLoadFromAlbum = useCallback(async () => {
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
  }, [router]);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerSideButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>

        <Pressable style={styles.headerTitleContainer} onPress={handleOpenCalendar}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{formattedMonthYear}</Text>
          <Ionicons name="chevron-down" size={18} color={colors.text.secondary} />
        </Pressable>

        <Pressable onPress={() => router.push("/diary/search")} style={styles.headerSideButton}>
          <Ionicons name="search" size={22} color={colors.text.primary} />
        </Pressable>
      </View>

      {/* Week Navigation */}
      <WeekDaySelector
        selectedDate={selectedDate}
        today={today}
        onDateSelect={selectDate}
        onVisibleWeekChange={handleVisibleWeekChange}
        dateThumbnails={dateThumbnails}
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
            <Pressable
              style={[styles.addMealButton, { backgroundColor: colors.interactive.primary }]}
              onPress={isToday ? () => router.push("/") : handleLoadFromAlbum}
            >
              <Ionicons name={isToday ? "camera" : "images-outline"} size={20} color="white" />
              <Text style={styles.addMealButtonText}>{isToday ? diary.recordMeal : diary.loadFromAlbum}</Text>
            </Pressable>
            <View style={styles.secondaryLink}>
              {isToday ? (
                <Pressable onPress={handleLoadFromAlbum}>
                  <Text style={[styles.secondaryLinkText, { color: colors.text.secondary }]}>
                    {diary.orSelectFromPhotos}
                  </Text>
                </Pressable>
              ) : (
                <Text style={styles.secondaryLinkText}> </Text>
              )}
            </View>
          </View>
        ) : (
          <FlashList
            data={entries}
            renderItem={({ item }) => <EntryFeedItem entry={item} onPress={handleEntryPress} />}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* FAB - show when entries exist */}
      {!isLoading && entries.length > 0 && (
        <Pressable
          style={[styles.fab, { backgroundColor: colors.interactive.primary }]}
          onPress={isToday ? () => router.push("/") : handleLoadFromAlbum}
        >
          <Ionicons name={isToday ? "camera" : "images-outline"} size={22} color="white" />
        </Pressable>
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
    paddingHorizontal: tokens.spacing.layout.md,
    paddingTop: tokens.spacing.layout.md,
    paddingBottom: tokens.spacing.component.sm,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: tokens.typography.fontSize.h3,
    fontWeight: tokens.typography.fontWeight.bold,
  },
  calendarContainer: {
    paddingHorizontal: tokens.spacing.component.sm,
    paddingBottom: tokens.spacing.layout.xl,
    minHeight: 400,
  },
  calendarDay: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.sm,
    overflow: "hidden",
  },
  calendarDayWithThumbnail: {
    position: "relative",
  },
  calendarDaySelectionBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    zIndex: 2,
  },
  calendarDayThumbnail: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: tokens.radius.sm,
  },
  calendarDayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderRadius: tokens.radius.sm,
  },
  calendarDayText: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.medium,
    zIndex: 1,
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
