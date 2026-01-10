import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { Meal, mealStorageUtils } from "@/domains/diary";
import { useDiaryI18n } from "@/lib/i18n";
import { useTheme } from "@/design-system/theme";
import { tokens } from "@/design-system/tokens";
import { BottomSheet } from "@/design-system/styled";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FEED_PADDING = 16;
const PHOTO_WIDTH = SCREEN_WIDTH - FEED_PADDING * 2;
const PHOTO_HEIGHT = PHOTO_WIDTH * 0.75; // 4:3 aspect ratio

// Helper functions for date manipulation
const getWeekDays = (date: Date): Date[] => {
  const days: Date[] = [];
  const current = new Date(date);
  const dayOfWeek = current.getDay();

  // Start from Sunday (0)
  current.setDate(current.getDate() - dayOfWeek);

  for (let i = 0; i < 7; i++) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const getMealTypeEmoji = (mealType: string): string => {
  switch (mealType.toLowerCase()) {
    case "breakfast":
      return "🌅";
    case "lunch":
      return "☀️";
    case "dinner":
      return "🌙";
    case "snack":
      return "🍎";
    default:
      return "🍽️";
  }
};

const getMealTypeLabel = (mealType: string): string => {
  switch (mealType.toLowerCase()) {
    case "breakfast":
      return "아침";
    case "lunch":
      return "점심";
    case "dinner":
      return "저녁";
    case "snack":
      return "간식";
    default:
      return "식사";
  }
};

const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const DAY_NAMES_KO = ["일", "월", "화", "수", "목", "금", "토"];

export default function DiaryPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const diary = useDiaryI18n();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [datesWithMeals, setDatesWithMeals] = useState<Set<string>>(new Set());
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Initialize week days
  useEffect(() => {
    setWeekDays(getWeekDays(selectedDate));
  }, []);

  // Update week when navigating
  const updateWeek = useCallback((date: Date) => {
    setWeekDays(getWeekDays(date));
  }, []);

  // Load all meals to determine markers
  useEffect(() => {
    const loadAllMeals = async () => {
      try {
        const loadedMeals = await mealStorageUtils.getAllMeals();

        // Create set of dates that have meals
        const datesSet = new Set<string>();
        loadedMeals.forEach(meal => {
          const dateStr = meal.timestamp.toISOString().split("T")[0];
          if (dateStr) datesSet.add(dateStr);
        });
        setDatesWithMeals(datesSet);
      } catch (error) {
        console.error("Error loading all meals:", error);
      }
    };

    loadAllMeals();
  }, []);

  // Load meals for selected date
  useEffect(() => {
    const loadMealsForDate = async () => {
      setIsLoading(true);
      try {
        const mealsForDate = await mealStorageUtils.getMealsForDate(selectedDate);
        // Sort by timestamp (newest first)
        mealsForDate.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setMeals(mealsForDate);
      } catch (error) {
        console.error("Error loading meals for date:", error);
        setMeals([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadMealsForDate();
  }, [selectedDate]);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const navigateToPreviousWeek = useCallback(() => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
    updateWeek(newDate);
  }, [selectedDate, updateWeek]);

  const navigateToNextWeek = useCallback(() => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
    updateWeek(newDate);
  }, [selectedDate, updateWeek]);

  const handleMealPress = useCallback((meal: Meal) => {
    // TODO: Navigate to meal detail page
    console.log("Meal pressed:", meal.id);
  }, []);

  const handleCalendarDayPress = useCallback((day: { dateString: string }) => {
    const selectedDateFromCalendar = new Date(day.dateString + "T12:00:00");
    setSelectedDate(selectedDateFromCalendar);
    updateWeek(selectedDateFromCalendar);
    setShowCalendarModal(false);
  }, [updateWeek]);

  const today = useMemo(() => new Date(), []);

  const dateHasMeals = useCallback((date: Date): boolean => {
    const dateStr = date.toISOString().split("T")[0];
    return dateStr ? datesWithMeals.has(dateStr) : false;
  }, [datesWithMeals]);

  const getFormattedMonthYear = useMemo(() => {
    if (weekDays.length === 0) return "";
    const middleDate = weekDays[3];
    if (!middleDate) return "";
    return middleDate.toLocaleDateString("ko-KR", { month: "long", year: "numeric" });
  }, [weekDays]);

  // Create markedDates for the calendar modal
  const markedDates = useMemo(() => {
    const marks: Record<string, { marked: boolean; dotColor: string; selected?: boolean; selectedColor?: string }> = {};

    // Add dots for dates with meals
    datesWithMeals.forEach(dateStr => {
      marks[dateStr] = {
        marked: true,
        dotColor: colors.interactive.primary,
      };
    });

    // Mark selected date
    const selectedDateStr = formatDateToString(selectedDate);
    if (marks[selectedDateStr]) {
      marks[selectedDateStr] = {
        ...marks[selectedDateStr],
        selected: true,
        selectedColor: colors.interactive.primary,
      };
    } else {
      marks[selectedDateStr] = {
        marked: false,
        dotColor: colors.interactive.primary,
        selected: true,
        selectedColor: colors.interactive.primary,
      };
    }

    return marks;
  }, [datesWithMeals, selectedDate, colors.interactive.primary]);

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
            {getFormattedMonthYear}
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
      <View style={[styles.weekNavigation, { borderBottomColor: colors.border.default }]}>
        <TouchableOpacity onPress={navigateToPreviousWeek} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.weekCalendar}>
          {weekDays.map((date, index) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, today);
            const hasMeals = dateHasMeals(date);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayItem,
                  isSelected && { backgroundColor: colors.interactive.primary },
                ]}
                onPress={() => handleDateSelect(date)}
              >
                <Text
                  style={[
                    styles.dayName,
                    { color: isSelected ? "white" : colors.text.secondary },
                  ]}
                >
                  {DAY_NAMES_KO[index]}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    { color: isSelected ? "white" : colors.text.primary },
                    isToday && !isSelected && { color: colors.interactive.primary },
                  ]}
                >
                  {date.getDate()}
                </Text>
                {/* Always render dot container to prevent layout shift, use opacity for visibility */}
                <View
                  style={[
                    styles.mealMarker,
                    {
                      backgroundColor: isSelected ? "white" : colors.interactive.primary,
                      opacity: hasMeals ? 1 : 0,
                    },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity onPress={navigateToNextWeek} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Content - Use flex: 1 container to prevent layout shift between states */}
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
                weekday: "long"
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
                weekday: "long"
              })}
            </Text>

            {/* Feed */}
            <View style={styles.feed}>
              {meals.map((meal, index) => (
                <TouchableOpacity
                  key={meal.id}
                  style={styles.feedItem}
                  onPress={() => handleMealPress(meal)}
                  activeOpacity={0.9}
                >
                  {/* Photo */}
                  <View style={[styles.photoContainer, { backgroundColor: colors.bg.secondary }]}>
                    {meal.photoUri ? (
                      <Image
                        source={{ uri: meal.photoUri }}
                        style={styles.mealPhoto}
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="image-outline" size={48} color={colors.text.secondary} />
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.mealInfo}>
                    <Text style={[styles.mealType, { color: colors.text.primary }]}>
                      {getMealTypeEmoji(meal.mealType)} {getMealTypeLabel(meal.mealType)}
                    </Text>
                    <View style={styles.mealMeta}>
                      <Text style={[styles.mealTime, { color: colors.text.secondary }]}>
                        {formatTime(meal.timestamp)}
                      </Text>
                      {meal.location?.address && (
                        <>
                          <Text style={[styles.metaDivider, { color: colors.text.secondary }]}>·</Text>
                          <Text
                            style={[styles.mealLocation, { color: colors.text.secondary }]}
                            numberOfLines={1}
                          >
                            {meal.location.restaurantName || meal.location.address.split(",")[0]}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>

                  {/* Divider (except for last item) */}
                  {index < meals.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
                  )}
                </TouchableOpacity>
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
              textDayFontWeight: tokens.typography.fontWeight.normal,
              textMonthFontWeight: tokens.typography.fontWeight.semibold,
              textDayHeaderFontWeight: tokens.typography.fontWeight.medium,
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Wrapper ensures consistent layout regardless of loading/empty/content state
  contentWrapper: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 4,
  },
  headerButton: {
    padding: 8,
  },
  weekNavigation: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  navButton: {
    padding: 8,
  },
  weekCalendar: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  dayItem: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    minWidth: 36,
  },
  dayName: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: "600",
  },
  mealMarker: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
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
    paddingHorizontal: 40,
    paddingBottom: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  addMealButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  addMealButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: FEED_PADDING,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 20,
  },
  feed: {
    gap: 24,
  },
  feedItem: {
    gap: 12,
  },
  photoContainer: {
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    borderRadius: tokens.radius.lg,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  mealPhoto: {
    width: "100%",
    height: "100%",
  },
  mealInfo: {
    gap: 4,
  },
  mealType: {
    fontSize: 16,
    fontWeight: "600",
  },
  mealMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mealTime: {
    fontSize: 14,
  },
  metaDivider: {
    fontSize: 14,
  },
  mealLocation: {
    fontSize: 14,
    flex: 1,
  },
  divider: {
    height: 1,
    marginTop: 12,
  },
  // Modal styles
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  calendarContainer: {
    padding: 16,
    paddingBottom: 32,
    // Fixed minHeight to prevent layout shift when month changes
    // Calendar can show 4-6 weeks; this accommodates 6 weeks + header + day names
    minHeight: 370,
  },
});
