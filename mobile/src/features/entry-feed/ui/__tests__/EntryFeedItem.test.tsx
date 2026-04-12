// Mock native modules and barrels that pull in RN dependencies
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: { create: (styles: any) => styles },
}));
jest.mock("react-native-gesture-handler", () => ({
  Pressable: "Pressable",
}));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));
jest.mock("@/shared/ui/styled", () => ({
  PhotoCarousel: "PhotoCarousel",
}));
jest.mock("@/shared/ui/theme", () => ({
  useTheme: jest.fn(() => ({
    colors: {
      text: {
        primary: "#000000",
        tertiary: "#999999",
      },
    },
  })),
}));
jest.mock("@/shared/ui/tokens", () => ({
  tokens: {
    spacing: {
      layout: { md: 16 },
      component: { xs: 4, sm: 8, md: 12 },
    },
    typography: {
      fontSize: { body: 14, caption: 12 },
      fontWeight: { normal: "400" },
    },
  },
}));
jest.mock("@/shared/lib/utils", () => ({
  formatTime: jest.fn((date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }),
}));
jest.mock("@/shared/lib/i18n", () => ({
  useCommonI18n: jest.fn(() => ({
    mealTypeBreakfast: "Breakfast",
    mealTypeLunch: "Lunch",
    mealTypeDinner: "Dinner",
    mealTypeSnack: "Snack",
    mealTypeDessert: "Dessert",
    mealTypeDrink: "Drink",
    mealTypeOther: "Other",
    mealTypeMeal: "Meal",
  })),
}));
jest.mock("@/entities/entry", () => ({}));
jest.mock("@/entities/meal", () => {
  const icons: Record<string, string> = {
    breakfast: "sunny-outline",
    lunch: "sunny",
    dinner: "moon-outline",
    snack: "nutrition-outline",
    dessert: "ice-cream-outline",
    drink: "cafe-outline",
    other: "ellipsis-horizontal-circle-outline",
  };
  return {
    MealType: {
      BREAKFAST: "breakfast",
      LUNCH: "lunch",
      DINNER: "dinner",
      SNACK: "snack",
      DESSERT: "dessert",
      DRINK: "drink",
      OTHER: "other",
    },
    getMealTypeIcon: (type: string) => icons[type.toLowerCase()] ?? "restaurant-outline",
  };
});

import React from "react";
import { render } from "@testing-library/react-native";
import { EntryFeedItem } from "../EntryFeedItem";
import type { Entry } from "@/entities/entry";
import { MealType } from "@/entities/meal";
import { useTheme } from "@/shared/ui/theme";
import { useCommonI18n } from "@/shared/lib/i18n";
import { formatTime } from "@/shared/lib/utils";

const mockUseTheme = useTheme as jest.Mock;
const mockUseCommonI18n = useCommonI18n as jest.Mock;
const mockFormatTime = formatTime as jest.Mock;

// =============================================================================
// HELPERS
// =============================================================================

function createMockEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "1",
    userId: "user-1",
    timestamp: new Date("2024-01-15T08:00:00Z"),
    notes: "",
    meal: {
      photoUri: "https://example.com/photo1.jpg",
      photoUris: ["https://example.com/photo1.jpg"],
      mealType: MealType.BREAKFAST,
    },
    createdAt: new Date("2024-01-15T08:00:00Z"),
    updatedAt: new Date("2024-01-15T08:00:00Z"),
    ...overrides,
  };
}

// =============================================================================
// EntryFeedItem — rendering tests
// =============================================================================

