import React, { useEffect, useMemo } from "react";
import { View, ScrollView, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createStyles, useStyles } from "@/shared/ui/theme";
import {
  useEntryDetail,
  EntryDetailHeader,
  AICommentBanner,
  AIAnalysisLoadingBanner,
  AIAnalysisFailedBanner,
  EntryContextBar,
  EntryNotesSection,
  IngredientsSection,
  NutritionSection,
  EntryLocationMap,
  EntryDeleteButton,
} from "@/features/entry-detail";
import { PhotoCarousel } from "@/shared/ui/styled";
import { useIsAuthenticated } from "@/shared/lib/auth";
import { setPendingDeepLink } from "@/shared/lib/deeplink";
import { CAMERA_SETTINGS } from "@/shared/config";

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

  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();

  const isNumericId = !isNaN(Number(id)) && Number(id) > 0;

  const {
    entry,
    isLoading,
    isDeleting,
    isAddingPhotos,
    aiAnalysisStatus,
    retryAiAnalysis,
    updateTimestamp,
    updateMealType,
    updateNotes,
    updateRating,
    updateWouldEatAgain,
    updateIngredients,
    updateNutrition,
    deleteEntry,
    addPhotos,
    shareEntry,
    canShare,
    goBack,
    openPhotoViewer,
  } = useEntryDetail({
    entryId: id,
  });

  useEffect(() => {
    if (isNumericId && !isAuthenticated) {
      setPendingDeepLink(`/diary/${id}`);
      router.replace("/auth");
    }
  }, [isNumericId, isAuthenticated, id, router]);

  // Per-field merge: user-set nutrition takes priority, fallback to AI per field
  const displayNutrition = useMemo(() => {
    const user = entry?.meal.nutrition;
    const ai = entry?.meal.aiAnalysis?.nutrition;

    if (!ai) return user;
    if (!user) return ai;

    return {
      calories: user.calories || ai.calories,
      protein: user.protein || ai.protein,
      fat: user.fat || ai.fat,
      carbs: user.carbs || ai.carbs,
      fiber: user.fiber || ai.fiber,
      sugar: user.sugar || ai.sugar,
      sodium: user.sodium || ai.sodium,
    };
  }, [entry?.meal.nutrition, entry?.meal.aiAnalysis?.nutrition]);

  if (isNumericId && !isAuthenticated) return null;

  const minContentHeight = screenHeight - insets.top - HEADER_HEIGHT;
  const isDisabled = isLoading || !entry;

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <EntryDetailHeader onBackPress={goBack} onSharePress={canShare ? shareEntry : undefined} />

      {/* Scrollable Content */}
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[s.scrollContent, { minHeight: minContentHeight }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {/* Photo Carousel */}
        <PhotoCarousel
          photoUris={entry?.meal.photoUris ?? (entry?.meal.photoUri ? [entry.meal.photoUri] : [])}
          loading={(isLoading && !entry) || isAddingPhotos}
          onPhotoPress={entry?.meal.photoUri ? () => openPhotoViewer() : undefined}
          onAddPhotoPress={
            entry && isAuthenticated && !isNaN(Number(id)) &&
            (entry.meal.photoUris?.length ?? (entry.meal.photoUri ? 1 : 0)) < CAMERA_SETTINGS.MAX_PHOTOS_PER_POST
              ? addPhotos
              : undefined
          }
        />

        {/* AI Analysis Status Banners */}
        {(aiAnalysisStatus === "pending" || aiAnalysisStatus === "processing") && (
          <AIAnalysisLoadingBanner />
        )}
        {aiAnalysisStatus === "failed" && (
          <AIAnalysisFailedBanner onRetry={retryAiAnalysis} />
        )}

        {/* AI Comment Banner */}
        <AICommentBanner comment={entry?.meal.aiAnalysis?.comment} />

        {/* Context Bar */}
        {entry && (
          <EntryContextBar
            mealType={entry.meal.mealType}
            timestamp={entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp)}
            location={entry.location}
            onMealTypeChange={updateMealType}
            onTimestampChange={updateTimestamp}
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

        {/* Ingredients Section */}
        <IngredientsSection
          ingredients={entry?.meal.ingredients ?? entry?.meal.aiAnalysis?.ingredients}
          onIngredientsChange={updateIngredients}
          disabled={isDisabled}
        />

        {/* Nutrition Section */}
        <NutritionSection
          nutrition={displayNutrition}
          onNutritionChange={updateNutrition}
          disabled={isDisabled}
          loading={aiAnalysisStatus === "pending" || aiAnalysisStatus === "processing"}
        />

        {/* Location Map */}
        <EntryLocationMap location={entry?.location} />

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
