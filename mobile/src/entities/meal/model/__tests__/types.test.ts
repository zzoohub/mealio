import { MealType } from '../types';
import type { NutritionInfo, AIAnalysis, Meal, CapturedPhoto, CameraSettings } from '../types';

describe('Meal entity types', () => {
  describe('MealType enum', () => {
    it('has all expected values', () => {
      expect(MealType.BREAKFAST).toBe('breakfast');
      expect(MealType.LUNCH).toBe('lunch');
      expect(MealType.DINNER).toBe('dinner');
      expect(MealType.SNACK).toBe('snack');
      expect(MealType.DESSERT).toBe('dessert');
      expect(MealType.DRINK).toBe('drink');
      expect(MealType.OTHER).toBe('other');
    });

    it('has exactly 7 members', () => {
      const values = Object.values(MealType);
      expect(values).toHaveLength(7);
    });
  });

  describe('NutritionInfo', () => {
    it('has all required numeric fields', () => {
      const nutrition: NutritionInfo = {
        calories: 500,
        protein: 25,
        fat: 20,
        carbs: 60,
        fiber: 5,
        sugar: 10,
        sodium: 800,
      };

      expect(nutrition.calories).toBe(500);
      expect(nutrition.protein).toBe(25);
      expect(nutrition.fat).toBe(20);
      expect(nutrition.carbs).toBe(60);
      expect(nutrition.fiber).toBe(5);
      expect(nutrition.sugar).toBe(10);
      expect(nutrition.sodium).toBe(800);
    });
  });

  describe('AIAnalysis', () => {
    it('has required and optional fields', () => {
      const analysis: AIAnalysis = {
        detectedMeals: ['rice', 'kimchi'],
        confidence: 0.95,
        nutrition: {
          calories: 400,
          protein: 15,
          fat: 10,
          carbs: 50,
          fiber: 3,
          sugar: 5,
          sodium: 600,
        },
        mealCategory: MealType.LUNCH,
        ingredients: ['rice', 'kimchi', 'tofu'],
      };

      expect(analysis.detectedMeals).toHaveLength(2);
      expect(analysis.confidence).toBe(0.95);
      expect(analysis.mealCategory).toBe('lunch');
      expect(analysis.cuisineType).toBeUndefined();
      expect(analysis.comment).toBeUndefined();
      expect(analysis.insights).toBeUndefined();
    });

    it('supports optional insights field', () => {
      const analysis: AIAnalysis = {
        detectedMeals: ['salad'],
        confidence: 0.9,
        nutrition: {
          calories: 200,
          protein: 8,
          fat: 12,
          carbs: 15,
          fiber: 6,
          sugar: 3,
          sodium: 300,
        },
        mealCategory: MealType.LUNCH,
        ingredients: ['lettuce', 'tomato'],
        insights: {
          healthScore: 85,
          nutritionBalance: 'good',
          recommendations: ['Add more protein'],
          warnings: ['Low protein'],
        },
      };

      expect(analysis.insights?.healthScore).toBe(85);
      expect(analysis.insights?.recommendations).toHaveLength(1);
      expect(analysis.insights?.warnings).toHaveLength(1);
    });
  });

  describe('Meal', () => {
    it('has required fields and optional nutrition', () => {
      const meal: Meal = {
        photoUri: 'file://photo.jpg',
        mealType: MealType.BREAKFAST,
      };

      expect(meal.photoUri).toBe('file://photo.jpg');
      expect(meal.mealType).toBe('breakfast');
      expect(meal.nutrition).toBeUndefined();
      expect(meal.ingredients).toBeUndefined();
      expect(meal.aiAnalysis).toBeUndefined();
    });

    it('supports multiple photoUris', () => {
      const meal: Meal = {
        photoUri: 'file://photo1.jpg',
        photoUris: ['file://photo1.jpg', 'file://photo2.jpg'],
        mealType: MealType.DINNER,
      };

      expect(meal.photoUris).toHaveLength(2);
    });
  });

  describe('CapturedPhoto', () => {
    it('has required dimensions and optional fields', () => {
      const photo: CapturedPhoto = {
        uri: 'file://captured.jpg',
        width: 1920,
        height: 1080,
      };

      expect(photo.uri).toBe('file://captured.jpg');
      expect(photo.width).toBe(1920);
      expect(photo.height).toBe(1080);
      expect(photo.base64).toBeUndefined();
      expect(photo.exif).toBeUndefined();
    });
  });

  describe('CameraSettings', () => {
    it('constrains type, flash, and quality values', () => {
      const settings: CameraSettings = {
        type: 'back',
        flash: 'auto',
        quality: 0.8,
      };

      expect(settings.type).toBe('back');
      expect(settings.flash).toBe('auto');
      expect(settings.quality).toBe(0.8);
    });
  });
});
