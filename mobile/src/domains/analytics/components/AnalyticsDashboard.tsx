import React from "react";
import { ScrollView, TouchableOpacity, View, Text as RNText, StyleSheet } from "react-native";
import { Calendar } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "@/design-system/styled";
import { StatsSuspenseWrapper } from "./StatsSuspenseWrapper";
import { PeriodSelector } from "./PeriodSelector";
import { ProgressRing } from "./ProgressRing";
import { AchievementCard, Achievement } from "./AchievementCard";
import { InsightCard } from "./InsightCard";
import { RecentEntries } from "@/domains/diary";
import { useRouter } from "expo-router";
import { useAnalyticsI18n } from "@/lib/i18n";
import { useAnalyticsDashboard } from "../hooks/useAnalyticsDashboard";
import { useTheme } from "@/design-system/theme";
import { tokens, iconSizes } from "@/design-system/tokens";

// =============================================================================
// TYPES
// =============================================================================

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

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AnalyticsDashboard({ onNavigate }: AnalyticsDashboardProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const analytics = useAnalyticsI18n();

  // Use the extracted hook for calendar/period logic
  const {
    globalPeriod,
    handlePeriodChange,
    showCalendarModal,
    setShowCalendarModal,
    calendarRange,
    handleDayPress,
    clearDateRange,
  } = useAnalyticsDashboard(colors.interactive.primary, colors.text.primary);

  // Mock data - to be replaced with real data hooks
  const mockAchievements: Achievement[] = [
    {
      id: "1",
      title: analytics.proteinMaster,
      description: analytics.proteinMasterDesc,
      emoji: "fire",
      progress: 5,
      target: 7,
      isCompleted: false,
    },
    {
      id: "2",
      title: analytics.veggieWarrior,
      description: analytics.veggieWarriorDesc,
      emoji: "leaf",
      progress: 18,
      target: 25,
      isCompleted: false,
    },
    {
      id: "3",
      title: analytics.consistencyKing,
      description: analytics.consistencyKingDesc,
      emoji: "flame",
      progress: 14,
      target: 30,
      isCompleted: false,
    },
  ];

  const mockStats: DailyStats = {
    calories: { current: 1680, target: 2000 },
    protein: { current: 89, target: 120 },
    carbs: { current: 180, target: 250 },
    fat: { current: 65, target: 80 },
    water: { current: 6, target: 8 },
    fiber: { current: 22, target: 25 },
  };

  const handleSeeAllHistory = () => {
    router.push("/meal-history" as any);
  };

  const nutritionColors = {
    protein: colors.interactive.primary,
    carbs: colors.interactive.secondary,
    fat: colors.status.info,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate("camera")}>
          <Ionicons name="arrow-back" size={iconSizes.md} color={colors.text.primary} />
        </TouchableOpacity>
        <RNText style={[styles.headerTitle, { color: colors.text.primary }]}>
          {analytics.title}
        </RNText>
        <TouchableOpacity onPress={() => onNavigate("settings")}>
          <Ionicons name="settings-outline" size={iconSizes.md} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <PeriodSelector
          currentPeriod={globalPeriod.type}
          onPeriodChange={handlePeriodChange}
          onCalendarPress={() => setShowCalendarModal(true)}
          labels={{
            day: analytics.day,
            week: analytics.week,
            month: analytics.month,
          }}
        />

        {/* Period Summary with Suspense */}
        <StatsSuspenseWrapper onNavigate={onNavigate} />

        {/* Recent Entries */}
        <RecentEntries onSeeAll={handleSeeAllHistory} />

        {/* Nutrition Rings */}
        <View style={styles.nutritionSection}>
          <RNText style={[styles.sectionTitle, { color: colors.text.primary }]}>
            {analytics.macronutrients}
          </RNText>
          <View style={styles.nutritionRings}>
            <ProgressRing
              label={analytics.protein}
              current={mockStats.protein.current}
              target={mockStats.protein.target}
              color={nutritionColors.protein}
              unit="g"
            />
            <ProgressRing
              label={analytics.carbs}
              current={mockStats.carbs.current}
              target={mockStats.carbs.target}
              color={nutritionColors.carbs}
              unit="g"
            />
            <ProgressRing
              label={analytics.fat}
              current={mockStats.fat.current}
              target={mockStats.fat.target}
              color={nutritionColors.fat}
              unit="g"
            />
          </View>
        </View>

        {/* Eating Pattern */}
        <View style={styles.patternSection}>
          <RNText style={[styles.sectionTitle, { color: colors.text.primary }]}>
            {analytics.eatingPattern}
          </RNText>
        </View>

        {/* Meal Character */}
        <View style={styles.characterSection}>
          <View style={[styles.characterCard, { backgroundColor: colors.bg.elevated }]}>
            <RNText style={styles.characterEmoji}>star</RNText>
            <View style={styles.characterInfo}>
              <RNText style={[styles.characterTitle, { color: colors.text.primary }]}>
                {analytics.balancedExplorer}
              </RNText>
              <RNText style={[styles.characterDescription, { color: colors.text.secondary }]}>
                {analytics.balancedExplorerDesc}
              </RNText>
            </View>
            <View style={[styles.characterLevel, { backgroundColor: colors.interactive.primary }]}>
              <RNText style={[styles.levelText, { color: colors.text.inverse }]}>Lv.7</RNText>
            </View>
          </View>

          <View style={[styles.diversityScore, { backgroundColor: colors.bg.elevated }]}>
            <RNText style={[styles.diversityLabel, { color: colors.text.secondary }]}>
              {analytics.mealDiversityScore}
            </RNText>
            <RNText style={[styles.diversityValue, { color: colors.text.primary }]}>82/100</RNText>
            <RNText style={[styles.diversityTip, { color: colors.interactive.secondary }]}>
              {analytics.diversityTip}
            </RNText>
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.achievementsSection}>
          <RNText style={[styles.sectionTitle, { color: colors.text.primary }]}>
            {analytics.achievements}
          </RNText>
          {mockAchievements.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </View>

        {/* Weekly Insights */}
        <View style={styles.insightsSection}>
          <RNText style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Weekly Insights
          </RNText>
          <InsightCard
            icon="trending-up"
            iconColor={colors.interactive.secondary}
            title="Protein intake improved"
            description="You hit your protein goal 5 out of 7 days this week!"
          />
          <InsightCard
            icon="restaurant"
            iconColor={colors.interactive.primary}
            title="New favorite: Mediterranean"
            description="You've logged 4 Mediterranean meals this week."
          />
        </View>
      </ScrollView>

      {/* Calendar Modal */}
      <BottomSheet
        visible={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        height="80%"
      >
        <View style={[styles.modalHeader, { borderBottomColor: colors.border.default }]}>
          <RNText style={[styles.calendarModalTitle, { color: colors.text.primary }]}>
            Select Period
          </RNText>
          <TouchableOpacity onPress={() => setShowCalendarModal(false)}>
            <Ionicons name="close" size={iconSizes.md} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Quick Presets */}
        <View style={[styles.presetsContainer, { borderBottomColor: colors.border.default }]}>
          <RNText style={[styles.presetsTitle, { color: colors.text.primary }]}>Quick Select</RNText>
          <View style={styles.presetsGrid}>
            {(["day", "week", "month"] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[styles.presetButton, { backgroundColor: colors.bg.secondary }]}
                onPress={() => {
                  handlePeriodChange(period);
                  setShowCalendarModal(false);
                }}
              >
                <RNText style={[styles.presetButtonText, { color: colors.text.secondary }]}>
                  {period === "day" ? "Today" : period === "week" ? "This Week" : "This Month"}
                </RNText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            onDayPress={handleDayPress}
            markingType="period"
            markedDates={calendarRange.markedDates}
            theme={{
              backgroundColor: colors.bg.elevated,
              calendarBackground: colors.bg.elevated,
              textSectionTitleColor: colors.text.primary,
              selectedDayBackgroundColor: colors.interactive.primary,
              selectedDayTextColor: "white",
              todayTextColor: colors.interactive.primary,
              dayTextColor: colors.text.primary,
              textDisabledColor: colors.text.secondary,
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

          <TouchableOpacity
            style={[
              styles.clearCustomButton,
              { opacity: calendarRange.startDate || calendarRange.endDate ? 1 : 0 },
            ]}
            onPress={clearDateRange}
            disabled={!(calendarRange.startDate || calendarRange.endDate)}
          >
            <Ionicons name="trash-outline" size={iconSizes.xs} color={colors.text.secondary} />
            <RNText style={[styles.clearCustomButtonText, { color: colors.interactive.primary }]}>
              Clear Selection
            </RNText>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: tokens.spacing.layout.sm,
    paddingBottom: tokens.spacing.component.lg,
  },
  headerTitle: {
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  content: {
    flex: 1,
    paddingHorizontal: tokens.spacing.component.lg,
  },
  sectionTitle: {
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.semibold,
    marginBottom: tokens.spacing.component.lg,
  },
  nutritionSection: {
    marginBottom: tokens.spacing.layout.md,
  },
  nutritionRings: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: tokens.spacing.component.sm,
  },
  patternSection: {
    marginBottom: tokens.spacing.layout.md,
  },
  characterSection: {
    marginBottom: tokens.spacing.layout.md,
  },
  characterCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.component.lg,
    marginBottom: tokens.spacing.component.md,
  },
  characterEmoji: {
    fontSize: 40,
    marginRight: tokens.spacing.component.lg,
  },
  characterInfo: {
    flex: 1,
  },
  characterTitle: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
    marginBottom: tokens.spacing.component.xs,
  },
  characterDescription: {
    fontSize: tokens.typography.fontSize.bodySmall,
  },
  characterLevel: {
    paddingHorizontal: tokens.spacing.component.md,
    paddingVertical: tokens.spacing.component.sm,
    borderRadius: tokens.radius.lg,
  },
  levelText: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  diversityScore: {
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.component.lg,
  },
  diversityLabel: {
    fontSize: tokens.typography.fontSize.bodySmall,
    marginBottom: tokens.spacing.component.xs,
  },
  diversityValue: {
    fontSize: tokens.typography.fontSize.h2,
    fontWeight: tokens.typography.fontWeight.bold,
    marginBottom: tokens.spacing.component.sm,
  },
  diversityTip: {
    fontSize: tokens.typography.fontSize.caption,
    fontStyle: "italic",
  },
  achievementsSection: {
    marginBottom: tokens.spacing.layout.md,
  },
  insightsSection: {
    marginBottom: tokens.spacing.layout.md,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.layout.sm,
    paddingVertical: tokens.spacing.component.lg,
    borderBottomWidth: tokens.borderWidth.default,
  },
  calendarModalTitle: {
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  presetsContainer: {
    padding: tokens.spacing.layout.sm,
    borderBottomWidth: tokens.borderWidth.default,
  },
  presetsTitle: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
    marginBottom: tokens.spacing.component.lg,
  },
  presetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.component.md,
  },
  presetButton: {
    paddingHorizontal: tokens.spacing.component.lg,
    paddingVertical: tokens.spacing.component.md,
    borderRadius: tokens.radius.sm,
    minWidth: 80,
  },
  presetButtonText: {
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.medium,
    textAlign: "center",
  },
  calendarContainer: {
    padding: tokens.spacing.layout.sm,
    minHeight: 370,
  },
  clearCustomButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: tokens.spacing.layout.sm,
    paddingVertical: tokens.spacing.component.md,
    gap: tokens.spacing.component.sm,
    minHeight: 44,
  },
  clearCustomButtonText: {
    fontSize: tokens.typography.fontSize.bodySmall,
  },
});
