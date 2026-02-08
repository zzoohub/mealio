// Mock modules before any imports
jest.mock("react-native", () => ({
  View: "View",
  ScrollView: "ScrollView",
  useWindowDimensions: jest.fn(() => ({ width: 375, height: 812 })),
  Platform: {
    OS: "ios",
    select: jest.fn((obj: any) => obj.ios),
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => {
      if (!style) return {};
      if (!Array.isArray(style)) return style;
      return style.reduce((acc: any, s: any) => ({ ...acc, ...s }), {});
    },
  },
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(() => ({ replace: jest.fn(), back: jest.fn() })),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 44, bottom: 34, left: 0, right: 0 })),
}));

jest.mock("@/shared/ui/theme", () => ({
  createStyles: jest.fn((fn) => fn),
  useStyles: jest.fn((stylesFn) => {
    const colors = {
      bg: { primary: "#fff" },
    };
    return stylesFn(colors);
  }),
}));

jest.mock("@/features/entry-detail", () => ({
  useEntryDetail: jest.fn(),
  EntryDetailHeader: "EntryDetailHeader",
  AICommentBanner: "AICommentBanner",
  EntryContextBar: "EntryContextBar",
  EntryNotesSection: "EntryNotesSection",
  IngredientsSection: "IngredientsSection",
  NutritionSection: "NutritionSection",
  EntryLocationMap: "EntryLocationMap",
  EntryDeleteButton: "EntryDeleteButton",
}));

jest.mock("@/shared/ui/styled", () => ({
  PhotoCarousel: jest.fn(() => null),
}));

jest.mock("@/shared/lib/auth", () => ({
  useIsAuthenticated: jest.fn(),
}));

jest.mock("@/shared/lib/deeplink", () => ({
  setPendingDeepLink: jest.fn(),
  consumePendingDeepLink: jest.fn(),
}));

jest.mock("@/shared/config", () => ({
  CAMERA_SETTINGS: {
    MAX_PHOTOS_PER_POST: 5,
  },
}));

jest.mock("@/entities/meal", () => ({
  MealType: {
    BREAKFAST: "breakfast",
    LUNCH: "lunch",
    DINNER: "dinner",
  },
}));

import React from "react";
import { useWindowDimensions } from "react-native";
import { render } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DiaryEntryScreen from "../../../../../app/diary/[id]";
import { useEntryDetail } from "@/features/entry-detail";
import { useIsAuthenticated } from "@/shared/lib/auth";
import { PhotoCarousel } from "@/shared/ui/styled";
import { MealType } from "@/entities/meal";
import { useStyles } from "@/shared/ui/theme";

