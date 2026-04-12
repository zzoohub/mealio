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
    capture: {
      success: "",
      successMessage: "",
      error: "",
      errorMessage: "",
      guestLimitTitle: "Entry Limit Reached",
      guestLimitMessage: "You've reached the maximum of 10 entries. Sign in to save unlimited entries!",
    },
    tapToEdit: "",
  }),
}));
jest.mock("@/app/providers/overlay", () => ({
  useOverlayHelpers: () => ({ toast: jest.fn() }),
}));
jest.mock("@/shared/lib/location", () => ({
  useDeviceLocation: () => ({ getLocation: jest.fn().mockResolvedValue(undefined) }),
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

import { track } from "@/shared/lib/analytics";
import { detectMealType } from "../useCamera";

const mockTrack = track as jest.Mock;

// =============================================================================
// detectMealType — tests the time-based meal type detection logic
// =============================================================================

describe("detectMealType", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns BREAKFAST before 10:00 (no argument, uses system time)", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 0, 1, 0, 0, 0));
    expect(detectMealType()).toBe("breakfast");

    jest.setSystemTime(new Date(2024, 0, 1, 9, 59, 59));
    expect(detectMealType()).toBe("breakfast");
  });

  it("returns SNACK between 10:00 and 10:59 (no argument, uses system time)", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 0, 1, 10, 0, 0));
    expect(detectMealType()).toBe("snack");

    jest.setSystemTime(new Date(2024, 0, 1, 10, 59, 59));
    expect(detectMealType()).toBe("snack");
  });

  it("returns LUNCH between 11:00 and 13:59 (no argument, uses system time)", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 0, 1, 11, 0, 0));
    expect(detectMealType()).toBe("lunch");

    jest.setSystemTime(new Date(2024, 0, 1, 13, 59, 59));
    expect(detectMealType()).toBe("lunch");
  });

  it("returns SNACK between 14:00 and 16:59 (no argument, uses system time)", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 0, 1, 14, 0, 0));
    expect(detectMealType()).toBe("snack");

    jest.setSystemTime(new Date(2024, 0, 1, 16, 59, 59));
    expect(detectMealType()).toBe("snack");
  });

  it("returns DINNER from 17:00 onward (no argument, uses system time)", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 0, 1, 17, 0, 0));
    expect(detectMealType()).toBe("dinner");

    jest.setSystemTime(new Date(2024, 0, 1, 23, 59, 59));
    expect(detectMealType()).toBe("dinner");
  });

  it("handles boundary at midnight (no argument, uses system time)", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 0, 1, 0, 0, 0));
    expect(detectMealType()).toBe("breakfast");
  });

  it("handles all boundary transitions (no argument, uses system time)", () => {
    jest.useFakeTimers();

    // 9:59 → breakfast
    jest.setSystemTime(new Date(2024, 0, 1, 9, 59, 0));
    expect(detectMealType()).toBe("breakfast");

    // 10:00 → snack
    jest.setSystemTime(new Date(2024, 0, 1, 10, 0, 0));
    expect(detectMealType()).toBe("snack");

    // 10:59 → snack
    jest.setSystemTime(new Date(2024, 0, 1, 10, 59, 0));
    expect(detectMealType()).toBe("snack");

    // 11:00 → lunch
    jest.setSystemTime(new Date(2024, 0, 1, 11, 0, 0));
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

  // NEW: Tests with custom date parameter
  it("returns BREAKFAST before 10:00 with custom date", () => {
    const customDate = new Date(2026, 1, 5, 8, 30, 0);
    expect(detectMealType(customDate)).toBe("breakfast");
  });

  it("returns SNACK between 10:00 and 10:59 with custom date", () => {
    expect(detectMealType(new Date(2026, 1, 5, 10, 0, 0))).toBe("snack");
    expect(detectMealType(new Date(2026, 1, 5, 10, 59, 0))).toBe("snack");
  });

  it("returns LUNCH between 11:00 and 13:59 with custom date", () => {
    const customDate = new Date(2026, 1, 5, 12, 0, 0);
    expect(detectMealType(customDate)).toBe("lunch");
  });

  it("returns SNACK between 14:00 and 16:59 with custom date", () => {
    const customDate = new Date(2026, 1, 5, 15, 30, 0);
    expect(detectMealType(customDate)).toBe("snack");
  });

  it("returns DINNER from 17:00 onward with custom date", () => {
    const customDate = new Date(2026, 1, 5, 19, 0, 0);
    expect(detectMealType(customDate)).toBe("dinner");
  });

  it("handles all boundary transitions with custom date", () => {
    // 9:59 → breakfast
    expect(detectMealType(new Date(2026, 1, 5, 9, 59, 0))).toBe("breakfast");

    // 10:00 → snack
    expect(detectMealType(new Date(2026, 1, 5, 10, 0, 0))).toBe("snack");

    // 10:59 → snack
    expect(detectMealType(new Date(2026, 1, 5, 10, 59, 0))).toBe("snack");

    // 11:00 → lunch
    expect(detectMealType(new Date(2026, 1, 5, 11, 0, 0))).toBe("lunch");

    // 13:59 → lunch
    expect(detectMealType(new Date(2026, 1, 5, 13, 59, 0))).toBe("lunch");

    // 14:00 → snack
    expect(detectMealType(new Date(2026, 1, 5, 14, 0, 0))).toBe("snack");

    // 16:59 → snack
    expect(detectMealType(new Date(2026, 1, 5, 16, 59, 0))).toBe("snack");

    // 17:00 → dinner
    expect(detectMealType(new Date(2026, 1, 5, 17, 0, 0))).toBe("dinner");
  });

  it("handles midnight with custom date", () => {
    const customDate = new Date(2026, 1, 5, 0, 0, 0);
    expect(detectMealType(customDate)).toBe("breakfast");
  });

  it("handles late night (23:59) with custom date", () => {
    const customDate = new Date(2026, 1, 5, 23, 59, 59);
    expect(detectMealType(customDate)).toBe("dinner");
  });
});

