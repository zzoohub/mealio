// Mock native modules and barrels that pull in RN dependencies
jest.mock("react-native", () => ({}));
jest.mock("expo-camera", () => ({ CameraView: "CameraView" }));
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "Light", Medium: "Medium" },
  NotificationFeedbackType: { Success: "Success", Error: "Error", Warning: "Warning" },
}));
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" },
}));
jest.mock("react-native-reanimated", () => ({
  useSharedValue: () => ({ value: 0, set: jest.fn() }),
  withSequence: jest.fn(),
  withTiming: jest.fn(),
}));
jest.mock("@/shared/lib/i18n", () => ({
  useCameraI18n: () => ({
    capture: { success: "", successMessage: "", error: "", errorMessage: "" },
    tapToEdit: "",
  }),
}));
jest.mock("@/app/providers/overlay", () => ({
  useOverlayHelpers: () => ({ toast: jest.fn() }),
}));

// Mock entity barrels to avoid pulling in RN UI components
jest.mock("@/entities/meal", () => ({
  MealType: {
    BREAKFAST: "breakfast",
    LUNCH: "lunch",
    DINNER: "dinner",
    SNACK: "snack",
    DESSERT: "dessert",
    DRINK: "drink",
    OTHER: "other",
  },
}));
jest.mock("@/entities/entry", () => ({}));

import { detectMealType } from "../useCamera";

// =============================================================================
// detectMealType — tests the time-based meal type detection logic
// =============================================================================

describe("detectMealType", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns BREAKFAST before 10:00", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 0, 1, 0, 0, 0));
    expect(detectMealType()).toBe("breakfast");

    jest.setSystemTime(new Date(2024, 0, 1, 9, 59, 59));
    expect(detectMealType()).toBe("breakfast");
  });

  it("returns LUNCH between 10:00 and 13:59", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 0, 1, 10, 0, 0));
    expect(detectMealType()).toBe("lunch");

    jest.setSystemTime(new Date(2024, 0, 1, 13, 59, 59));
    expect(detectMealType()).toBe("lunch");
  });

  it("returns SNACK between 14:00 and 16:59", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 0, 1, 14, 0, 0));
    expect(detectMealType()).toBe("snack");

    jest.setSystemTime(new Date(2024, 0, 1, 16, 59, 59));
    expect(detectMealType()).toBe("snack");
  });

  it("returns DINNER from 17:00 onward", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 0, 1, 17, 0, 0));
    expect(detectMealType()).toBe("dinner");

    jest.setSystemTime(new Date(2024, 0, 1, 23, 59, 59));
    expect(detectMealType()).toBe("dinner");
  });

  it("handles boundary at midnight", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 0, 1, 0, 0, 0));
    expect(detectMealType()).toBe("breakfast");
  });

  it("handles all boundary transitions", () => {
    jest.useFakeTimers();

    // 9:59 → breakfast
    jest.setSystemTime(new Date(2024, 0, 1, 9, 59, 0));
    expect(detectMealType()).toBe("breakfast");

    // 10:00 → lunch
    jest.setSystemTime(new Date(2024, 0, 1, 10, 0, 0));
    expect(detectMealType()).toBe("lunch");

    // 13:59 → lunch
    jest.setSystemTime(new Date(2024, 0, 1, 13, 59, 0));
    expect(detectMealType()).toBe("lunch");

    // 14:00 → snack
    jest.setSystemTime(new Date(2024, 0, 1, 14, 0, 0));
    expect(detectMealType()).toBe("snack");

    // 16:59 → snack
    jest.setSystemTime(new Date(2024, 0, 1, 16, 59, 0));
    expect(detectMealType()).toBe("snack");

    // 17:00 → dinner
    jest.setSystemTime(new Date(2024, 0, 1, 17, 0, 0));
    expect(detectMealType()).toBe("dinner");
  });
});
