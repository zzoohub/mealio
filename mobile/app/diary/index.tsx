import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { DateData } from "react-native-calendars";
import * as ImagePicker from "expo-image-picker";
import type { Entry } from "@/entities/entry";
import { useEntryData, useUploadQueueStore } from "@/entities/entry";
import { useIsAuthenticated } from "@/shared/lib/auth";
import { useEntryFeedPage, WeekDaySelector, EntryFeedItem, CalendarSheetContent } from "@/features/entry-feed";
import { detectMealType } from "@/features/capture-meal";
import { isSameDay } from "@/shared/lib/utils";
import { useDiaryI18n, useCameraI18n, getCurrentLanguage } from "@/shared/lib/i18n";
import { useDeviceLocation } from "@/shared/lib/location";
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
  const cameraI18n = useCameraI18n();
  const { bottomSheet, toast } = useOverlayHelpers();
  const { saveEntry } = useEntryData();
  const { getLocation } = useDeviceLocation();
  const [isSaving, setIsSaving] = useState(false);
  const isAuthenticated = useIsAuthenticated();
  const enqueue = useUploadQueueStore((s) => s.enqueue);
  const retryUpload = useUploadQueueStore((s) => s.retry);

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
    dateThumbnails,
  } = useEntryFeedPage(colors.interactive.primary);

  // =============================================================================
  // COMPUTED
  // =============================================================================

  const isToday = isSameDay(selectedDate, today);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleEntryPress = useCallback(
    (entry: Entry) => {
      if (entry._uploadStatus === "failed") {
        retryUpload(entry.id);
        return;
      }
      if (entry._uploadStatus) return; // pending/uploading — no-op
      router.push(`/diary/${entry.id}`);
    },
    [router, retryUpload],
  );

  const handleOpenCalendar = useCallback(() => {
    bottomSheet(({ close }) => (
      <CalendarSheetContent
        selectedDate={selectedDate}
        today={today}
        markedDates={markedDates}
        initialThumbnails={dateThumbnails}
        onDayPress={(day: DateData) => {
          handleCalendarDayPress(day);
          close();
        }}
        onClose={close}
        title={diary.selectDate}
      />
    ));
  }, [bottomSheet, selectedDate, today, markedDates, dateThumbnails, handleCalendarDayPress, diary.selectDate]);

  const handleLoadFromAlbum = useCallback(async () => {
    if (isSaving) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const photoUris = result.assets.map((a) => a.uri);

      if (isToday) {
        router.push({
          pathname: "/",
          params: {
            initialPhotos: photoUris.join(","),
            targetDate: selectedDate.toISOString(),
          },
        });
        return;
      }

      if (isAuthenticated) {
        const location = await getLocation();
        enqueue(
          {
            userId: "",
            timestamp: selectedDate,
            notes: "",
            location,
            meal: {
              photoUri: photoUris[0]!,
              mealType: detectMealType(selectedDate),
            },
          },
          photoUris,
        );
        toast({
          title: cameraI18n.capture.success,
          message: cameraI18n.capture.successMessage,
          type: "success",
          position: "top",
          duration: 4000,
        });
      } else {
        setIsSaving(true);
        try {
          const location = await getLocation();
          const entryId = await saveEntry(
            {
              userId: "",
              timestamp: selectedDate,
              notes: "",
              location,
              meal: {
                photoUri: photoUris[0]!,
                mealType: detectMealType(selectedDate),
              },
            },
            photoUris,
          );

          toast({
            title: cameraI18n.capture.success,
            message: cameraI18n.capture.successMessage,
            type: "success",
            position: "top",
            showArrow: true,
            duration: 4000,
            onPress: entryId ? () => router.push(`/diary/${entryId}`) : undefined,
          });
        } catch (error) {
          console.error("Failed to save entry:", error);
          toast({
            title: cameraI18n.capture.error,
            message: cameraI18n.capture.errorMessage,
            type: "error",
            position: "top",
            duration: 4000,
          });
        } finally {
          setIsSaving(false);
        }
      }
    }
  }, [isSaving, isToday, isAuthenticated, selectedDate, router, getLocation, saveEntry, enqueue, toast, cameraI18n]);

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
              {selectedDate.toLocaleDateString(getCurrentLanguage(), {
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
    marginTop: 10,
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
