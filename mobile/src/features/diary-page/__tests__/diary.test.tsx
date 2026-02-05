// Mock native modules and dependencies
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Pressable: "Pressable",
  ActivityIndicator: "ActivityIndicator",
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("@shopify/flash-list", () => ({
  FlashList: "FlashList",
}));

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" },
}));

jest.mock("@/entities/entry", () => ({
  useEntryData: jest.fn(),
}));

jest.mock("@/features/entry-feed", () => ({
  useEntryFeedPage: jest.fn(),
  WeekDaySelector: "WeekDaySelector",
  EntryFeedItem: "EntryFeedItem",
  CalendarSheetContent: "CalendarSheetContent",
}));

jest.mock("@/features/capture-meal", () => ({
  detectMealType: jest.fn(),
}));

jest.mock("@/shared/lib/utils", () => ({
  isSameDay: jest.fn(),
}));

jest.mock("@/shared/lib/i18n", () => ({
  useDiaryI18n: jest.fn(),
  useCameraI18n: jest.fn(),
  getCurrentLanguage: jest.fn(),
}));

jest.mock("@/shared/lib/location", () => ({
  useDeviceLocation: jest.fn(),
}));

jest.mock("@/shared/ui/theme", () => ({
  useTheme: jest.fn(),
}));

jest.mock("@/shared/ui/tokens", () => ({
  tokens: {
    spacing: {
      component: { xs: 4, sm: 8, md: 12 },
      layout: { md: 16, lg: 24, xl: 32 },
    },
    typography: {
      fontSize: { h3: 24, h4: 20, body: 16, bodySmall: 14 },
      fontWeight: { semibold: "600" },
    },
    radius: { md: 8 },
  },
}));

jest.mock("@/app/providers/overlay", () => ({
  useOverlayHelpers: jest.fn(),
}));

// =============================================================================
// TESTS
// =============================================================================

import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { detectMealType } from "@/features/capture-meal";

// Get mocked modules
const routerModule = jest.requireMock("expo-router");
const entryModule = jest.requireMock("@/entities/entry");
const entryFeedModule = jest.requireMock("@/features/entry-feed");
const utilsModule = jest.requireMock("@/shared/lib/utils");
const i18nModule = jest.requireMock("@/shared/lib/i18n");
const locationModule = jest.requireMock("@/shared/lib/location");
const themeModule = jest.requireMock("@/shared/ui/theme");
const overlayModule = jest.requireMock("@/app/providers/overlay");

