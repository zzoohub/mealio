import React from "react";
import { View, ScrollView, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createStyles, useStyles } from "@/shared/ui/design-system/theme";
import type { Entry } from "@/entities/entry";
import { MealType } from "@/entities/meal";
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

// Mock data for UI testing (remove when real data is available)
const MOCK_ENTRY: Entry = {
  id: "mock_entry_1",
  userId: "user_1",
  timestamp: new Date(),
  notes: "",
  location: {
    latitude: 37.5665,
    longitude: 126.978,
    address: "서울시 강남구",
    restaurantName: "맛있는 식당",
  },
  meal: {
    photoUri: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800",
    mealType: MealType.LUNCH,
    nutrition: {
      calories: 485,
      protein: 32,
      carbs: 45,
      fat: 18,
    },
    aiAnalysis: {
      detectedMeals: ["닭가슴살 샐러드"],
      confidence: 92,
      nutrition: {
        calories: 485,
        protein: 32,
        carbs: 45,
        fat: 18,
      },
      mealCategory: MealType.LUNCH,
      ingredients: ["닭가슴살", "양상추", "방울토마토", "아보카도", "올리브오일", "발사믹"],
      comment: "단백질 폭탄이네요! 운동 후 먹으면 딱이겠어요.",
      cuisineType: "양식",
      insights: {
        healthScore: 88,
        nutritionBalance: "고단백 저탄수",
        recommendations: ["훌륭한 단백질 공급원!", "식이섬유도 충분해요"],
      },
    },
  },
  rating: 4,
  wouldEatAgain: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

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
    fallbackEntry: MOCK_ENTRY,
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