// =============================================================================
// useCamera hook tests — integration tests for the hook
// =============================================================================

import { renderHook, act } from "@testing-library/react-native";
import { useCamera } from "../useCamera";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

// Get references to already-mocked modules
const overlayModule = jest.requireMock("@/app/providers/overlay");
const locationModule = jest.requireMock("@/shared/lib/location");

describe("useCamera hook", () => {
  const mockOnSaveEntry = jest.fn();
  const mockOnNavigateToEntry = jest.fn();
  const mockToast = jest.fn();
  const mockGetLocation = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the module mocks
    overlayModule.useOverlayHelpers = jest.fn(() => ({ toast: mockToast }));
    locationModule.useDeviceLocation = jest.fn(() => ({ getLocation: mockGetLocation }));
    mockGetLocation.mockResolvedValue(undefined);
  });

  describe("initialPhotos option", () => {
    it("initializes capturedPhotos state with empty array when no initialPhotos provided", () => {
      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
        })
      );

      expect(result.current.capturedPhotos).toEqual([]);
      expect(result.current.hasPhotos).toBe(false);

      // Analytics: track meal_capture_started on mount
      expect(mockTrack).toHaveBeenCalledWith("meal_capture_started", expect.objectContaining({
        source: "camera",
      }));
    });

    it("initializes capturedPhotos state with initialPhotos when provided", () => {
      const initialPhotos = ["photo1.jpg", "photo2.jpg", "photo3.jpg"];

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos,
        })
      );

      expect(result.current.capturedPhotos).toEqual(initialPhotos);
      expect(result.current.hasPhotos).toBe(true);
      expect(result.current.capturedPhotos.length).toBe(3);
    });

    it("computes canCapture and remainingPhotos correctly with initialPhotos", () => {
      const initialPhotos = ["photo1.jpg", "photo2.jpg"];

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos,
        })
      );

      expect(result.current.canCapture).toBe(true);
      expect(result.current.remainingPhotos).toBe(3); // 5 - 2
    });

    it("prevents capture when initialPhotos reaches MAX_PHOTOS", () => {
      const initialPhotos = Array.from({ length: 5 }, (_, i) => `photo${i}.jpg`);

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos,
        })
      );

      expect(result.current.canCapture).toBe(false);
      expect(result.current.remainingPhotos).toBe(0);
    });

    it("allows removing photos from initialPhotos", () => {
      const initialPhotos = ["photo1.jpg", "photo2.jpg", "photo3.jpg"];

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos,
        })
      );

      act(() => {
        result.current.removePhoto(1); // Remove "photo2.jpg"
      });

      expect(result.current.capturedPhotos).toEqual(["photo1.jpg", "photo3.jpg"]);
      expect(result.current.capturedPhotos.length).toBe(2);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });
  });

  describe("targetDate option", () => {
    it("uses current date for timestamp when no targetDate provided", async () => {
      const initialPhotos = ["photo1.jpg"];
      mockOnSaveEntry.mockResolvedValue("entry-123");

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos,
        })
      );

      const beforeTime = Date.now();
      await act(async () => {
        await result.current.handleDone();
      });
      const afterTime = Date.now();

      expect(mockOnSaveEntry).toHaveBeenCalled();
      const entryArg = mockOnSaveEntry.mock.calls[0][0];
      const timestamp = entryArg.timestamp.getTime();

      // Timestamp should be close to now
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime - 1000);
      expect(timestamp).toBeLessThanOrEqual(afterTime + 1000);
    });

    it("uses targetDate for timestamp when provided", async () => {
      const initialPhotos = ["photo1.jpg"];
      const targetDate = new Date(2026, 0, 10, 15, 30, 0);
      mockOnSaveEntry.mockResolvedValue("entry-456");

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos,
          targetDate,
        })
      );

      await act(async () => {
        await result.current.handleDone();
      });

      expect(mockOnSaveEntry).toHaveBeenCalled();
      const entryArg = mockOnSaveEntry.mock.calls[0][0];

      expect(entryArg.timestamp).toEqual(targetDate);
    });

    it("uses targetDate to determine mealType when provided", async () => {
      const initialPhotos = ["photo1.jpg"];
      const targetDate = new Date(2026, 0, 10, 8, 0, 0); // 8 AM → BREAKFAST
      mockOnSaveEntry.mockResolvedValue("entry-789");

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos,
          targetDate,
        })
      );

      await act(async () => {
        await result.current.handleDone();
      });

      expect(mockOnSaveEntry).toHaveBeenCalled();
      const entryArg = mockOnSaveEntry.mock.calls[0][0];

      expect(entryArg.meal.mealType).toBe("breakfast");
    });

    it("uses current time for mealType detection when no targetDate", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 0, 10, 19, 0, 0)); // 7 PM → DINNER

      const initialPhotos = ["photo1.jpg"];
      mockOnSaveEntry.mockResolvedValue("entry-999");

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos,
        })
      );

      await act(async () => {
        await result.current.handleDone();
      });

      expect(mockOnSaveEntry).toHaveBeenCalled();
      const entryArg = mockOnSaveEntry.mock.calls[0][0];

      expect(entryArg.meal.mealType).toBe("dinner");

      jest.useRealTimers();
    });

    it("detects correct mealType for different targetDate times", async () => {
      const testCases = [
        { time: new Date(2026, 0, 10, 9, 0, 0), expected: "breakfast" },
        { time: new Date(2026, 0, 10, 10, 30, 0), expected: "snack" },
        { time: new Date(2026, 0, 10, 12, 0, 0), expected: "lunch" },
        { time: new Date(2026, 0, 10, 15, 0, 0), expected: "snack" },
        { time: new Date(2026, 0, 10, 19, 0, 0), expected: "dinner" },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        mockOnSaveEntry.mockResolvedValue("entry-id");

        const { result } = renderHook(() =>
          useCamera({
            onSaveEntry: mockOnSaveEntry,
            initialPhotos: ["photo1.jpg"],
            targetDate: testCase.time,
          })
        );

        await act(async () => {
          await result.current.handleDone();
        });

        const entryArg = mockOnSaveEntry.mock.calls[0][0];
        expect(entryArg.meal.mealType).toBe(testCase.expected);
      }
    });
  });

  describe("handleDone integration", () => {
    it("does not save when no photos captured", async () => {
      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
        })
      );

      await act(async () => {
        await result.current.handleDone();
      });

      expect(mockOnSaveEntry).not.toHaveBeenCalled();
    });

    it("saves entry with initialPhotos when handleDone called", async () => {
      const initialPhotos = ["photo1.jpg", "photo2.jpg"];
      mockOnSaveEntry.mockResolvedValue("entry-123");

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos,
        })
      );

      await act(async () => {
        await result.current.handleDone();
      });

      expect(mockOnSaveEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          meal: expect.objectContaining({
            photoUri: "photo1.jpg",
            photoUris: initialPhotos,
          }),
        }),
        initialPhotos
      );

      // Analytics: track meal_saved
      expect(mockTrack).toHaveBeenCalledWith("meal_saved", expect.objectContaining({
        photo_count: 2,
      }));
    });

    it("saves entry with all captured photos in photoUris field", async () => {
      const capturedPhotos = ["photo1.jpg", "photo2.jpg", "photo3.jpg"];
      mockOnSaveEntry.mockResolvedValue("entry-456");

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos: capturedPhotos,
        })
      );

      await act(async () => {
        await result.current.handleDone();
      });

      expect(mockOnSaveEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          meal: expect.objectContaining({
            photoUri: "photo1.jpg",
            photoUris: capturedPhotos,
          }),
        }),
        capturedPhotos
      );
    });

    it("clears capturedPhotos after successful save with initialPhotos", async () => {
      const initialPhotos = ["photo1.jpg"];
      mockOnSaveEntry.mockResolvedValue("entry-123");

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos,
        })
      );

      expect(result.current.capturedPhotos.length).toBe(1);

      await act(async () => {
        await result.current.handleDone();
      });

      expect(result.current.capturedPhotos).toEqual([]);
    });

    it("shows success toast with navigation when entryId returned", async () => {
      const initialPhotos = ["photo1.jpg"];
      mockOnSaveEntry.mockResolvedValue("entry-123");

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          onNavigateToEntry: mockOnNavigateToEntry,
          initialPhotos,
        })
      );

      await act(async () => {
        await result.current.handleDone();
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "success",
          onPress: expect.any(Function),
        })
      );
    });

    it("shows success toast without navigation when entryId is undefined", async () => {
      const initialPhotos = ["photo1.jpg"];
      mockOnSaveEntry.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          onNavigateToEntry: mockOnNavigateToEntry,
          initialPhotos,
        })
      );

      await act(async () => {
        await result.current.handleDone();
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "success",
          onPress: undefined,
        })
      );
    });

    it("calls getLocation when saving entry", async () => {
      const mockLocation = { latitude: 37.7749, longitude: -122.4194 };
      mockGetLocation.mockResolvedValue(mockLocation);
      mockOnSaveEntry.mockResolvedValue("entry-123");

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos: ["photo1.jpg"],
        })
      );

      await act(async () => {
        await result.current.handleDone();
      });

      expect(mockGetLocation).toHaveBeenCalled();
      expect(mockOnSaveEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          location: mockLocation,
        }),
        expect.any(Array)
      );
    });

    it("prevents duplicate saves when already saving", async () => {
      const initialPhotos = ["photo1.jpg"];
      let resolvePromise: any;
      const savePromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockOnSaveEntry.mockReturnValue(savePromise);

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos,
        })
      );

      // Start first save
      act(() => {
        result.current.handleDone();
      });

      expect(result.current.isSaving).toBe(true);

      // Try to save again while first save is in progress
      await act(async () => {
        await result.current.handleDone();
      });

      // Should only be called once
      expect(mockOnSaveEntry).toHaveBeenCalledTimes(1);

      // Complete the save
      await act(async () => {
        resolvePromise("entry-123");
        await savePromise;
      });
    });
  });

  describe("removePhoto", () => {
    it("removes photo at specified index from initialPhotos", () => {
      const initialPhotos = ["photo1.jpg", "photo2.jpg", "photo3.jpg"];

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos,
        })
      );

      act(() => {
        result.current.removePhoto(0);
      });

      expect(result.current.capturedPhotos).toEqual(["photo2.jpg", "photo3.jpg"]);
    });

    it("triggers haptic feedback when removing photo", () => {
      const initialPhotos = ["photo1.jpg"];

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos,
        })
      );

      act(() => {
        result.current.removePhoto(0);
      });

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it("updates canCapture after removing photo", () => {
      const initialPhotos = Array.from({ length: 5 }, (_, i) => `photo${i}.jpg`);

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos,
        })
      );

      expect(result.current.canCapture).toBe(false);

      act(() => {
        result.current.removePhoto(0);
      });

      expect(result.current.canCapture).toBe(true);
      expect(result.current.remainingPhotos).toBe(1);
    });
  });

  describe("pickFromGallery with initialPhotos", () => {
    it("respects remainingPhotos when picking from gallery", async () => {
      const initialPhotos = ["photo1.jpg", "photo2.jpg"];
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "gallery1.jpg" }, { uri: "gallery2.jpg" }],
      });

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos,
        })
      );

      await act(async () => {
        await result.current.pickFromGallery();
      });

      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          selectionLimit: 3, // 5 - 2
        })
      );
    });

    it("adds gallery photos to initialPhotos", async () => {
      const initialPhotos = ["photo1.jpg"];
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "gallery1.jpg" }],
      });

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos,
        })
      );

      await act(async () => {
        await result.current.pickFromGallery();
      });

      expect(result.current.capturedPhotos).toEqual(["photo1.jpg", "gallery1.jpg"]);
    });

    it("does not allow picking when at MAX_PHOTOS", async () => {
      const initialPhotos = Array.from({ length: 5 }, (_, i) => `photo${i}.jpg`);

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos,
        })
      );

      await act(async () => {
        await result.current.pickFromGallery();
      });

      expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Warning
      );
    });
  });

  describe("isAtGuestLimit blocking feature", () => {
    it("capturePhoto shows warning toast and returns early when isAtGuestLimit is true", async () => {
      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          isAtGuestLimit: true,
        })
      );

      await act(async () => {
        await result.current.capturePhoto();
      });

      // Should show guest limit toast
      expect(mockToast).toHaveBeenCalledWith({
        title: "Entry Limit Reached",
        message: "You've reached the maximum of 10 entries. Sign in to save unlimited entries!",
        type: "warning",
        position: "top",
        duration: 4000,
      });

      // Should trigger haptic warning feedback
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Warning
      );

      // Should not attempt to capture photo
      expect(result.current.capturedPhotos).toEqual([]);
      expect(result.current.isCapturing).toBe(false);

      // Analytics: track guest_limit_reached
      expect(mockTrack).toHaveBeenCalledWith("guest_limit_reached", { entry_count: 10 });
    });

    it("pickFromGallery shows warning toast and returns early when isAtGuestLimit is true", async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "gallery1.jpg" }],
      });

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          isAtGuestLimit: true,
        })
      );

      await act(async () => {
        await result.current.pickFromGallery();
      });

      // Should show guest limit toast
      expect(mockToast).toHaveBeenCalledWith({
        title: "Entry Limit Reached",
        message: "You've reached the maximum of 10 entries. Sign in to save unlimited entries!",
        type: "warning",
        position: "top",
        duration: 4000,
      });

      // Should trigger haptic warning feedback
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Warning
      );

      // Should not launch image picker
      expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();

      // Should not add any photos
      expect(result.current.capturedPhotos).toEqual([]);
    });

    it("handleDone shows warning toast and returns early when isAtGuestLimit is true", async () => {
      const initialPhotos = ["photo1.jpg"];

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos,
          isAtGuestLimit: true,
        })
      );

      await act(async () => {
        await result.current.handleDone();
      });

      // Should show guest limit toast
      expect(mockToast).toHaveBeenCalledWith({
        title: "Entry Limit Reached",
        message: "You've reached the maximum of 10 entries. Sign in to save unlimited entries!",
        type: "warning",
        position: "top",
        duration: 4000,
      });

      // Should trigger haptic warning feedback
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Warning
      );

      // Should not attempt to save entry
      expect(mockOnSaveEntry).not.toHaveBeenCalled();

      // Should not clear photos
      expect(result.current.capturedPhotos).toEqual(initialPhotos);
      expect(result.current.isSaving).toBe(false);
    });

    it("capturePhoto works normally when isAtGuestLimit is false", async () => {
      const mockPhoto = { uri: "captured.jpg" };
      const mockTakePicture = jest.fn().mockResolvedValue(mockPhoto);

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          isAtGuestLimit: false,
        })
      );

      // Mock the camera ref
      (result.current.cameraRef as any).current = {
        takePictureAsync: mockTakePicture,
      };

      await act(async () => {
        await result.current.capturePhoto();
      });

      // Should capture the photo
      expect(mockTakePicture).toHaveBeenCalledWith({
        quality: 0.8,
        base64: false,
      });

      // Should add photo to state
      expect(result.current.capturedPhotos).toEqual(["captured.jpg"]);

      // Should trigger success haptic feedback
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );

      // Analytics: track photo_captured
      expect(mockTrack).toHaveBeenCalledWith("photo_captured", {
        source: "camera",
        photo_count: 1,
      });

      // Should NOT show guest limit toast
      expect(mockToast).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: "warning",
        })
      );
    });

    it("capturePhoto works normally when isAtGuestLimit is undefined", async () => {
      const mockPhoto = { uri: "captured.jpg" };
      const mockTakePicture = jest.fn().mockResolvedValue(mockPhoto);

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          // isAtGuestLimit is undefined
        })
      );

      // Mock the camera ref
      (result.current.cameraRef as any).current = {
        takePictureAsync: mockTakePicture,
      };

      await act(async () => {
        await result.current.capturePhoto();
      });

      // Should capture the photo
      expect(mockTakePicture).toHaveBeenCalledWith({
        quality: 0.8,
        base64: false,
      });

      // Should add photo to state
      expect(result.current.capturedPhotos).toEqual(["captured.jpg"]);

      // Should NOT show guest limit toast
      expect(mockToast).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: "warning",
        })
      );
    });

    it("pickFromGallery works normally when isAtGuestLimit is false", async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "gallery1.jpg" }],
      });

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          isAtGuestLimit: false,
        })
      );

      await act(async () => {
        await result.current.pickFromGallery();
      });

      // Should launch image picker
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();

      // Should add photo to state
      expect(result.current.capturedPhotos).toEqual(["gallery1.jpg"]);

      // Should NOT show guest limit toast
      expect(mockToast).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: "warning",
        })
      );
    });

    it("handleDone works normally when isAtGuestLimit is false", async () => {
      const initialPhotos = ["photo1.jpg"];
      mockOnSaveEntry.mockResolvedValue("entry-123");

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos,
          isAtGuestLimit: false,
        })
      );

      await act(async () => {
        await result.current.handleDone();
      });

      // Should save the entry
      expect(mockOnSaveEntry).toHaveBeenCalled();

      // Should show success toast, not warning toast
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "success",
        })
      );

      expect(mockToast).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: "warning",
        })
      );

      // Should clear photos
      expect(result.current.capturedPhotos).toEqual([]);
    });

    it("verifies haptic warning feedback is triggered exactly once when blocked", async () => {
      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          isAtGuestLimit: true,
        })
      );

      await act(async () => {
        await result.current.capturePhoto();
      });

      // Should trigger haptic warning feedback exactly once
      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Warning
      );

      // Clear mocks for next test
      jest.clearAllMocks();

      // Test pickFromGallery
      await act(async () => {
        await result.current.pickFromGallery();
      });

      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Warning
      );

      // Clear mocks for next test
      jest.clearAllMocks();

      // Test handleDone with photos
      const { result: result2 } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos: ["photo1.jpg"],
          isAtGuestLimit: true,
        })
      );

      await act(async () => {
        await result2.current.handleDone();
      });

      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Warning
      );
    });

    it("does not interfere with other guard conditions", async () => {
      // Test that isAtGuestLimit is checked BEFORE canCapture
      const initialPhotos = Array.from({ length: 5 }, (_, i) => `photo${i}.jpg`);

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos,
          isAtGuestLimit: true,
        })
      );

      expect(result.current.canCapture).toBe(false); // At MAX_PHOTOS

      await act(async () => {
        await result.current.capturePhoto();
      });

      // Should show guest limit toast, not MAX_PHOTOS warning
      expect(mockToast).toHaveBeenCalledWith({
        title: "Entry Limit Reached",
        message: "You've reached the maximum of 10 entries. Sign in to save unlimited entries!",
        type: "warning",
        position: "top",
        duration: 4000,
      });

      // Haptics should be called once for guest limit, not for MAX_PHOTOS
      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    });

    it("capturePhoto error handler does not interfere with guest limit check", async () => {
      const mockTakePicture = jest.fn().mockRejectedValue(new Error("Camera error"));

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          isAtGuestLimit: false,
        })
      );

      // Mock the camera ref
      (result.current.cameraRef as any).current = {
        takePictureAsync: mockTakePicture,
      };

      await act(async () => {
        await result.current.capturePhoto();
      });

      // Error should be handled normally
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Error
      );

      // No photos should be added
      expect(result.current.capturedPhotos).toEqual([]);

      // Should NOT show guest limit toast
      expect(mockToast).not.toHaveBeenCalled();
    });

    it("handleDone error handler does not interfere with guest limit check", async () => {
      const initialPhotos = ["photo1.jpg"];
      mockOnSaveEntry.mockRejectedValue(new Error("Save error"));

      const { result } = renderHook(() =>
        useCamera({
          onSaveEntry: mockOnSaveEntry,
          initialPhotos,
          isAtGuestLimit: false,
        })
      );

      await act(async () => {
        await result.current.handleDone();
      });

      // Error toast should be shown, not guest limit toast
      expect(mockToast).toHaveBeenCalledWith({
        title: "",
        message: "",
        type: "error",
        position: "top",
        duration: 4000,
      });

      expect(mockToast).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: "warning",
        })
      );

      // Photos should NOT be cleared on error
      expect(result.current.capturedPhotos).toEqual(initialPhotos);
    });
  });
});
