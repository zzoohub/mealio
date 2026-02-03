import React from "react";
import { View, ScrollView, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createStyles, useStyles } from "@/shared/ui/theme";
import {
  useEntryDetail,
  EntryDetailHeader,
  MealHeroImage,
  AICommentBanner,
  EntryContextBar,
  EntryNotesSection,
  AIAnalysisSection,
  EntryDeleteButton,
} from "@/features/entry-detail";

// =============================================================================
// CONSTANTS
// =============================================================================

const HEADER_HEIGHT = 56;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function DiaryEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStyles(styles);
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  const {
    entry,
    isLoading,
    isDeleting,
    updateMealType,
    updateNotes,
    updateRating,
    updateWouldEatAgain,
    updateIngredients,
    updateNutrition,
    deleteEntry,
    goBack,
    openPhotoViewer,
  } = useEntryDetail({
    entryId: id,
  });

  const minContentHeight = screenHeight - insets.top - HEADER_HEIGHT;
  const isDisabled = isLoading || !entry;

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <EntryDetailHeader onBackPress={goBack} />

      {/* Scrollable Content */}
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[s.scrollContent, { minHeight: minContentHeight }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Image */}
        <MealHeroImage
          photoUri={entry?.meal.photoUri}
          loading={isLoading && !entry}
          onPress={entry?.meal.photoUri ? openPhotoViewer : undefined}
        />

        {/* AI Comment Banner */}
        <AICommentBanner comment={entry?.meal.aiAnalysis?.comment} />

        {/* Context Bar */}
        {entry && (
          <EntryContextBar
            mealType={entry.meal.mealType}
            timestamp={entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp)}
            location={entry.location}
            onMealTypeChange={updateMealType}
            disabled={isDisabled}
          />
        )}

        {/* Notes Section */}
        <EntryNotesSection
          notes={entry?.notes}
          rating={entry?.rating}
          wouldEatAgain={entry?.wouldEatAgain}
          onNotesChange={updateNotes}
          onRatingChange={updateRating}
          onWouldEatAgainChange={updateWouldEatAgain}
          disabled={isDisabled}
        />

        {/* AI Analysis Section */}
        <AIAnalysisSection
          ingredients={entry?.meal.ingredients ?? entry?.meal.aiAnalysis?.ingredients}
          nutrition={entry?.meal.nutrition ?? entry?.meal.aiAnalysis?.nutrition}
          onIngredientsChange={updateIngredients}
          onNutritionChange={updateNutrition}
          disabled={isDisabled}
        />

        {/* Spacer */}
        <View style={s.spacer} />

        {/* Delete Button */}
        <EntryDeleteButton onPress={deleteEntry} loading={isDeleting} disabled={isDisabled} />
      </ScrollView>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  spacer: {
    flex: 1,
  },
}));
