import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Calendar } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import { CircularProgress } from "@/components/CircularProgress";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { StatsSuspenseWrapper } from "./StatsSuspenseWrapper";
import { RecentMeals } from "@/domains/diary";
import { useRouter } from "expo-router";
import { useAnalyticsI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAnalyticsStore, TimePeriod } from "../stores/analyticsStore";

interface AnalyticsDashboardProps {
  onNavigate: (section: string) => void;
  isActive: boolean;
}

interface DailyStats {
  calories: { current: number; target: number };
  protein: { current: number; target: number };
  carbs: { current: number; target: number };
  fat: { current: number; target: number };
  water: { current: number; target: number };
  fiber: { current: number; target: number };
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  progress: number;
  target: number;
  isCompleted: boolean;
}

const mockStats: DailyStats = {
  calories: { current: 1680, target: 2000 },
  protein: { current: 89, target: 120 },
  carbs: { current: 180, target: 250 },
  fat: { current: 65, target: 80 },
  water: { current: 6, target: 8 },
  fiber: { current: 22, target: 25 },
};

export default function AnalyticsDashboard({ onNavigate }: AnalyticsDashboardProps) {
  const { theme } = useTheme();
  const { globalPeriod, setGlobalPeriod, getPeriodLabel } = useAnalyticsStore();
  const router = useRouter();
  const analytics = useAnalyticsI18n();

  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [markedDates, setMarkedDates] = useState<{ [key: string]: any }>({});

  // Calendar range state for date selection
  const [calendarRange, setCalendarRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
    markedDates: any;
  }>({
    startDate: null,
    endDate: null,
    markedDates: {},
  });

  // Update calendar marked dates when period changes
  useEffect(() => {
    updateMarkedDates();
  }, [globalPeriod]);

  const updateMarkedDates = () => {
    const marked: { [key: string]: any } = {};

    if (globalPeriod.type === "custom" && globalPeriod.startDate && globalPeriod.endDate) {
      const start = new Date(globalPeriod.startDate);
      const end = new Date(globalPeriod.endDate);

      // Mark the start date
      const startDateString = start.toISOString().split("T")[0];
      if (startDateString) {
        marked[startDateString] = {
          startingDay: true,
          color: "#FF6B35",
          textColor: "white",
        };
      }

      // Mark the end date
      const endDateString = end.toISOString().split("T")[0];
      if (endDateString) {
        marked[endDateString] = {
          endingDay: true,
          color: "#FF6B35",
          textColor: "white",
        };
      }

      // Mark dates in between
      const currentDate = new Date(start);
      currentDate.setDate(currentDate.getDate() + 1);

      while (currentDate < end) {
        const dateString = currentDate.toISOString().split("T")[0];
        if (dateString) {
          marked[dateString] = {
            color: "#FF6B35",
            textColor: "white",
          };
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    setMarkedDates(marked);
  };

  const updateCalendarRange = (start: Date | null, end: Date | null) => {
    const markedDates: any = {};

    if (start && !end) {
      const dateString = start.toISOString().split("T")[0];
      if (dateString) {
        markedDates[dateString] = {
          startingDay: true,
          color: theme.colors.primary,
          textColor: "white",
        };
      }
    } else if (start && end) {
      const startString = start.toISOString().split("T")[0];
      const endString = end.toISOString().split("T")[0];

      if (startString && endString && startString === endString) {
        markedDates[startString] = {
          startingDay: true,
          endingDay: true,
          color: theme.colors.primary,
          textColor: "white",
        };
      } else if (startString && endString) {
        markedDates[startString] = {
          startingDay: true,
          color: theme.colors.primary,
          textColor: "white",
        };
        markedDates[endString] = {
          endingDay: true,
          color: theme.colors.primary,
          textColor: "white",
        };

        // Mark days in between
        const currentDate = new Date(start);
        currentDate.setDate(currentDate.getDate() + 1);

        while (currentDate < end) {
          const dateString = currentDate.toISOString().split("T")[0];
          if (dateString) {
            markedDates[dateString] = {
              color: theme.colors.primary + "40",
              textColor: theme.colors.text,
            };
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    }

    setCalendarRange({ startDate: start, endDate: end, markedDates });

    // Update global period if we have both dates
    if (start && end) {
      setGlobalPeriod({
        type: "custom",
        startDate: start,
        endDate: end,
      });
    }
  };

  const clearDateRange = () => {
    setCalendarRange({ startDate: null, endDate: null, markedDates: {} });
    setGlobalPeriod({ type: "day" });
  };

  const handlePeriodChange = (newPeriod: "day" | "week" | "month") => {
    setGlobalPeriod({ type: newPeriod });
  };

  // Date selection functions
  const handleDayPress = (day: any) => {
    const selectedDate = new Date(day.dateString);
    const { startDate, endDate } = calendarRange;

    if (!startDate || (startDate && endDate)) {
      updateCalendarRange(selectedDate, null);
    } else if (startDate && !endDate) {
      if (selectedDate >= startDate) {
        updateCalendarRange(startDate, selectedDate);
        // The updateCalendarRange already handles this
      } else {
        updateCalendarRange(selectedDate, null);
      }
    }
  };

  const mockAchievements: Achievement[] = [
    {
      id: "1",
      title: analytics.proteinMaster,
      description: analytics.proteinMasterDesc,
      emoji: "💪",
      progress: 5,
      target: 7,
      isCompleted: false,
    },
    {
      id: "2",
      title: analytics.veggieWarrior,
      description: analytics.veggieWarriorDesc,
      emoji: "🥗",
      progress: 18,
      target: 25,
      isCompleted: false,
    },
    {
      id: "3",
      title: analytics.consistencyKing,
      description: analytics.consistencyKingDesc,
      emoji: "🔥",
      progress: 14,
      target: 30,
      isCompleted: false,
    },
  ];

  const handleSeeAllHistory = () => {
    router.push("/meal-history");
  };

  const renderProgressRing = (label: string, current: number, target: number, color: string, unit: string) => {
    const percentage = Math.min((current / target) * 100, 100);

    return (
      <View style={styles.progressRingContainer}>
        <CircularProgress
          size={80}
          strokeWidth={6}
          progress={percentage}
          color={color}
          backgroundColor={theme.colors.border}
        >
          <View style={styles.progressContent}>
            <Text style={[styles.progressValue, { color: theme.colors.text }]}>{current}</Text>
            <Text style={[styles.progressUnit, { color: theme.colors.textSecondary }]}>{unit}</Text>
          </View>
        </CircularProgress>
        <Text style={[styles.progressLabel, { color: theme.colors.text }]}>{label}</Text>
        <Text style={[styles.progressTarget, { color: theme.colors.textSecondary }]}>
          {current}/{target} {unit}
        </Text>
      </View>
    );
  };

  const renderAchievement = (achievement: Achievement) => (
    <TouchableOpacity key={achievement.id} style={[styles.achievementCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.achievementHeader}>
        <Text style={styles.achievementEmoji}>{achievement.emoji}</Text>
        <View style={styles.achievementInfo}>
          <Text style={[styles.achievementTitle, { color: theme.colors.text }]}>{achievement.title}</Text>
          <Text style={[styles.achievementDescription, { color: theme.colors.textSecondary }]}>
            {achievement.description}
          </Text>
        </View>
        <View style={styles.achievementProgress}>
          <Text style={[styles.achievementProgressText, { color: theme.colors.primary }]}>
            {achievement.progress}/{achievement.target}
          </Text>
        </View>
      </View>
      <View style={[styles.achievementBar, { backgroundColor: theme.colors.border + "40" }]}>
        <View
          style={[
            styles.achievementBarFill,
            { width: `${(achievement.progress / achievement.target) * 100}%`, backgroundColor: theme.colors.primary },
          ]}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate("camera")}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{analytics.title}</Text>

        <TouchableOpacity onPress={() => onNavigate("settings")}>
          <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={[styles.periodSelector, { backgroundColor: theme.colors.surface }]}>
          {/* Period Buttons Row */}
          <View style={styles.periodButtonsRow}>
            {(["day", "week", "month"] as const).map(period => (
              <TouchableOpacity
                key={period}
                style={[styles.periodButton, globalPeriod.type === period && { backgroundColor: theme.colors.primary }]}
                onPress={() => handlePeriodChange(period)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    { color: theme.colors.textSecondary },
                    globalPeriod.type === period && { color: "white" },
                  ]}
                >
                  {analytics[period]}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.periodButton,
                styles.calendarButton,
                globalPeriod.type === "custom" && { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setShowCalendarModal(true)}
            >
              <Ionicons
                name="calendar"
                size={16}
                color={globalPeriod.type === "custom" ? "white" : theme.colors.textSecondary}
              />
              {globalPeriod.type === "custom" && (
                <Text style={[styles.periodButtonText, { color: "white", fontSize: 12 }]}>Custom</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Period Summary with Suspense */}
        <StatsSuspenseWrapper onNavigate={onNavigate} />

        {/* Recent Meals */}
        <RecentMeals onSeeAll={handleSeeAllHistory} />

        {/* Nutrition Rings */}
        <View style={styles.nutritionSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{analytics.macronutrients}</Text>
          <View style={styles.nutritionRings}>
            {renderProgressRing(analytics.protein, mockStats.protein.current, mockStats.protein.target, "#FF6B35", "g")}
            {renderProgressRing(analytics.carbs, mockStats.carbs.current, mockStats.carbs.target, "#4ECDC4", "g")}
            {renderProgressRing(analytics.fat, mockStats.fat.current, mockStats.fat.target, "#45B7D1", "g")}
          </View>
        </View>

        {/* Eating Pattern */}
        <View style={styles.patternSection}>
          <View style={styles.sectionHeader}>
            <Text style={{ ...styles.sectionTitle, marginBottom: 4, color: theme.colors.text }}>
              {analytics.eatingPattern}
            </Text>
            {/* <TouchableOpacity>
              <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>{analytics.seeAll}</Text>
            </TouchableOpacity> */}
          </View>
        </View>

        {/* Meal Character */}
        <View style={styles.characterSection}>
          <View style={[styles.characterCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={styles.characterEmoji}>🌟</Text>
            <View style={styles.characterInfo}>
              <Text style={[styles.characterTitle, { color: theme.colors.text }]}>{analytics.balancedExplorer}</Text>
              <Text style={[styles.characterDescription, { color: theme.colors.textSecondary }]}>
                {analytics.balancedExplorerDesc}
              </Text>
            </View>
            <View style={[styles.characterLevel, { backgroundColor: theme.colors.primary }]}>
              <Text style={[styles.levelText, { color: theme.colors.text }]}>Lv.7</Text>
            </View>
          </View>

          <View style={[styles.diversityScore, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.diversityLabel, { color: theme.colors.textSecondary }]}>
              {analytics.mealDiversityScore}
            </Text>
            <Text style={[styles.diversityValue, { color: theme.colors.text }]}>82/100</Text>
            <Text style={[styles.diversityTip, { color: theme.colors.secondary }]}>{analytics.diversityTip}</Text>
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.achievementsSection}>
          <View style={styles.sectionHeader}>
            <Text style={{ ...styles.sectionTitle, marginBottom: 4, color: theme.colors.text }}>
              {analytics.achievements}
            </Text>
            {/* <TouchableOpacity>
              <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>{analytics.viewAll}</Text>
            </TouchableOpacity> */}
          </View>

          {mockAchievements.map(renderAchievement)}
        </View>

        {/* Weekly Insights */}
        <View style={styles.insightsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Weekly Insights</Text>

          <View style={[styles.insightCard, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="trending-up" size={24} color={theme.colors.secondary} />
            <View style={styles.insightContent}>
              <Text style={[styles.insightTitle, { color: theme.colors.text }]}>Protein intake improved</Text>
              <Text style={[styles.insightDescription, { color: theme.colors.textSecondary }]}>
                You hit your protein goal 5 out of 7 days this week!
              </Text>
            </View>
          </View>

          <View style={[styles.insightCard, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="restaurant" size={24} color={theme.colors.primary} />
            <View style={styles.insightContent}>
              <Text style={[styles.insightTitle, { color: theme.colors.text }]}>New favorite: Mediterranean</Text>
              <Text style={[styles.insightDescription, { color: theme.colors.textSecondary }]}>
                You&apos;ve logged 4 Mediterranean meals this week.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Calendar Modal using BottomSheet */}
      <BottomSheet
        visible={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        backgroundColor={theme.colors.background}
        height="80%"
      >
        <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.calendarModalTitle, { color: theme.colors.text }]}>Select Period</Text>
          <TouchableOpacity onPress={() => setShowCalendarModal(false)}>
            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Quick Presets */}
        <View style={[styles.presetsContainer, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.presetsTitle, { color: theme.colors.text }]}>Quick Select</Text>
          <View style={styles.presetsGrid}>
            <TouchableOpacity
              style={[styles.presetButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => {
                handlePeriodChange("day");
                setShowCalendarModal(false);
              }}
            >
              <Text style={[styles.presetButtonText, { color: theme.colors.textSecondary }]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => {
                handlePeriodChange("week");
                setShowCalendarModal(false);
              }}
            >
              <Text style={[styles.presetButtonText, { color: theme.colors.textSecondary }]}>This Week</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => {
                handlePeriodChange("month");
                setShowCalendarModal(false);
              }}
            >
              <Text style={[styles.presetButtonText, { color: theme.colors.textSecondary }]}>This Month</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            onDayPress={handleDayPress}
            markingType={"period"}
            markedDates={calendarRange.markedDates}
            theme={{
              backgroundColor: theme.colors.surface,
              calendarBackground: theme.colors.surface,
              textSectionTitleColor: theme.colors.text,
              selectedDayBackgroundColor: theme.colors.primary,
              selectedDayTextColor: "white",
              todayTextColor: theme.colors.primary,
              dayTextColor: theme.colors.text,
              textDisabledColor: theme.colors.textSecondary,
              dotColor: theme.colors.primary,
              selectedDotColor: "white",
              arrowColor: theme.colors.primary,
              disabledArrowColor: theme.colors.textSecondary,
              monthTextColor: theme.colors.text,
              indicatorColor: "#FF6B35",
              textDayFontWeight: "400",
              textMonthFontWeight: "600",
              textDayHeaderFontWeight: "500",
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
            }}
          />

          {(calendarRange.startDate || calendarRange.endDate) && (
            <TouchableOpacity style={styles.clearCustomButton} onPress={() => clearDateRange()}>
              <Ionicons name="trash-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.clearCustomButtonText, { color: theme.colors.primary }]}>Clear Selection</Text>
            </TouchableOpacity>
          )}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  periodSelector: {
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  periodButtonsRow: {
    flexDirection: "row",
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  periodButtonActive: {
    // backgroundColor handled inline with theme
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  periodButtonTextActive: {
    // color handled inline with theme
  },
  calendarButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  // Modal styles
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  calendarModalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  presetsContainer: {
    padding: 20,
    borderBottomWidth: 1,
  },
  presetsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  presetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  calendarContainer: {
    padding: 20,
  },
  clearCustomButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingVertical: 12,
    gap: 8,
  },
  clearCustomButtonText: {
    fontSize: 14,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  summaryDate: {
    fontSize: 14,
  },
  calorieOverview: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  calorieMain: {
    alignItems: "flex-start",
  },
  calorieValue: {
    fontSize: 32,
    fontWeight: "bold",
  },
  calorieLabel: {
    fontSize: 14,
  },
  calorieRemaining: {
    alignItems: "flex-end",
  },
  remainingValue: {
    fontSize: 24,
    fontWeight: "600",
  },
  remainingLabel: {
    fontSize: 14,
  },
  calorieBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  calorieBarFill: {
    height: "100%",
  },
  nutritionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  nutritionRings: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  progressRingContainer: {
    alignItems: "center",
    flex: 1,
  },
  progressContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  progressValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  progressUnit: {
    fontSize: 10,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 8,
  },
  progressTarget: {
    fontSize: 10,
    marginTop: 2,
  },
  patternSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
  heatmapContainer: {
    height: 180,
    borderRadius: 12,
    padding: 16,
    paddingBottom: 20,
  },
  characterSection: {
    marginBottom: 24,
  },
  characterCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  characterEmoji: {
    fontSize: 40,
    marginRight: 16,
  },
  characterInfo: {
    flex: 1,
  },
  characterTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  characterDescription: {
    fontSize: 14,
  },
  characterLevel: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 12,
    fontWeight: "600",
  },
  diversityScore: {
    borderRadius: 12,
    padding: 16,
  },
  diversityLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  diversityValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  diversityTip: {
    fontSize: 12,
    fontStyle: "italic",
  },
  achievementsSection: {
    marginBottom: 24,
  },
  achievementCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  achievementHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  achievementEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 12,
  },
  achievementProgress: {
    alignItems: "flex-end",
  },
  achievementProgressText: {
    fontSize: 14,
    fontWeight: "600",
  },
  achievementBar: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  achievementBarFill: {
    height: "100%",
  },
  insightsSection: {
    marginBottom: 24,
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  insightContent: {
    flex: 1,
    marginLeft: 16,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
  },
});