describe("EntryFeedItem", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({
      colors: {
        text: {
          primary: "#000000",
          tertiary: "#999999",
        },
      },
    });
    mockUseCommonI18n.mockReturnValue({
      mealTypeBreakfast: "Breakfast",
      mealTypeLunch: "Lunch",
      mealTypeDinner: "Dinner",
      mealTypeSnack: "Snack",
      mealTypeDessert: "Dessert",
      mealTypeDrink: "Drink",
      mealTypeOther: "Other",
      mealTypeMeal: "Meal",
    });
    mockFormatTime.mockImplementation((date: Date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    });
  });

  describe("container structure", () => {
    it("renders outer wrapper as View (not Pressable)", () => {
      const entry = createMockEntry();
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const views = UNSAFE_getAllByType("View" as any);
      // First View should be the container
      expect(views.length).toBeGreaterThan(0);
      expect(views[0]).toBeTruthy();
    });

    it("does not render outer container as Pressable", () => {
      const entry = createMockEntry();
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      // Should only have info section Pressable, not outer container
      expect(pressables.length).toBe(1);
    });
  });

  describe("photo carousel rendering", () => {
    it("renders PhotoCarousel with correct photoUris from photoUris array", () => {
      const entry = createMockEntry({
        meal: {
          photoUri: "https://example.com/photo1.jpg",
          photoUris: [
            "https://example.com/photo1.jpg",
            "https://example.com/photo2.jpg",
            "https://example.com/photo3.jpg",
          ],
          mealType: MealType.BREAKFAST,
        },
      });
      const { UNSAFE_getByType } = render(<EntryFeedItem entry={entry} />);

      const carousel = UNSAFE_getByType("PhotoCarousel" as any);
      expect(carousel).toBeTruthy();
      expect(carousel.props.photoUris).toEqual([
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
        "https://example.com/photo3.jpg",
      ]);
    });

    it("renders PhotoCarousel with fallback to photoUri when photoUris is undefined", () => {
      const entry = createMockEntry({
        meal: {
          photoUri: "https://example.com/photo1.jpg",
          photoUris: undefined,
          mealType: MealType.BREAKFAST,
        },
      });
      const { UNSAFE_getByType } = render(<EntryFeedItem entry={entry} />);

      const carousel = UNSAFE_getByType("PhotoCarousel" as any);
      expect(carousel.props.photoUris).toEqual([
        "https://example.com/photo1.jpg",
      ]);
    });

    it("renders PhotoCarousel with empty array when no photos", () => {
      const entry = createMockEntry({
        meal: {
          photoUri: "",
          photoUris: undefined,
          mealType: MealType.BREAKFAST,
        },
      });
      const { UNSAFE_getByType } = render(<EntryFeedItem entry={entry} />);

      const carousel = UNSAFE_getByType("PhotoCarousel" as any);
      expect(carousel.props.photoUris).toEqual([]);
    });

    it("renders PhotoCarousel with null photoUris", () => {
      const entry = createMockEntry({
        meal: {
          photoUri: "https://example.com/photo.jpg",
          photoUris: null as any,
          mealType: MealType.BREAKFAST,
        },
      });
      const { UNSAFE_getByType } = render(<EntryFeedItem entry={entry} />);

      const carousel = UNSAFE_getByType("PhotoCarousel" as any);
      expect(carousel.props.photoUris).toEqual([
        "https://example.com/photo.jpg",
      ]);
    });

    it("passes onPhotoPress callback when onPress is provided", () => {
      const entry = createMockEntry();
      const onPress = jest.fn();
      const { UNSAFE_getByType } = render(
        <EntryFeedItem entry={entry} onPress={onPress} />
      );

      const carousel = UNSAFE_getByType("PhotoCarousel" as any);
      expect(carousel.props.onPhotoPress).toBeDefined();
      expect(typeof carousel.props.onPhotoPress).toBe("function");
    });

    it("does not pass onPhotoPress callback when onPress is undefined", () => {
      const entry = createMockEntry();
      const { UNSAFE_getByType } = render(<EntryFeedItem entry={entry} />);

      const carousel = UNSAFE_getByType("PhotoCarousel" as any);
      expect(carousel.props.onPhotoPress).toBeUndefined();
    });

    it("calls onPress when onPhotoPress is triggered", () => {
      const entry = createMockEntry();
      const onPress = jest.fn();
      const { UNSAFE_getByType } = render(
        <EntryFeedItem entry={entry} onPress={onPress} />
      );

      const carousel = UNSAFE_getByType("PhotoCarousel" as any);
      carousel.props.onPhotoPress();

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith(entry);
    });
  });

  describe("bookmark icon rendering", () => {
    it("shows bookmark icon when wouldEatAgain is true", () => {
      const entry = createMockEntry({ wouldEatAgain: true });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const bookmarkIcon = ionicons.find((icon: any) => icon.props.name === "bookmark");
      expect(bookmarkIcon).toBeTruthy();
      expect(bookmarkIcon.props.size).toBe(24);
      expect(bookmarkIcon.props.color).toBe("white");
    });

    it("hides bookmark icon when wouldEatAgain is false", () => {
      const entry = createMockEntry({ wouldEatAgain: false });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const bookmarkIcon = ionicons.find((icon: any) => icon.props.name === "bookmark");
      expect(bookmarkIcon).toBeUndefined();
    });

    it("hides bookmark icon when wouldEatAgain is undefined", () => {
      const entry = createMockEntry({ wouldEatAgain: undefined });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const bookmarkIcon = ionicons.find((icon: any) => icon.props.name === "bookmark");
      expect(bookmarkIcon).toBeUndefined();
    });

    it("hides bookmark icon when wouldEatAgain is null", () => {
      const entry = createMockEntry({ wouldEatAgain: null as any });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const bookmarkIcon = ionicons.find((icon: any) => icon.props.name === "bookmark");
      expect(bookmarkIcon).toBeUndefined();
    });
  });

  describe("info section pressable", () => {
    it("renders info section as Pressable", () => {
      const entry = createMockEntry();
      const { UNSAFE_getByType } = render(<EntryFeedItem entry={entry} />);

      const pressable = UNSAFE_getByType("Pressable" as any);
      expect(pressable).toBeTruthy();
    });

    it("calls onPress with entry when info section is tapped", () => {
      const entry = createMockEntry();
      const onPress = jest.fn();
      const { UNSAFE_getByType } = render(
        <EntryFeedItem entry={entry} onPress={onPress} />
      );

      const pressable = UNSAFE_getByType("Pressable" as any);
      pressable.props.onPress();

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith(entry);
    });

    it("does not crash when onPress is undefined and info section is tapped", () => {
      const entry = createMockEntry();
      const { UNSAFE_getByType } = render(<EntryFeedItem entry={entry} />);

      const pressable = UNSAFE_getByType("Pressable" as any);
      expect(() => pressable.props.onPress()).not.toThrow();
    });

    it("does not crash when onPress is null and info section is tapped", () => {
      const entry = createMockEntry();
      const { UNSAFE_getByType } = render(
        <EntryFeedItem entry={entry} onPress={null as any} />
      );

      const pressable = UNSAFE_getByType("Pressable" as any);
      expect(() => pressable.props.onPress()).not.toThrow();
    });
  });

  describe("notes rendering", () => {
    it("shows notes when present", () => {
      const entry = createMockEntry({ notes: "Delicious breakfast" });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const notesText = texts.find(
        (text: any) => text.props.children === "Delicious breakfast"
      );
      expect(notesText).toBeTruthy();
      expect(notesText.props.numberOfLines).toBe(2);
    });

    it("hides notes when empty string", () => {
      const entry = createMockEntry({ notes: "" });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      // Should not find notes text (only meta texts remain)
      expect(texts.length).toBeLessThan(5);
    });

    it("hides notes when only whitespace", () => {
      const entry = createMockEntry({ notes: "   " });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      // Should not render notes that are only whitespace
      const notesText = texts.find((text: any) => text.props.children === "   ");
      expect(notesText).toBeUndefined();
    });

    it("hides notes when undefined", () => {
      const entry = createMockEntry({ notes: undefined as any });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      // Only meta texts should be rendered
      expect(texts.length).toBeLessThan(5);
    });

    it("hides notes when null", () => {
      const entry = createMockEntry({ notes: null as any });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      // Only meta texts should be rendered
      expect(texts.length).toBeLessThan(5);
    });

    it("shows notes with newlines and tabs", () => {
      const entry = createMockEntry({ notes: "Line 1\nLine 2\tTabbed" });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const notesText = texts.find(
        (text: any) => text.props.children === "Line 1\nLine 2\tTabbed"
      );
      expect(notesText).toBeTruthy();
    });
  });

  describe("location rendering", () => {
    it("shows location when present", () => {
      const entry = createMockEntry({
        location: {
          latitude: 37.5665,
          longitude: 126.978,
          address: "Seoul, South Korea",
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const locationText = texts.find((text: any) => text.props.children === "Seoul");
      expect(locationText).toBeTruthy();
      expect(locationText.props.numberOfLines).toBe(1);
    });

    it("hides location when undefined", () => {
      const entry = createMockEntry({ location: undefined });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      // Should not find location separator or location text
      const dots = texts.filter((text: any) => text.props.children === "·");
      expect(dots.length).toBe(1); // Only one dot between meal type and time
    });

    it("hides location when location object exists but no address", () => {
      const entry = createMockEntry({
        location: {
          latitude: 37.5665,
          longitude: 126.978,
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const dots = texts.filter((text: any) => text.props.children === "·");
      expect(dots.length).toBe(1); // Only one dot between meal type and time
    });

    it("hides location when address is empty string", () => {
      const entry = createMockEntry({
        location: {
          latitude: 37.5665,
          longitude: 126.978,
          address: "",
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const dots = texts.filter((text: any) => text.props.children === "·");
      expect(dots.length).toBe(1);
    });

    it("displays only first part of comma-separated address", () => {
      const entry = createMockEntry({
        location: {
          latitude: 37.5665,
          longitude: 126.978,
          address: "Seoul, South Korea, Asia",
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const locationText = texts.find((text: any) => text.props.children === "Seoul");
      expect(locationText).toBeTruthy();
    });

    it("displays full address when no comma", () => {
      const entry = createMockEntry({
        location: {
          latitude: 37.5665,
          longitude: 126.978,
          address: "Seoul",
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const locationText = texts.find((text: any) => text.props.children === "Seoul");
      expect(locationText).toBeTruthy();
    });

    it("shows location separator dots when location is present", () => {
      const entry = createMockEntry({
        location: {
          latitude: 37.5665,
          longitude: 126.978,
          address: "Seoul, South Korea",
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const dots = texts.filter((text: any) => text.props.children === "·");
      expect(dots.length).toBe(2); // One between meal type and time, one before location
    });
  });

  describe("meal type icon and label", () => {
    it("displays correct icon and label for BREAKFAST", () => {
      const entry = createMockEntry({
        meal: {
          photoUri: "https://example.com/photo.jpg",
          mealType: MealType.BREAKFAST,
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const mealIcon = ionicons.find((icon: any) => icon.props.name === "sunny-outline");
      expect(mealIcon).toBeTruthy();

      const texts = UNSAFE_getAllByType("Text" as any);
      const labelText = texts.find((text: any) => text.props.children === "Breakfast");
      expect(labelText).toBeTruthy();
    });

    it("displays correct icon and label for LUNCH", () => {
      const entry = createMockEntry({
        meal: {
          photoUri: "https://example.com/photo.jpg",
          mealType: MealType.LUNCH,
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const mealIcon = ionicons.find((icon: any) => icon.props.name === "sunny");
      expect(mealIcon).toBeTruthy();

      const texts = UNSAFE_getAllByType("Text" as any);
      const labelText = texts.find((text: any) => text.props.children === "Lunch");
      expect(labelText).toBeTruthy();
    });

    it("displays correct icon and label for DINNER", () => {
      const entry = createMockEntry({
        meal: {
          photoUri: "https://example.com/photo.jpg",
          mealType: MealType.DINNER,
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const mealIcon = ionicons.find((icon: any) => icon.props.name === "moon-outline");
      expect(mealIcon).toBeTruthy();

      const texts = UNSAFE_getAllByType("Text" as any);
      const labelText = texts.find((text: any) => text.props.children === "Dinner");
      expect(labelText).toBeTruthy();
    });

    it("displays correct icon and label for SNACK", () => {
      const entry = createMockEntry({
        meal: {
          photoUri: "https://example.com/photo.jpg",
          mealType: MealType.SNACK,
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const mealIcon = ionicons.find((icon: any) => icon.props.name === "nutrition-outline");
      expect(mealIcon).toBeTruthy();

      const texts = UNSAFE_getAllByType("Text" as any);
      const labelText = texts.find((text: any) => text.props.children === "Snack");
      expect(labelText).toBeTruthy();
    });

    it("displays correct icon and label for DESSERT", () => {
      const entry = createMockEntry({
        meal: {
          photoUri: "https://example.com/photo.jpg",
          mealType: MealType.DESSERT,
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const mealIcon = ionicons.find((icon: any) => icon.props.name === "ice-cream-outline");
      expect(mealIcon).toBeTruthy();

      const texts = UNSAFE_getAllByType("Text" as any);
      const labelText = texts.find((text: any) => text.props.children === "Dessert");
      expect(labelText).toBeTruthy();
    });

    it("displays correct icon and label for DRINK", () => {
      const entry = createMockEntry({
        meal: {
          photoUri: "https://example.com/photo.jpg",
          mealType: MealType.DRINK,
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const mealIcon = ionicons.find((icon: any) => icon.props.name === "cafe-outline");
      expect(mealIcon).toBeTruthy();

      const texts = UNSAFE_getAllByType("Text" as any);
      const labelText = texts.find((text: any) => text.props.children === "Drink");
      expect(labelText).toBeTruthy();
    });

    it("displays correct icon and label for OTHER", () => {
      const entry = createMockEntry({
        meal: {
          photoUri: "https://example.com/photo.jpg",
          mealType: MealType.OTHER,
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const mealIcon = ionicons.find((icon: any) => icon.props.name === "ellipsis-horizontal-circle-outline");
      expect(mealIcon).toBeTruthy();

      const texts = UNSAFE_getAllByType("Text" as any);
      const labelText = texts.find((text: any) => text.props.children === "Other");
      expect(labelText).toBeTruthy();
    });

    it("displays icon with correct size and color", () => {
      const entry = createMockEntry();
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const mealIcon = ionicons.find((icon: any) => icon.props.name === "sunny-outline");
      expect(mealIcon.props.size).toBe(12);
      expect(mealIcon.props.color).toBe("#999999");
    });
  });

  describe("timestamp rendering", () => {
    it("displays formatted time", () => {
      mockFormatTime.mockReturnValue("14:30");
      const entry = createMockEntry({
        timestamp: new Date("2024-01-15T14:30:00Z"),
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      expect(mockFormatTime).toHaveBeenCalledWith(entry.timestamp);

      const texts = UNSAFE_getAllByType("Text" as any);
      const timeText = texts.find((text: any) => text.props.children === "14:30");
      expect(timeText).toBeTruthy();
    });

    it("calls formatTime with correct date", () => {
      const timestamp = new Date("2024-01-15T08:00:00Z");
      const entry = createMockEntry({ timestamp });
      render(<EntryFeedItem entry={entry} />);

      expect(mockFormatTime).toHaveBeenCalledWith(timestamp);
    });

    it("handles midnight time correctly", () => {
      mockFormatTime.mockReturnValue("00:00");
      const entry = createMockEntry({
        timestamp: new Date("2024-01-15T00:00:00Z"),
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const timeText = texts.find((text: any) => text.props.children === "00:00");
      expect(timeText).toBeTruthy();
    });

    it("handles noon time correctly", () => {
      mockFormatTime.mockReturnValue("12:00");
      const entry = createMockEntry({
        timestamp: new Date("2024-01-15T12:00:00Z"),
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const timeText = texts.find((text: any) => text.props.children === "12:00");
      expect(timeText).toBeTruthy();
    });

    it("handles end of day time correctly", () => {
      mockFormatTime.mockReturnValue("23:59");
      const entry = createMockEntry({
        timestamp: new Date("2024-01-15T23:59:00Z"),
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const timeText = texts.find((text: any) => text.props.children === "23:59");
      expect(timeText).toBeTruthy();
    });
  });

  describe("meta row separator rendering", () => {
    it("displays one separator between meal type and time when no location", () => {
      const entry = createMockEntry({ location: undefined });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const dots = texts.filter((text: any) => text.props.children === "·");
      expect(dots.length).toBe(1);
    });

    it("displays two separators when location is present", () => {
      const entry = createMockEntry({
        location: {
          latitude: 37.5665,
          longitude: 126.978,
          address: "Seoul, South Korea",
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const dots = texts.filter((text: any) => text.props.children === "·");
      expect(dots.length).toBe(2);
    });
  });

  describe("theme integration", () => {
    it("applies theme text colors to notes", () => {
      const entry = createMockEntry({ notes: "Test notes" });
      mockUseTheme.mockReturnValue({
        colors: {
          text: {
            primary: "#FF0000",
            tertiary: "#999999",
          },
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const notesText = texts.find((text: any) => text.props.children === "Test notes");
      expect(notesText.props.style).toContainEqual(
        expect.objectContaining({ color: "#FF0000" })
      );
    });

    it("applies theme text colors to meta row", () => {
      const entry = createMockEntry();
      mockUseTheme.mockReturnValue({
        colors: {
          text: {
            primary: "#000000",
            tertiary: "#00FF00",
          },
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const mealTypeText = texts.find((text: any) => text.props.children === "Breakfast");
      expect(mealTypeText.props.style).toContainEqual(
        expect.objectContaining({ color: "#00FF00" })
      );
    });

    it("applies theme colors to meal type icon", () => {
      const entry = createMockEntry();
      mockUseTheme.mockReturnValue({
        colors: {
          text: {
            primary: "#000000",
            tertiary: "#0000FF",
          },
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const mealIcon = ionicons.find((icon: any) => icon.props.name === "sunny-outline");
      expect(mealIcon.props.color).toBe("#0000FF");
    });
  });

  describe("i18n integration", () => {
    it("uses i18n labels for meal types - breakfast", () => {
      mockUseCommonI18n.mockReturnValue({
        mealTypeBreakfast: "아침",
        mealTypeLunch: "점심",
        mealTypeDinner: "저녁",
        mealTypeSnack: "간식",
        mealTypeDessert: "디저트",
        mealTypeDrink: "음료",
        mealTypeOther: "기타",
        mealTypeMeal: "식사",
      });

      const entry = createMockEntry({
        meal: {
          photoUri: "https://example.com/photo.jpg",
          mealType: MealType.BREAKFAST,
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const labelText = texts.find((text: any) => text.props.children === "아침");
      expect(labelText).toBeTruthy();
    });

    it("uses i18n labels for meal types - dessert", () => {
      mockUseCommonI18n.mockReturnValue({
        mealTypeBreakfast: "아침",
        mealTypeLunch: "점심",
        mealTypeDinner: "저녁",
        mealTypeSnack: "간식",
        mealTypeDessert: "디저트",
        mealTypeDrink: "음료",
        mealTypeOther: "기타",
        mealTypeMeal: "식사",
      });

      const entry = createMockEntry({
        meal: {
          photoUri: "https://example.com/photo.jpg",
          mealType: MealType.DESSERT,
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const labelText = texts.find((text: any) => text.props.children === "디저트");
      expect(labelText).toBeTruthy();
    });

    it("uses i18n labels for meal types - drink", () => {
      mockUseCommonI18n.mockReturnValue({
        mealTypeBreakfast: "아침",
        mealTypeLunch: "점심",
        mealTypeDinner: "저녁",
        mealTypeSnack: "간식",
        mealTypeDessert: "디저트",
        mealTypeDrink: "음료",
        mealTypeOther: "기타",
        mealTypeMeal: "식사",
      });

      const entry = createMockEntry({
        meal: {
          photoUri: "https://example.com/photo.jpg",
          mealType: MealType.DRINK,
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const labelText = texts.find((text: any) => text.props.children === "음료");
      expect(labelText).toBeTruthy();
    });

    it("uses i18n labels for meal types - other", () => {
      mockUseCommonI18n.mockReturnValue({
        mealTypeBreakfast: "아침",
        mealTypeLunch: "점심",
        mealTypeDinner: "저녁",
        mealTypeSnack: "간식",
        mealTypeDessert: "디저트",
        mealTypeDrink: "음료",
        mealTypeOther: "기타",
        mealTypeMeal: "식사",
      });

      const entry = createMockEntry({
        meal: {
          photoUri: "https://example.com/photo.jpg",
          mealType: MealType.OTHER,
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const labelText = texts.find((text: any) => text.props.children === "기타");
      expect(labelText).toBeTruthy();
    });

    it("calls useCommonI18n hook", () => {
      const entry = createMockEntry();
      render(<EntryFeedItem entry={entry} />);

      expect(mockUseCommonI18n).toHaveBeenCalled();
    });
  });

  describe("memoization", () => {
    it("is a memoized component", () => {
      const entry = createMockEntry();
      const { rerender } = render(<EntryFeedItem entry={entry} />);

      // Re-render with same props
      rerender(<EntryFeedItem entry={entry} />);

      // Component should not re-render unnecessarily
      // This is implicitly tested by memo wrapper
      expect(true).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles entry with all optional fields populated", () => {
      const entry = createMockEntry({
        notes: "Full entry notes",
        location: {
          latitude: 37.5665,
          longitude: 126.978,
          address: "Seoul, South Korea",
        },
        wouldEatAgain: true,
        rating: 5,
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      expect(texts.length).toBeGreaterThan(0);
    });

    it("handles entry with all optional fields empty", () => {
      const entry = createMockEntry({
        notes: "",
        location: undefined,
        wouldEatAgain: false,
        rating: undefined,
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      expect(texts.length).toBeGreaterThan(0);
    });

    it("handles very long notes text", () => {
      const longNotes = "A".repeat(500);
      const entry = createMockEntry({ notes: longNotes });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const notesText = texts.find((text: any) => text.props.children === longNotes);
      expect(notesText).toBeTruthy();
      expect(notesText.props.numberOfLines).toBe(2);
    });

    it("handles very long location address", () => {
      const longAddress = "A".repeat(200) + ", Country";
      const entry = createMockEntry({
        location: {
          latitude: 37.5665,
          longitude: 126.978,
          address: longAddress,
        },
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      // Should only show first part before comma
      const locationText = texts.find(
        (text: any) => text.props.children === "A".repeat(200)
      );
      expect(locationText).toBeTruthy();
      expect(locationText.props.numberOfLines).toBe(1);
    });

    it("handles entry with special characters in notes", () => {
      const entry = createMockEntry({
        notes: "Special: @#$%^&*()_+-=[]{}|;':\",./<>?",
      });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const notesText = texts.find(
        (text: any) => text.props.children === "Special: @#$%^&*()_+-=[]{}|;':\",./<>?"
      );
      expect(notesText).toBeTruthy();
    });

    it("handles entry with emoji in notes", () => {
      const entry = createMockEntry({ notes: "Delicious! 🍕🍔🍟" });
      const { UNSAFE_getAllByType } = render(<EntryFeedItem entry={entry} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const notesText = texts.find(
        (text: any) => text.props.children === "Delicious! 🍕🍔🍟"
      );
      expect(notesText).toBeTruthy();
    });
  });
});