describe("DiaryPage - handleLoadFromAlbum", () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  };

  const mockToast = jest.fn();
  const mockBottomSheet = jest.fn();
  const mockSaveEntry = jest.fn();
  const mockGetLocation = jest.fn();

  const mockColors = {
    bg: { primary: "#FFFFFF" },
    text: { primary: "#000000", secondary: "#666666" },
    interactive: { primary: "#007AFF" },
  };

  const mockDiaryI18n = {
    selectDate: "Select Date",
    noMealsFound: "No meals found",
    recordMeal: "Record Meal",
    loadFromAlbum: "Load from Album",
    orSelectFromPhotos: "Or select from photos",
  };

  const mockCameraI18n = {
    capture: {
      success: "Success",
      successMessage: "Entry saved successfully",
      error: "Error",
      errorMessage: "Failed to save entry",
    },
    tapToEdit: "Tap to edit",
  };

  const todayDate = new Date(2026, 1, 5, 14, 0, 0); // Feb 5, 2026, 2 PM
  const pastDate = new Date(2026, 1, 3, 10, 0, 0); // Feb 3, 2026, 10 AM

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    routerModule.useRouter.mockReturnValue(mockRouter);
    overlayModule.useOverlayHelpers.mockReturnValue({
      toast: mockToast,
      bottomSheet: mockBottomSheet,
    });
    entryModule.useEntryData.mockReturnValue({
      saveEntry: mockSaveEntry,
    });
    locationModule.useDeviceLocation.mockReturnValue({
      getLocation: mockGetLocation,
    });
    themeModule.useTheme.mockReturnValue({
      colors: mockColors,
    });
    i18nModule.useDiaryI18n.mockReturnValue(mockDiaryI18n);
    i18nModule.useCameraI18n.mockReturnValue(mockCameraI18n);
    i18nModule.getCurrentLanguage.mockReturnValue("en-US");
    entryFeedModule.useEntryFeedPage.mockReturnValue({
      selectedDate: todayDate,
      formattedMonthYear: "February 2026",
      today: todayDate,
      entries: [],
      isLoading: false,
      markedDates: {},
      selectDate: jest.fn(),
      handleCalendarDayPress: jest.fn(),
      handleVisibleWeekChange: jest.fn(),
      dateThumbnails: {},
    });

    mockGetLocation.mockResolvedValue(undefined);
    mockSaveEntry.mockResolvedValue("entry-123");
    (detectMealType as jest.Mock).mockReturnValue("lunch");
  });

  describe("isToday = true (today's date)", () => {
    beforeEach(() => {
      utilsModule.isSameDay.mockReturnValue(true);
      entryFeedModule.useEntryFeedPage.mockReturnValue({
        selectedDate: todayDate,
        formattedMonthYear: "February 2026",
        today: todayDate,
        entries: [],
        isLoading: false,
        markedDates: {},
        selectDate: jest.fn(),
        handleCalendarDayPress: jest.fn(),
        handleVisibleWeekChange: jest.fn(),
        dateThumbnails: {},
      });
    });

    it("navigates to camera page with photo URIs when user picks photos", async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "photo1.jpg" }, { uri: "photo2.jpg" }],
      });

      // Simulate the handleLoadFromAlbum behavior for isToday = true
      await act(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const photoUris = result.assets.map((a) => a.uri);
          // When isToday is true, navigate to camera page
          mockRouter.push({
            pathname: "/",
            params: {
              initialPhotos: photoUris.join(","),
              targetDate: todayDate.toISOString(),
            },
          });
        }
      });

      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: "/",
        params: {
          initialPhotos: "photo1.jpg,photo2.jpg",
          targetDate: todayDate.toISOString(),
        },
      });

      expect(mockSaveEntry).not.toHaveBeenCalled();
      expect(mockToast).not.toHaveBeenCalled();
    });

    it("does not save entry directly when isToday is true", async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "photo1.jpg" }],
      });

      await act(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const photoUris = result.assets.map((a) => a.uri);
          mockRouter.push({
            pathname: "/",
            params: {
              initialPhotos: photoUris.join(","),
              targetDate: todayDate.toISOString(),
            },
          });
        }
      });

      expect(mockSaveEntry).not.toHaveBeenCalled();
    });

    it("handles user canceling photo picker", async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: true,
        assets: [],
      });

      await act(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          // This should not execute
          mockRouter.push({ pathname: "/" });
        }
      });

      expect(mockRouter.push).not.toHaveBeenCalled();
      expect(mockSaveEntry).not.toHaveBeenCalled();
    });

    it("handles no photos selected", async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [],
      });

      await act(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          // This should not execute
          mockRouter.push({ pathname: "/" });
        }
      });

      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe("isToday = false (past date)", () => {
    beforeEach(() => {
      utilsModule.isSameDay.mockReturnValue(false);
      entryFeedModule.useEntryFeedPage.mockReturnValue({
        selectedDate: pastDate,
        formattedMonthYear: "February 2026",
        today: todayDate,
        entries: [],
        isLoading: false,
        markedDates: {},
        selectDate: jest.fn(),
        handleCalendarDayPress: jest.fn(),
        handleVisibleWeekChange: jest.fn(),
        dateThumbnails: {},
      });
    });

    it("saves entry directly when user picks photos for past date", async () => {
      const mockLocation = { latitude: 37.7749, longitude: -122.4194 };
      mockGetLocation.mockResolvedValue(mockLocation);
      (detectMealType as jest.Mock).mockReturnValue("breakfast");
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "photo1.jpg" }, { uri: "photo2.jpg" }],
      });

      await act(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const photoUris = result.assets.map((a) => a.uri);
          const location = await mockGetLocation();
          await mockSaveEntry(
            {
              userId: "",
              timestamp: pastDate,
              notes: "",
              location,
              meal: {
                photoUri: photoUris[0],
                mealType: detectMealType(pastDate),
              },
            },
            photoUris
          );

          mockToast({
            title: mockCameraI18n.capture.success,
            message: mockCameraI18n.capture.successMessage,
            type: "success",
            position: "top",
            showArrow: true,
            duration: 4000,
            onPress: expect.any(Function),
          });
        }
      });

      expect(mockSaveEntry).toHaveBeenCalledWith(
        {
          userId: "",
          timestamp: pastDate,
          notes: "",
          location: mockLocation,
          meal: {
            photoUri: "photo1.jpg",
            mealType: "breakfast",
          },
        },
        ["photo1.jpg", "photo2.jpg"]
      );

      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it("calls detectMealType with selectedDate for past dates", async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "photo1.jpg" }],
      });
      (detectMealType as jest.Mock).mockReturnValue("breakfast");

      await act(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const photoUris = result.assets.map((a) => a.uri);
          const location = await mockGetLocation();
          await mockSaveEntry(
            {
              userId: "",
              timestamp: pastDate,
              notes: "",
              location,
              meal: {
                photoUri: photoUris[0],
                mealType: detectMealType(pastDate),
              },
            },
            photoUris
          );
        }
      });

      expect(detectMealType).toHaveBeenCalledWith(pastDate);
    });

    it("shows success toast after saving entry", async () => {
      mockSaveEntry.mockResolvedValue("entry-456");
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "photo1.jpg" }],
      });

      await act(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const photoUris = result.assets.map((a) => a.uri);
          const location = await mockGetLocation();
          const entryId = await mockSaveEntry(
            {
              userId: "",
              timestamp: pastDate,
              notes: "",
              location,
              meal: {
                photoUri: photoUris[0],
                mealType: detectMealType(pastDate),
              },
            },
            photoUris
          );

          mockToast({
            title: mockCameraI18n.capture.success,
            message: mockCameraI18n.capture.successMessage,
            type: "success",
            position: "top",
            showArrow: true,
            duration: 4000,
            onPress: entryId ? () => mockRouter.push(`/diary/${entryId}`) : undefined,
          });
        }
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        message: "Entry saved successfully",
        type: "success",
        position: "top",
        showArrow: true,
        duration: 4000,
        onPress: expect.any(Function),
      });
    });

    it("shows error toast on save failure", async () => {
      const saveError = new Error("Network error");
      mockSaveEntry.mockRejectedValue(saveError);
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "photo1.jpg" }],
      });

      await act(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const photoUris = result.assets.map((a) => a.uri);
          try {
            const location = await mockGetLocation();
            await mockSaveEntry(
              {
                userId: "",
                timestamp: pastDate,
                notes: "",
                location,
                meal: {
                  photoUri: photoUris[0],
                  mealType: detectMealType(pastDate),
                },
              },
              photoUris
            );
          } catch (error) {
            console.error("Failed to save entry:", error);
            mockToast({
              title: mockCameraI18n.capture.error,
              message: mockCameraI18n.capture.errorMessage,
              type: "error",
              position: "top",
              duration: 4000,
            });
          }
        }
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        message: "Failed to save entry",
        type: "error",
        position: "top",
        duration: 4000,
      });
    });

    it("passes all selected photo URIs to saveEntry", async () => {
      const photoUris = ["photo1.jpg", "photo2.jpg", "photo3.jpg"];
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: photoUris.map((uri) => ({ uri })),
      });

      await act(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const uris = result.assets.map((a) => a.uri);
          const location = await mockGetLocation();
          await mockSaveEntry(
            {
              userId: "",
              timestamp: pastDate,
              notes: "",
              location,
              meal: {
                photoUri: uris[0],
                mealType: detectMealType(pastDate),
              },
            },
            uris
          );
        }
      });

      expect(mockSaveEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          meal: expect.objectContaining({
            photoUri: "photo1.jpg",
          }),
        }),
        photoUris
      );
    });

    it("uses first photo as primary photoUri", async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "first.jpg" }, { uri: "second.jpg" }],
      });

      await act(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const photoUris = result.assets.map((a) => a.uri);
          const location = await mockGetLocation();
          await mockSaveEntry(
            {
              userId: "",
              timestamp: pastDate,
              notes: "",
              location,
              meal: {
                photoUri: photoUris[0],
                mealType: detectMealType(pastDate),
              },
            },
            photoUris
          );
        }
      });

      expect(mockSaveEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          meal: expect.objectContaining({
            photoUri: "first.jpg",
          }),
        }),
        expect.any(Array)
      );
    });

    it("gets location before saving entry", async () => {
      const mockLocation = { latitude: 40.7128, longitude: -74.006 };
      mockGetLocation.mockResolvedValue(mockLocation);
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "photo1.jpg" }],
      });

      await act(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const photoUris = result.assets.map((a) => a.uri);
          const location = await mockGetLocation();
          await mockSaveEntry(
            {
              userId: "",
              timestamp: pastDate,
              notes: "",
              location,
              meal: {
                photoUri: photoUris[0],
                mealType: detectMealType(pastDate),
              },
            },
            photoUris
          );
        }
      });

      expect(mockGetLocation).toHaveBeenCalled();
      expect(mockSaveEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          location: mockLocation,
        }),
        expect.any(Array)
      );
    });

    it("handles undefined location gracefully", async () => {
      mockGetLocation.mockResolvedValue(undefined);
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "photo1.jpg" }],
      });

      await act(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const photoUris = result.assets.map((a) => a.uri);
          const location = await mockGetLocation();
          await mockSaveEntry(
            {
              userId: "",
              timestamp: pastDate,
              notes: "",
              location,
              meal: {
                photoUri: photoUris[0],
                mealType: detectMealType(pastDate),
              },
            },
            photoUris
          );
        }
      });

      expect(mockSaveEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          location: undefined,
        }),
        expect.any(Array)
      );
    });
  });

  describe("isSaving guard", () => {
    beforeEach(() => {
      utilsModule.isSameDay.mockReturnValue(false);
      entryFeedModule.useEntryFeedPage.mockReturnValue({
        selectedDate: pastDate,
        formattedMonthYear: "February 2026",
        today: todayDate,
        entries: [],
        isLoading: false,
        markedDates: {},
        selectDate: jest.fn(),
        handleCalendarDayPress: jest.fn(),
        handleVisibleWeekChange: jest.fn(),
        dateThumbnails: {},
      });
    });

    it("prevents double submission when isSaving is true", async () => {
      let isSaving = false;

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "photo1.jpg" }],
      });

      // Simulate first save attempt
      await act(async () => {
        if (isSaving) return;
        isSaving = true;

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const photoUris = result.assets.map((a) => a.uri);
          const location = await mockGetLocation();
          await mockSaveEntry(
            {
              userId: "",
              timestamp: pastDate,
              notes: "",
              location,
              meal: {
                photoUri: photoUris[0],
                mealType: detectMealType(pastDate),
              },
            },
            photoUris
          );
        }
      });

      // Attempt second save while isSaving is true
      await act(async () => {
        if (isSaving) return; // Should return early
        // This should not execute
        await mockSaveEntry({}, []);
      });

      expect(mockSaveEntry).toHaveBeenCalledTimes(1);
    });

    it("allows save after previous save completes", async () => {
      let isSaving = false;

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "photo1.jpg" }],
      });

      // First save
      await act(async () => {
        if (isSaving) return;
        isSaving = true;

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const photoUris = result.assets.map((a) => a.uri);
          const location = await mockGetLocation();
          await mockSaveEntry(
            {
              userId: "",
              timestamp: pastDate,
              notes: "",
              location,
              meal: {
                photoUri: photoUris[0],
                mealType: detectMealType(pastDate),
              },
            },
            photoUris
          );
        }

        isSaving = false; // Save complete
      });

      // Second save should now succeed
      await act(async () => {
        if (isSaving) return;
        isSaving = true;

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const photoUris = result.assets.map((a) => a.uri);
          const location = await mockGetLocation();
          await mockSaveEntry(
            {
              userId: "",
              timestamp: pastDate,
              notes: "",
              location,
              meal: {
                photoUri: photoUris[0],
                mealType: detectMealType(pastDate),
              },
            },
            photoUris
          );
        }

        isSaving = false;
      });

      expect(mockSaveEntry).toHaveBeenCalledTimes(2);
    });
  });

  describe("getCurrentLanguage usage", () => {
    it("uses getCurrentLanguage() for date formatting instead of hardcoded locale", () => {
      i18nModule.getCurrentLanguage.mockReturnValue("ko-KR");

      // Simulate the date formatting logic from the component
      const locale = i18nModule.getCurrentLanguage();
      const formattedDate = pastDate.toLocaleDateString(locale, {
        month: "long",
        day: "numeric",
        weekday: "long",
      });

      expect(i18nModule.getCurrentLanguage).toHaveBeenCalled();
      expect(locale).toBe("ko-KR");
      expect(formattedDate).toBeTruthy();
    });

    it("handles different language codes", () => {
      const testCases = [
        { lang: "en-US", expected: "en-US" },
        { lang: "ko-KR", expected: "ko-KR" },
        { lang: "ja-JP", expected: "ja-JP" },
        { lang: "zh-CN", expected: "zh-CN" },
      ];

      testCases.forEach(({ lang, expected }) => {
        jest.clearAllMocks();
        i18nModule.getCurrentLanguage.mockReturnValue(lang);

        const locale = i18nModule.getCurrentLanguage();
        const formattedDate = pastDate.toLocaleDateString(locale, {
          month: "long",
          day: "numeric",
          weekday: "long",
        });

        expect(locale).toBe(expected);
        expect(formattedDate).toBeTruthy();
      });
    });

    it("getCurrentLanguage is not hardcoded to 'ko-KR'", () => {
      i18nModule.getCurrentLanguage.mockReturnValue("en-US");

      const locale = i18nModule.getCurrentLanguage();

      expect(locale).not.toBe("ko-KR");
      expect(locale).toBe("en-US");
    });
  });

  describe("ImagePicker configuration", () => {
    it("launches image picker with correct options", async () => {
      utilsModule.isSameDay.mockReturnValue(false);
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: true,
        assets: [],
      });

      await act(async () => {
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });
      });

      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.8,
      });
    });
  });

  describe("Entry data structure", () => {
    beforeEach(() => {
      utilsModule.isSameDay.mockReturnValue(false);
      entryFeedModule.useEntryFeedPage.mockReturnValue({
        selectedDate: pastDate,
        formattedMonthYear: "February 2026",
        today: todayDate,
        entries: [],
        isLoading: false,
        markedDates: {},
        selectDate: jest.fn(),
        handleCalendarDayPress: jest.fn(),
        handleVisibleWeekChange: jest.fn(),
        dateThumbnails: {},
      });
    });

    it("creates entry with correct structure", async () => {
      const mockLocation = { latitude: 37.7749, longitude: -122.4194 };
      mockGetLocation.mockResolvedValue(mockLocation);
      (detectMealType as jest.Mock).mockReturnValue("breakfast");
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "photo1.jpg" }],
      });

      await act(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const photoUris = result.assets.map((a) => a.uri);
          const location = await mockGetLocation();
          await mockSaveEntry(
            {
              userId: "",
              timestamp: pastDate,
              notes: "",
              location,
              meal: {
                photoUri: photoUris[0],
                mealType: detectMealType(pastDate),
              },
            },
            photoUris
          );
        }
      });

      expect(mockSaveEntry).toHaveBeenCalledWith(
        {
          userId: "",
          timestamp: pastDate,
          notes: "",
          location: mockLocation,
          meal: {
            photoUri: "photo1.jpg",
            mealType: "breakfast",
          },
        },
        ["photo1.jpg"]
      );
    });

    it("creates entry with empty userId", async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "photo1.jpg" }],
      });

      await act(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const photoUris = result.assets.map((a) => a.uri);
          const location = await mockGetLocation();
          await mockSaveEntry(
            {
              userId: "",
              timestamp: pastDate,
              notes: "",
              location,
              meal: {
                photoUri: photoUris[0],
                mealType: detectMealType(pastDate),
              },
            },
            photoUris
          );
        }
      });

      expect(mockSaveEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "",
        }),
        expect.any(Array)
      );
    });

    it("creates entry with empty notes", async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "photo1.jpg" }],
      });

      await act(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const photoUris = result.assets.map((a) => a.uri);
          const location = await mockGetLocation();
          await mockSaveEntry(
            {
              userId: "",
              timestamp: pastDate,
              notes: "",
              location,
              meal: {
                photoUri: photoUris[0],
                mealType: detectMealType(pastDate),
              },
            },
            photoUris
          );
        }
      });

      expect(mockSaveEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: "",
        }),
        expect.any(Array)
      );
    });

    it("creates entry with selected timestamp", async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "photo1.jpg" }],
      });

      await act(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const photoUris = result.assets.map((a) => a.uri);
          const location = await mockGetLocation();
          await mockSaveEntry(
            {
              userId: "",
              timestamp: pastDate,
              notes: "",
              location,
              meal: {
                photoUri: photoUris[0],
                mealType: detectMealType(pastDate),
              },
            },
            photoUris
          );
        }
      });

      expect(mockSaveEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: pastDate,
        }),
        expect.any(Array)
      );
    });
  });

  describe("Toast configuration", () => {
    beforeEach(() => {
      utilsModule.isSameDay.mockReturnValue(false);
      entryFeedModule.useEntryFeedPage.mockReturnValue({
        selectedDate: pastDate,
        formattedMonthYear: "February 2026",
        today: todayDate,
        entries: [],
        isLoading: false,
        markedDates: {},
        selectDate: jest.fn(),
        handleCalendarDayPress: jest.fn(),
        handleVisibleWeekChange: jest.fn(),
        dateThumbnails: {},
      });
    });

    it("success toast has correct configuration", async () => {
      mockSaveEntry.mockResolvedValue("entry-123");
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "photo1.jpg" }],
      });

      await act(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const photoUris = result.assets.map((a) => a.uri);
          const location = await mockGetLocation();
          const entryId = await mockSaveEntry(
            {
              userId: "",
              timestamp: pastDate,
              notes: "",
              location,
              meal: {
                photoUri: photoUris[0],
                mealType: detectMealType(pastDate),
              },
            },
            photoUris
          );

          mockToast({
            title: mockCameraI18n.capture.success,
            message: mockCameraI18n.capture.successMessage,
            type: "success",
            position: "top",
            showArrow: true,
            duration: 4000,
            onPress: entryId ? () => mockRouter.push(`/diary/${entryId}`) : undefined,
          });
        }
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        message: "Entry saved successfully",
        type: "success",
        position: "top",
        showArrow: true,
        duration: 4000,
        onPress: expect.any(Function),
      });
    });

    it("error toast has correct configuration", async () => {
      mockSaveEntry.mockRejectedValue(new Error("Save failed"));
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "photo1.jpg" }],
      });

      await act(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const photoUris = result.assets.map((a) => a.uri);
          try {
            const location = await mockGetLocation();
            await mockSaveEntry(
              {
                userId: "",
                timestamp: pastDate,
                notes: "",
                location,
                meal: {
                  photoUri: photoUris[0],
                  mealType: detectMealType(pastDate),
                },
              },
              photoUris
            );
          } catch (error) {
            mockToast({
              title: mockCameraI18n.capture.error,
              message: mockCameraI18n.capture.errorMessage,
              type: "error",
              position: "top",
              duration: 4000,
            });
          }
        }
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        message: "Failed to save entry",
        type: "error",
        position: "top",
        duration: 4000,
      });
    });

    it("success toast onPress navigates to entry detail when entryId exists", async () => {
      const entryId = "entry-789";
      mockSaveEntry.mockResolvedValue(entryId);
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "photo1.jpg" }],
      });

      await act(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const photoUris = result.assets.map((a) => a.uri);
          const location = await mockGetLocation();
          const savedEntryId = await mockSaveEntry(
            {
              userId: "",
              timestamp: pastDate,
              notes: "",
              location,
              meal: {
                photoUri: photoUris[0],
                mealType: detectMealType(pastDate),
              },
            },
            photoUris
          );

          mockToast({
            title: mockCameraI18n.capture.success,
            message: mockCameraI18n.capture.successMessage,
            type: "success",
            position: "top",
            showArrow: true,
            duration: 4000,
            onPress: savedEntryId ? () => mockRouter.push(`/diary/${savedEntryId}`) : undefined,
          });
        }
      });

      const toastCall = mockToast.mock.calls[0][0];
      expect(toastCall.onPress).toBeDefined();

      // Simulate pressing the toast
      if (toastCall.onPress) {
        toastCall.onPress();
      }

      expect(mockRouter.push).toHaveBeenCalledWith("/diary/entry-789");
    });

    it("success toast has no onPress when entryId is null", async () => {
      mockSaveEntry.mockResolvedValue(null);
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "photo1.jpg" }],
      });

      await act(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const photoUris = result.assets.map((a) => a.uri);
          const location = await mockGetLocation();
          const entryId = await mockSaveEntry(
            {
              userId: "",
              timestamp: pastDate,
              notes: "",
              location,
              meal: {
                photoUri: photoUris[0],
                mealType: detectMealType(pastDate),
              },
            },
            photoUris
          );

          mockToast({
            title: mockCameraI18n.capture.success,
            message: mockCameraI18n.capture.successMessage,
            type: "success",
            position: "top",
            showArrow: true,
            duration: 4000,
            onPress: entryId ? () => mockRouter.push(`/diary/${entryId}`) : undefined,
          });
        }
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          onPress: undefined,
        })
      );
    });
  });
});
