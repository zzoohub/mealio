import React, { useEffect, useState, useCallback } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { EntryDetailPage } from "@/domains/diary/components";
import { Entry, MealType, Meal, NutritionInfo, entryStorageUtils } from "@/domains/diary";

// =============================================================================
// MOCK DATA FOR UI TESTING
// =============================================================================

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
      estimatedCalories: 485,
      mealCategory: MealType.LUNCH,
      ingredients: ["닭가슴살", "양상추", "방울토마토", "아보카도", "올리브오일", "발사믹"],
      comment: "단백질 폭탄이네요! 💪 운동 후 먹으면 딱이겠어요.",
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

export default function DiaryEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Load entry data (fallback to mock data for UI testing)
  useEffect(() => {
    const loadEntry = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const entryData = await entryStorageUtils.getEntryById(id);
        // Use mock data if entry not found (for UI testing)
        setEntry(entryData || MOCK_ENTRY);
      } catch (error) {
        console.error("Failed to load entry:", error);
        // Fallback to mock data on error
        setEntry(MOCK_ENTRY);
      } finally {
        setLoading(false);
      }
    };

    loadEntry();
  }, [id]);

  // =============================================================================
  // UPDATE HELPERS
  // =============================================================================

  const updateEntry = useCallback(
    async (updates: Partial<Entry>) => {
      if (!id || !entry) return;

      try {
        const updatedEntry = await entryStorageUtils.updateEntry(id, updates);
        setEntry(updatedEntry);
      } catch (error) {
        console.error("Failed to update entry:", error);
      }
    },
    [id, entry]
  );

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleBackPress = useCallback(() => {
    router.back();
  }, [router]);

  const handlePhotoPress = useCallback(() => {
    // TODO: Open fullscreen photo viewer or change photo
    console.log("Photo pressed");
  }, []);

  const handleMealTypeChange = useCallback(
    (mealType: MealType) => {
      if (!entry) return;
      updateEntry({
        meal: {
          ...entry.meal,
          mealType,
        },
      });
    },
    [entry, updateEntry]
  );

  const handleNotesChange = useCallback(
    (notes: string) => {
      updateEntry({ notes });
    },
    [updateEntry]
  );

  const handleRatingChange = useCallback(
    (rating: number) => {
      updateEntry({ rating });
    },
    [updateEntry]
  );

  const handleWouldEatAgainChange = useCallback(
    (wouldEatAgain: boolean) => {
      updateEntry({ wouldEatAgain });
    },
    [updateEntry]
  );

  const handleIngredientsChange = useCallback(
    (ingredients: string[]) => {
      if (!entry) return;
      updateEntry({
        meal: {
          ...entry.meal,
          ingredients,
        },
      });
    },
    [entry, updateEntry]
  );

  const handleNutritionChange = useCallback(
    (nutrition: NutritionInfo) => {
      if (!entry) return;
      updateEntry({
        meal: {
          ...entry.meal,
          nutrition,
        },
      });
    },
    [entry, updateEntry]
  );

  const handleDeletePress = useCallback(() => {
    Alert.alert(
      "기록 삭제",
      "이 식사 기록을 삭제하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            if (!id) return;

            setDeleting(true);
            try {
              await entryStorageUtils.deleteEntry(id);
              router.back();
            } catch (error) {
              console.error("Failed to delete entry:", error);
              Alert.alert("오류", "삭제에 실패했습니다. 다시 시도해주세요.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }, [id, router]);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <EntryDetailPage
      entry={entry}
      loading={loading}
      deleting={deleting}
      onBackPress={handleBackPress}
      onPhotoPress={handlePhotoPress}
      onMealTypeChange={handleMealTypeChange}
      onNotesChange={handleNotesChange}
      onRatingChange={handleRatingChange}
      onWouldEatAgainChange={handleWouldEatAgainChange}
      onIngredientsChange={handleIngredientsChange}
      onNutritionChange={handleNutritionChange}
      onDeletePress={handleDeletePress}
    />
  );
}