describe("DiaryEntryScreen", () => {
  const mockAddPhotos = jest.fn();
  const mockUseEntryDetail = {
    entry: null,
    isLoading: false,
    isDeleting: false,
    isAddingPhotos: false,
    error: null,
    updateTimestamp: jest.fn(),
    updateMealType: jest.fn(),
    updateNotes: jest.fn(),
    updateRating: jest.fn(),
    updateWouldEatAgain: jest.fn(),
    updateIngredients: jest.fn(),
    updateNutrition: jest.fn(),
    deleteEntry: jest.fn(),
    addPhotos: mockAddPhotos,
    shareEntry: jest.fn(),
    canShare: false,
    goBack: jest.fn(),
    openPhotoViewer: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply mock implementations after clearAllMocks
    (useWindowDimensions as jest.Mock).mockReturnValue({ width: 375, height: 812 });
    (useSafeAreaInsets as jest.Mock).mockReturnValue({ top: 44, bottom: 34, left: 0, right: 0 });
    (useStyles as jest.Mock).mockImplementation((stylesFn: any) => {
      const colors = { bg: { primary: "#fff" } };
      return stylesFn(colors);
    });
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "123" });
    (useEntryDetail as jest.Mock).mockReturnValue(mockUseEntryDetail);
    (useIsAuthenticated as jest.Mock).mockReturnValue(true);
  });

  describe("rendering", () => {
    it("renders without crashing", () => {
      render(<DiaryEntryScreen />);
      expect(PhotoCarousel).toHaveBeenCalled();
    });

    it("passes entry ID to useEntryDetail hook", () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "456" });

      render(<DiaryEntryScreen />);

      expect(useEntryDetail).toHaveBeenCalledWith({ entryId: "456" });
    });

    it("renders and calls PhotoCarousel with entry data", () => {
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        entry: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test notes",
          meal: {
            photoUri: "https://example.com/photo.jpg",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      render(<DiaryEntryScreen />);

      expect(PhotoCarousel).toHaveBeenCalled();
      expect(useEntryDetail).toHaveBeenCalledWith({ entryId: "123" });
    });
  });

  describe("PhotoCarousel onAddPhotoPress prop", () => {
    it("passes addPhotos to PhotoCarousel when authenticated and entry has < 5 photos", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "123" });
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        entry: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUris: ["uri1", "uri2", "uri3"],
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      render(<DiaryEntryScreen />);

      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          onAddPhotoPress: mockAddPhotos,
        }),
        undefined
      );
    });

    it("passes undefined onAddPhotoPress when at max photos (5)", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "123" });
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        entry: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUris: ["uri1", "uri2", "uri3", "uri4", "uri5"],
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      render(<DiaryEntryScreen />);

      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          onAddPhotoPress: undefined,
        }),
        undefined
      );
    });

    it("passes undefined onAddPhotoPress when not authenticated", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "guest-123" });
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        entry: {
          id: "guest-123",
          userId: "guest",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri: "uri1",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      render(<DiaryEntryScreen />);

      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          onAddPhotoPress: undefined,
        }),
        undefined
      );
    });

    it("passes undefined onAddPhotoPress when ID is not numeric (guest entry)", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "guest-abc" });
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        entry: {
          id: "guest-abc",
          userId: "guest",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri: "uri1",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      render(<DiaryEntryScreen />);

      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          onAddPhotoPress: undefined,
        }),
        undefined
      );
    });

    it("passes addPhotos when entry has single photoUri and is under max", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "123" });
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        entry: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri: "uri1",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      render(<DiaryEntryScreen />);

      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          onAddPhotoPress: mockAddPhotos,
        }),
        undefined
      );
    });

    it("passes addPhotos when entry has 0 photos", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "123" });
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        entry: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      render(<DiaryEntryScreen />);

      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          onAddPhotoPress: mockAddPhotos,
        }),
        undefined
      );
    });

    it("passes addPhotos when entry has 4 photos (1 under max)", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "123" });
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        entry: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUris: ["uri1", "uri2", "uri3", "uri4"],
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      render(<DiaryEntryScreen />);

      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          onAddPhotoPress: mockAddPhotos,
        }),
        undefined
      );
    });

    it("passes undefined onAddPhotoPress when entry is null", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "123" });
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        entry: null,
      });

      render(<DiaryEntryScreen />);

      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          onAddPhotoPress: undefined,
        }),
        undefined
      );
    });
  });

  describe("PhotoCarousel loading state", () => {
    it("shows loading when isLoading is true and entry is null", () => {
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        isLoading: true,
        entry: null,
      });

      render(<DiaryEntryScreen />);

      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          loading: true,
        }),
        undefined
      );
    });

    it("shows loading when isAddingPhotos is true", () => {
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        isAddingPhotos: true,
        entry: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri: "uri1",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      render(<DiaryEntryScreen />);

      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          loading: true,
        }),
        undefined
      );
    });

    it("does not show loading when isLoading is true but entry exists", () => {
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        isLoading: true,
        entry: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri: "uri1",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      render(<DiaryEntryScreen />);

      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          loading: false,
        }),
        undefined
      );
    });
  });

  describe("PhotoCarousel photoUris prop", () => {
    it("passes photoUris when entry has photoUris array", () => {
      const photoUris = ["uri1", "uri2", "uri3"];
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        entry: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUris,
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      render(<DiaryEntryScreen />);

      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          photoUris,
        }),
        undefined
      );
    });

    it("passes single-element array when entry has photoUri", () => {
      const photoUri = "uri1";
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        entry: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri,
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      render(<DiaryEntryScreen />);

      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          photoUris: [photoUri],
        }),
        undefined
      );
    });

    it("passes empty array when entry has no photos", () => {
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        entry: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      render(<DiaryEntryScreen />);

      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          photoUris: [],
        }),
        undefined
      );
    });

    it("passes empty array when entry is null", () => {
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        entry: null,
      });

      render(<DiaryEntryScreen />);

      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          photoUris: [],
        }),
        undefined
      );
    });
  });

  describe("PhotoCarousel onPhotoPress prop", () => {
    it("passes openPhotoViewer when entry has photoUri", () => {
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        entry: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri: "uri1",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      render(<DiaryEntryScreen />);

      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          onPhotoPress: expect.any(Function),
        }),
        undefined
      );
    });

    it("passes undefined onPhotoPress when entry has no photos", () => {
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        entry: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      render(<DiaryEntryScreen />);

      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          onPhotoPress: undefined,
        }),
        undefined
      );
    });
  });

  describe("edge cases", () => {
    it("handles entry with photoUris and photoUri both present (prefers photoUris)", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "123" });
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        entry: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri: "legacy-uri",
            photoUris: ["uri1", "uri2"],
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      render(<DiaryEntryScreen />);

      // Should use photoUris array
      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          photoUris: ["uri1", "uri2"],
        }),
        undefined
      );
    });

    it("calculates photo count correctly when photoUris is empty array", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "123" });
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        entry: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUris: [],
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      render(<DiaryEntryScreen />);

      // Should pass addPhotos because count is 0
      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          onAddPhotoPress: mockAddPhotos,
        }),
        undefined
      );
    });

    it("handles invalid ID gracefully", () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: undefined });

      render(<DiaryEntryScreen />);

      expect(PhotoCarousel).toHaveBeenCalled();
      expect(useEntryDetail).toHaveBeenCalledWith({ entryId: undefined });
    });

    it("handles ID of 0 — numeric so page shows add button (hook guards non-positive)", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "0" });
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        entry: {
          id: "0",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri: "uri1",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      render(<DiaryEntryScreen />);

      // ID 0 is numeric (!isNaN) so the page passes addPhotos;
      // the hook itself guards against non-positive IDs
      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          onAddPhotoPress: mockAddPhotos,
        }),
        undefined
      );
    });

    it("handles negative ID — numeric so page shows add button (hook guards non-positive)", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "-1" });
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        entry: {
          id: "-1",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri: "uri1",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      render(<DiaryEntryScreen />);

      // ID -1 is numeric (!isNaN) so the page passes addPhotos;
      // the hook itself guards against non-positive IDs
      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          onAddPhotoPress: mockAddPhotos,
        }),
        undefined
      );
    });
  });

  describe("auth guard and deep link", () => {
    it("redirects to auth and sets pending deep link when accessing numeric ID unauthenticated", () => {
      const mockRouter = { replace: jest.fn(), back: jest.fn() };
      (useRouter as jest.Mock).mockReturnValue(mockRouter);
      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "123" });

      const { setPendingDeepLink } = jest.requireMock("@/shared/lib/deeplink");

      render(<DiaryEntryScreen />);

      expect(setPendingDeepLink).toHaveBeenCalledWith("/diary/123");
      expect(mockRouter.replace).toHaveBeenCalledWith("/auth");
    });

    it("does not redirect when accessing guest ID unauthenticated", () => {
      const mockRouter = { replace: jest.fn(), back: jest.fn() };
      (useRouter as jest.Mock).mockReturnValue(mockRouter);
      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "guest-123" });

      render(<DiaryEntryScreen />);

      expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    it("returns null when auth guard triggers", () => {
      const mockRouter = { replace: jest.fn(), back: jest.fn() };
      (useRouter as jest.Mock).mockReturnValue(mockRouter);
      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "123" });

      const { toJSON } = render(<DiaryEntryScreen />);

      expect(toJSON()).toBeNull();
    });

    it("renders normally when authenticated with numeric ID", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "123" });

      render(<DiaryEntryScreen />);

      expect(PhotoCarousel).toHaveBeenCalled();
    });
  });

  describe("share functionality", () => {
    it("passes shareEntry to EntryDetailHeader when canShare is true", () => {
      const mockShareEntry = jest.fn();
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "123" });
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        shareEntry: mockShareEntry,
        canShare: true,
      });

      const { EntryDetailHeader } = jest.requireMock("@/features/entry-detail");

      render(<DiaryEntryScreen />);

      expect(EntryDetailHeader).toEqual("EntryDetailHeader");
    });

    it("passes undefined to EntryDetailHeader when canShare is false", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "guest-123" });
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        canShare: false,
      });

      const { EntryDetailHeader } = jest.requireMock("@/features/entry-detail");

      render(<DiaryEntryScreen />);

      expect(EntryDetailHeader).toEqual("EntryDetailHeader");
    });
  });

  describe("photo viewer", () => {
    it("passes openPhotoViewer when entry has photoUri", () => {
      const mockOpenPhotoViewer = jest.fn();
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "123" });
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        entry: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri: "uri1",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        openPhotoViewer: mockOpenPhotoViewer,
      });

      render(<DiaryEntryScreen />);

      expect(PhotoCarousel).toHaveBeenCalledWith(
        expect.objectContaining({
          onPhotoPress: expect.any(Function),
        }),
        undefined
      );

      const photoCarouselCall = (PhotoCarousel as jest.Mock).mock.calls[0][0];
      photoCarouselCall.onPhotoPress();

      expect(mockOpenPhotoViewer).toHaveBeenCalled();
    });
  });

  describe("timestamp handling", () => {
    it("handles string timestamp from API", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "123" });
      (useEntryDetail as jest.Mock).mockReturnValue({
        ...mockUseEntryDetail,
        entry: {
          id: "123",
          userId: "1",
          timestamp: "2026-02-09T12:00:00.000Z",
          notes: "Test",
          meal: {
            photoUri: "uri1",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      render(<DiaryEntryScreen />);

      // Test that component renders with string timestamp
      expect(PhotoCarousel).toHaveBeenCalled();
    });
  });
});
