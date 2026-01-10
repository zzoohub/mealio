import { useState, useEffect } from "react";
import { ScrollView, TouchableOpacity, View, Text as RNText, StyleSheet } from "react-native";
import { Calendar } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import { CircularProgress } from "./CircularProgress";
import { BottomSheet } from "@/design-system/styled";
import { StatsSuspenseWrapper } from "./StatsSuspenseWrapper";
import { RecentMeals } from "@/domains/diary";
import { useRouter } from "expo-router";
import { useAnalyticsI18n } from "@/lib/i18n";
import { useAnalyticsStore } from "../stores/analyticsStore";
import { createStyles, useStyles, useTheme } from "@/design-system/theme";
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

interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  progress: number;
  target: number;
  isCompleted: boolean;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface PeriodButtonProps {
  period: "day" | "week" | "month";
  isActive: boolean;
  onPress: () => void;
  label: string;
}

function PeriodButton({ period, isActive, onPress, label }: PeriodButtonProps) {
  const s = useStyles(periodButtonStyles);

  return (
    <TouchableOpacity
      style={[
        styles.periodButton,
        isActive ? s.active : s.inactive,
      ]}
      onPress={onPress}
    >
      <RNText
        style={[
          styles.periodButtonText,
          isActive ? s.activeText : s.inactiveText,
        ]}
      >
        {label}
      </RNText>
    </TouchableOpacity>
  );
}

interface ProgressRingProps {
  label: string;
  current: number;
  target: number;
  color: string;
  unit: string;
}

function ProgressRing({ label, current, target, color, unit }: ProgressRingProps) {
  const s = useStyles(progressRingStyles);
  const percentage = Math.min((current / target) * 100, 100);

  return (
    <View style={styles.progressRingContainer}>
      <CircularProgress size={80} strokeWidth={6} progress={percentage} color={color}>
        <View style={styles.progressContent}>
          <RNText style={[styles.progressValue, s.value]}>{current}</RNText>
          <RNText style={[styles.progressUnit, s.unit]}>{unit}</RNText>
        </View>
      </CircularProgress>
      <RNText style={[styles.progressLabel, s.label]}>{label}</RNText>
      <RNText style={[styles.progressTarget, s.target]}>
        {current}/{target} {unit}
      </RNText>
    </View>
  );
}

interface AchievementCardProps {
  achievement: Achievement;
}

