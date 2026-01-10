import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import {
  Meal,
  useDiaryPage,
  WeekDaySelector,
  MealFeedItem,
} from "@/domains/diary";
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
    weekDays,
    formattedMonthYear,
    today,
    meals,
    isLoading,
    showCalendarModal,
    setShowCalendarModal,
    markedDates,
    selectDate,
    navigateToPreviousWeek,
    navigateToNextWeek,
    handleCalendarDayPress,
    dateHasMeals,
  } = useDiaryPage(colors.interactive.primary);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleMealPress = (meal: Meal) => {
    // TODO: Navigate to meal detail page
    console.log("Meal pressed:", meal.id);
  };

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

        <TouchableOpacity
          style={styles.headerTitleContainer}
          onPress={() => setShowCalendarModal(true)}
        >
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            {formattedMonthYear}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.text.secondary} />
        </TouchableOpacity>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => router.push("/diary/search")}
            style={styles.headerButton}
          >
            <Ionicons name="search" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            style={styles.headerButton}
          >
            <Ionicons name="settings-outline" size={22} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Week Navigation */}
      <WeekDaySelector
        weekDays={weekDays}
        selectedDate={selectedDate}
        today={today}
        onDateSelect={selectDate}
        onPreviousWeek={navigateToPreviousWeek}
        onNextWeek={navigateToNextWeek}
        dateHasMeals={dateHasMeals}
      />

      {/* Content */}
      <View style={styles.contentWrapper}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.interactive.primary} />
          </View>
        ) : meals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={64} color={colors.text.secondary} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              {diary.noMealsFound}
            </Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              {selectedDate.toLocaleDateString("ko-KR", {
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </Text>
            <TouchableOpacity
              style={[styles.addMealButton, { backgroundColor: colors.interactive.primary }]}
              onPress={() => router.push("/(main)")}
            >
              <Ionicons name="camera" size={20} color="white" />
              <Text style={styles.addMealButtonText}>{diary.recordMeal}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Date Label */}
            <Text style={[styles.dateLabel, { color: colors.text.primary }]}>
              {selectedDate.toLocaleDateString("ko-KR", {
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </Text>

            {/* Feed */}
            <View style={styles.feed}>
              {meals.map((meal, index) => (
                <MealFeedItem
                  key={meal.id}
                  meal={meal}
                  onPress={handleMealPress}
                  showDivider={index < meals.length - 1}
                />
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Calendar Modal */}
      <BottomSheet
        visible={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        height="auto"
      >
        <View style={[styles.modalHeader, { borderBottomColor: colors.border.default }]}>
          <TouchableOpacity
            onPress={() => setShowCalendarModal(false)}
            style={styles.modalCloseButton}
          >
            <Ionicons name="close" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
            {diary.selectDate}
          </Text>
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
    paddingHorizontal: tokens.spacing.component.md,
    paddingTop: tokens.spacing.component.sm,
    paddingBottom: tokens.spacing.component.md,
  },
  backButton: {
    padding: tokens.spacing.component.xs,
    width: 40,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.component.xs,
    paddingVertical: tokens.spacing.component.xs,
    paddingHorizontal: tokens.spacing.component.sm,
  },
  headerTitle: {
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  headerButtons: {
    flexDirection: "row",
    gap: tokens.spacing.component.xs,
  },
  headerButton: {
    padding: tokens.spacing.component.sm,
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
  contentContainer: {
    padding: tokens.spacing.component.md,
  },
  dateLabel: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
    marginBottom: tokens.spacing.layout.md,
  },
  feed: {
    gap: tokens.spacing.layout.lg,
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