function AchievementCard({ achievement }: AchievementCardProps) {
  const s = useStyles(achievementCardStyles);
  const progressWidth = `${(achievement.progress / achievement.target) * 100}%`;

  return (
    <TouchableOpacity style={[styles.achievementCard, s.card]}>
      <View style={styles.achievementHeader}>
        <RNText style={styles.achievementEmoji}>{achievement.emoji}</RNText>
        <View style={styles.achievementInfo}>
          <RNText style={[styles.achievementTitle, s.title]}>
            {achievement.title}
          </RNText>
          <RNText style={[styles.achievementDescription, s.description]}>
            {achievement.description}
          </RNText>
        </View>
        <View style={styles.achievementProgress}>
          <RNText style={[styles.achievementProgressText, s.progressText]}>
            {achievement.progress}/{achievement.target}
          </RNText>
        </View>
      </View>
      <View style={[styles.achievementBar, s.bar]}>
        <View
          style={[
            styles.achievementBarFill,
            s.barFill,
            { width: progressWidth as any },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

interface InsightCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
}

function InsightCard({ icon, iconColor, title, description }: InsightCardProps) {
  const s = useStyles(insightCardStyles);

  return (
    <View style={[styles.insightCard, s.card]}>
      <Ionicons name={icon} size={iconSizes.md} color={iconColor} />
      <View style={styles.insightContent}>
        <RNText style={[styles.insightTitle, s.title]}>{title}</RNText>
        <RNText style={[styles.insightDescription, s.description]}>
          {description}
        </RNText>
      </View>
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AnalyticsDashboard({ onNavigate }: AnalyticsDashboardProps) {
  const { colors } = useTheme();
  const { globalPeriod, setGlobalPeriod } = useAnalyticsStore();
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

      const startDateString = start.toISOString().split("T")[0];
      if (startDateString) {
        marked[startDateString] = {
          startingDay: true,
          color: colors.interactive.primary,
          textColor: "white",
        };
      }

      const endDateString = end.toISOString().split("T")[0];
      if (endDateString) {
        marked[endDateString] = {
          endingDay: true,
          color: colors.interactive.primary,
          textColor: "white",
        };
      }

      const currentDate = new Date(start);
      currentDate.setDate(currentDate.getDate() + 1);

      while (currentDate < end) {
        const dateString = currentDate.toISOString().split("T")[0];
        if (dateString) {
          marked[dateString] = {
            color: colors.interactive.primary,
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
          color: colors.interactive.primary,
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
          color: colors.interactive.primary,
          textColor: "white",
        };
      } else if (startString && endString) {
        markedDates[startString] = {
          startingDay: true,
          color: colors.interactive.primary,
          textColor: "white",
        };
        markedDates[endString] = {
          endingDay: true,
          color: colors.interactive.primary,
          textColor: "white",
        };

        const currentDate = new Date(start);
        currentDate.setDate(currentDate.getDate() + 1);

        while (currentDate < end) {
          const dateString = currentDate.toISOString().split("T")[0];
          if (dateString) {
            markedDates[dateString] = {
              color: colors.interactive.primary + "40",
              textColor: colors.text.primary,
            };
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    }

    setCalendarRange({ startDate: start, endDate: end, markedDates });

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

  const handleDayPress = (day: any) => {
    const selectedDate = new Date(day.dateString);
    const { startDate, endDate } = calendarRange;

    if (!startDate || (startDate && endDate)) {
      updateCalendarRange(selectedDate, null);
    } else if (startDate && !endDate) {
      if (selectedDate >= startDate) {
        updateCalendarRange(startDate, selectedDate);
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

  // Mock stats - to be replaced with props/hooks
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

  // Nutrition colors from design tokens
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
        <View style={[styles.periodSelector, { backgroundColor: colors.bg.elevated }]}>
          <View style={styles.periodButtonsRow}>
            {(["day", "week", "month"] as const).map(period => (
              <PeriodButton
                key={period}
                period={period}
                isActive={globalPeriod.type === period}
                onPress={() => handlePeriodChange(period)}
                label={analytics[period]}
              />
            ))}
            <TouchableOpacity
              style={[
                styles.calendarButton,
                globalPeriod.type === "custom" && {
                  backgroundColor: colors.interactive.primary,
                },
              ]}
              onPress={() => setShowCalendarModal(true)}
            >
              <Ionicons
                name="calendar"
                size={iconSizes.xs}
                color={globalPeriod.type === "custom" ? "white" : colors.text.secondary}
              />
              {globalPeriod.type === "custom" && (
                <RNText style={[styles.calendarButtonText, { color: "white" }]}>Custom</RNText>
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
            <RNText style={styles.characterEmoji}>🌟</RNText>
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
          {mockAchievements.map(achievement => (
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

      {/* Calendar Modal using BottomSheet */}
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
            <TouchableOpacity
              style={[styles.presetButton, { backgroundColor: colors.bg.secondary }]}
              onPress={() => {
                handlePeriodChange("day");
                setShowCalendarModal(false);
              }}
            >
              <RNText style={[styles.presetButtonText, { color: colors.text.secondary }]}>
                Today
              </RNText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetButton, { backgroundColor: colors.bg.secondary }]}
              onPress={() => {
                handlePeriodChange("week");
                setShowCalendarModal(false);
              }}
            >
              <RNText style={[styles.presetButtonText, { color: colors.text.secondary }]}>
                This Week
              </RNText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetButton, { backgroundColor: colors.bg.secondary }]}
              onPress={() => {
                handlePeriodChange("month");
                setShowCalendarModal(false);
              }}
            >
              <RNText style={[styles.presetButtonText, { color: colors.text.secondary }]}>
                This Month
              </RNText>
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
              textDayFontWeight: tokens.typography.fontWeight.normal,
              textMonthFontWeight: tokens.typography.fontWeight.semibold,
              textDayHeaderFontWeight: tokens.typography.fontWeight.medium,
              textDayFontSize: tokens.typography.fontSize.body,
              textMonthFontSize: tokens.typography.fontSize.h4,
              textDayHeaderFontSize: tokens.typography.fontSize.bodySmall,
            }}
          />

          {/* Always render the button container to prevent layout shift, control visibility with opacity */}
          <TouchableOpacity
            style={[
              styles.clearCustomButton,
              { opacity: (calendarRange.startDate || calendarRange.endDate) ? 1 : 0 }
            ]}
            onPress={() => clearDateRange()}
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
// STATIC STYLES (non-themed)
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
  periodSelector: {
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.component.xs,
    marginBottom: tokens.spacing.layout.sm,
  },
  periodButtonsRow: {
    flexDirection: "row",
  },
  periodButton: {
    flex: 1,
    paddingVertical: tokens.spacing.component.sm,
    alignItems: "center",
    borderRadius: tokens.radius.sm,
  },
  periodButtonText: {
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  calendarButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.component.xs,
    flex: 1,
    paddingVertical: tokens.spacing.component.sm,
    borderRadius: tokens.radius.sm,
  },
  calendarButtonText: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.medium,
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
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.bold,
  },
  progressUnit: {
    fontSize: tokens.typography.fontSize.caption,
  },
  progressLabel: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.medium,
    marginTop: tokens.spacing.component.sm,
  },
  progressTarget: {
    fontSize: tokens.typography.fontSize.caption,
    marginTop: tokens.spacing.component.xs,
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
  achievementCard: {
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.component.lg,
    marginBottom: tokens.spacing.component.md,
  },
  achievementHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: tokens.spacing.component.md,
  },
  achievementEmoji: {
    fontSize: 24,
    marginRight: tokens.spacing.component.md,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
    marginBottom: tokens.spacing.component.xs,
  },
  achievementDescription: {
    fontSize: tokens.typography.fontSize.caption,
  },
  achievementProgress: {
    alignItems: "flex-end",
  },
  achievementProgressText: {
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  achievementBar: {
    height: 4,
    borderRadius: tokens.radius.sm,
    overflow: "hidden",
  },
  achievementBarFill: {
    height: "100%",
  },
  insightsSection: {
    marginBottom: tokens.spacing.layout.md,
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.component.lg,
    marginBottom: tokens.spacing.component.md,
  },
  insightContent: {
    flex: 1,
    marginLeft: tokens.spacing.component.lg,
  },
  insightTitle: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
    marginBottom: tokens.spacing.component.xs,
  },
  insightDescription: {
    fontSize: tokens.typography.fontSize.bodySmall,
  },
  // Modal styles
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
  },
  clearCustomButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: tokens.spacing.layout.sm,
    paddingVertical: tokens.spacing.component.md,
    gap: tokens.spacing.component.sm,
    minHeight: 44, // Reserve space even when hidden to prevent layout shift
  },
  clearCustomButtonText: {
    fontSize: tokens.typography.fontSize.bodySmall,
  },
});

// =============================================================================
// THEMED STYLES
// =============================================================================

const periodButtonStyles = createStyles((colors) => ({
  active: {
    backgroundColor: colors.interactive.primary,
  },
  inactive: {
    backgroundColor: "transparent" as const,
  },
  activeText: {
    color: colors.text.inverse,
  },
  inactiveText: {
    color: colors.text.secondary,
  },
}));

const progressRingStyles = createStyles((colors) => ({
  value: {
    color: colors.text.primary,
  },
  unit: {
    color: colors.text.secondary,
  },
  label: {
    color: colors.text.primary,
  },
  target: {
    color: colors.text.secondary,
  },
}));

const achievementCardStyles = createStyles((colors) => ({
  card: {
    backgroundColor: colors.bg.elevated,
  },
  title: {
    color: colors.text.primary,
  },
  description: {
    color: colors.text.secondary,
  },
  progressText: {
    color: colors.interactive.primary,
  },
  bar: {
    backgroundColor: colors.border.subtle,
  },
  barFill: {
    backgroundColor: colors.interactive.primary,
  },
}));

const insightCardStyles = createStyles((colors) => ({
  card: {
    backgroundColor: colors.bg.elevated,
  },
  title: {
    color: colors.text.primary,
  },
  description: {
    color: colors.text.secondary,
  },
}));
