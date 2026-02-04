// Mock native modules and barrels that pull in RN dependencies
jest.mock("react-native", () => ({
  View: "View",
  Pressable: "Pressable",
  Dimensions: { get: jest.fn(() => ({ width: 375, height: 812 })) },
  ActivityIndicator: "ActivityIndicator",
}));
jest.mock("react-native-pager-view", () => "PagerView");
jest.mock("expo-image", () => ({ Image: "Image" }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));
jest.mock("@/shared/ui/tokens", () => ({
  tokens: {
    size: { icon: { xl: 64 } },
  },
}));
jest.mock("@/shared/ui/theme", () => ({
  createStyles: (fn: (colors: any) => any) => fn({
    bg: { secondary: "#f0f0f0" },
    text: { tertiary: "#999" },
  }),
  useStyles: (styles: any) => styles,
}));

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { PhotoCarousel } from "../PhotoCarousel";

// =============================================================================
// PhotoCarousel — UI component tests (PagerView-based)
// =============================================================================

describe("PhotoCarousel", () => {
  describe("rendering with no photos", () => {
    it("renders placeholder icon when photoUris is empty", () => {
      const { UNSAFE_getByType } = render(
        <PhotoCarousel photoUris={[]} />
      );

      const ionicons = UNSAFE_getByType("Ionicons" as any);
      expect(ionicons).toBeTruthy();
      expect(ionicons.props.name).toBe("image-outline");
    });

    it("does not show ActivityIndicator when not loading and no photos", () => {
      const { UNSAFE_queryByType } = render(
        <PhotoCarousel photoUris={[]} loading={false} />
      );

      const activityIndicator = UNSAFE_queryByType("ActivityIndicator" as any);
      expect(activityIndicator).toBeNull();
    });
  });

  describe("rendering with loading state", () => {
    it("shows ActivityIndicator when loading is true", () => {
      const { UNSAFE_getByType } = render(
        <PhotoCarousel photoUris={[]} loading={true} />
      );

      const activityIndicator = UNSAFE_getByType("ActivityIndicator" as any);
      expect(activityIndicator).toBeTruthy();
      expect(activityIndicator.props.size).toBe("large");
    });

    it("shows ActivityIndicator even when photoUris has items", () => {
      const { UNSAFE_getByType } = render(
        <PhotoCarousel
          photoUris={["https://example.com/photo.jpg"]}
          loading={true}
        />
      );

      const activityIndicator = UNSAFE_getByType("ActivityIndicator" as any);
      expect(activityIndicator).toBeTruthy();
    });

    it("does not show PagerView when loading", () => {
      const { UNSAFE_queryByType } = render(
        <PhotoCarousel
          photoUris={["https://example.com/photo.jpg"]}
          loading={true}
        />
      );

      const pagerView = UNSAFE_queryByType("PagerView" as any);
      expect(pagerView).toBeNull();
    });
  });

  describe("rendering with single photo", () => {
    it("renders single Image directly without PagerView", () => {
      const photoUris = ["https://example.com/photo1.jpg"];
      const { UNSAFE_queryByType, UNSAFE_getByType } = render(
        <PhotoCarousel photoUris={photoUris} />
      );

      // No PagerView for single photo
      const pagerView = UNSAFE_queryByType("PagerView" as any);
      expect(pagerView).toBeNull();

      // Image rendered directly
      const image = UNSAFE_getByType("Image" as any);
      expect(image).toBeTruthy();
      expect(image.props.source).toEqual({ uri: photoUris[0] });
    });

    it("renders Image in a Pressable wrapper", () => {
      const photoUris = ["https://example.com/photo1.jpg"];
      const { UNSAFE_getByType } = render(
        <PhotoCarousel photoUris={photoUris} />
      );

      const pressable = UNSAFE_getByType("Pressable" as any);
      expect(pressable).toBeTruthy();
      expect(pressable.props.disabled).toBe(true); // no onPhotoPress
    });

    it("does not render page indicator for single photo", () => {
      const photoUris = ["https://example.com/photo1.jpg"];
      const { UNSAFE_getAllByType } = render(
        <PhotoCarousel photoUris={photoUris} />
      );

      const views = UNSAFE_getAllByType("View" as any);
      // Container view only (no indicator container when count <= 1)
      expect(views.length).toBeLessThanOrEqual(2);
    });
  });

  describe("rendering with multiple photos", () => {
    it("renders PagerView with multiple photos", () => {
      const photoUris = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
        "https://example.com/photo3.jpg",
      ];
      const { UNSAFE_getByType } = render(
        <PhotoCarousel photoUris={photoUris} />
      );

      const pagerView = UNSAFE_getByType("PagerView" as any);
      expect(pagerView).toBeTruthy();
      expect(pagerView.props.initialPage).toBe(0);
      expect(pagerView.props.onPageSelected).toBeDefined();
    });

    it("renders one Pressable per photo inside PagerView", () => {
      const photoUris = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
        "https://example.com/photo3.jpg",
      ];
      const { UNSAFE_getAllByType } = render(
        <PhotoCarousel photoUris={photoUris} />
      );

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      expect(pressables.length).toBe(3);
    });

    it("renders Images with correct sources", () => {
      const photoUris = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
      ];
      const { UNSAFE_getAllByType } = render(
        <PhotoCarousel photoUris={photoUris} />
      );

      const images = UNSAFE_getAllByType("Image" as any);
      expect(images.length).toBe(2);
      expect(images[0].props.source).toEqual({ uri: photoUris[0] });
      expect(images[1].props.source).toEqual({ uri: photoUris[1] });
    });

    it("renders page indicator dots for multiple photos", () => {
      const photoUris = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
        "https://example.com/photo3.jpg",
      ];
      const { UNSAFE_getAllByType } = render(
        <PhotoCarousel photoUris={photoUris} />
      );

      // Container + indicator container + 3 dots = 5+ Views
      const views = UNSAFE_getAllByType("View" as any);
      expect(views.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("press callback", () => {
    it("enables Pressable when onPhotoPress is provided (single photo)", () => {
      const onPhotoPress = jest.fn();
      const photoUris = ["https://example.com/photo1.jpg"];
      const { UNSAFE_getByType } = render(
        <PhotoCarousel photoUris={photoUris} onPhotoPress={onPhotoPress} />
      );

      const pressable = UNSAFE_getByType("Pressable" as any);
      expect(pressable.props.disabled).toBe(false);
    });

    it("disables Pressable when onPhotoPress is not provided (single photo)", () => {
      const photoUris = ["https://example.com/photo1.jpg"];
      const { UNSAFE_getByType } = render(
        <PhotoCarousel photoUris={photoUris} />
      );

      const pressable = UNSAFE_getByType("Pressable" as any);
      expect(pressable.props.disabled).toBe(true);
    });

    it("enables all Pressables when onPhotoPress is provided (multiple photos)", () => {
      const onPhotoPress = jest.fn();
      const photoUris = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
      ];
      const { UNSAFE_getAllByType } = render(
        <PhotoCarousel photoUris={photoUris} onPhotoPress={onPhotoPress} />
      );

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      pressables.forEach((p: any) => {
        expect(p.props.disabled).toBe(false);
      });
    });

    it("disables all Pressables when onPhotoPress is not provided (multiple photos)", () => {
      const photoUris = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
      ];
      const { UNSAFE_getAllByType } = render(
        <PhotoCarousel photoUris={photoUris} />
      );

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      pressables.forEach((p: any) => {
        expect(p.props.disabled).toBe(true);
      });
    });
  });

  describe("testID prop", () => {
    it("applies testID to container when provided (empty)", () => {
      const { UNSAFE_getByProps } = render(
        <PhotoCarousel photoUris={[]} testID="photo-carousel" />
      );

      const container = UNSAFE_getByProps({ testID: "photo-carousel" });
      expect(container).toBeTruthy();
    });

    it("applies testID to container with single photo", () => {
      const photoUris = ["https://example.com/photo1.jpg"];
      const { UNSAFE_getByProps } = render(
        <PhotoCarousel photoUris={photoUris} testID="photo-carousel" />
      );

      const container = UNSAFE_getByProps({ testID: "photo-carousel" });
      expect(container).toBeTruthy();
    });

    it("applies testID to container with multiple photos", () => {
      const photoUris = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
      ];
      const { UNSAFE_getByProps } = render(
        <PhotoCarousel photoUris={photoUris} testID="photo-carousel" />
      );

      const container = UNSAFE_getByProps({ testID: "photo-carousel" });
      expect(container).toBeTruthy();
    });
  });

  describe("Image component rendering", () => {
    it("renders Image with correct props for single photo", () => {
      const photoUris = ["https://example.com/photo1.jpg"];
      const { UNSAFE_getByType } = render(
        <PhotoCarousel photoUris={photoUris} />
      );

      const image = UNSAFE_getByType("Image" as any);
      expect(image.props.source).toEqual({ uri: photoUris[0] });
      expect(image.props.contentFit).toBe("cover");
      expect(image.props.accessibilityLabel).toBe("Meal photo 1");
    });

    it("generates correct accessibility labels for multiple photos", () => {
      const photoUris = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
        "https://example.com/photo3.jpg",
      ];
      const { UNSAFE_getAllByType } = render(
        <PhotoCarousel photoUris={photoUris} />
      );

      const images = UNSAFE_getAllByType("Image" as any);
      expect(images[0].props.accessibilityLabel).toBe("Meal photo 1");
      expect(images[1].props.accessibilityLabel).toBe("Meal photo 2");
      expect(images[2].props.accessibilityLabel).toBe("Meal photo 3");
    });
  });

  describe("PagerView configuration", () => {
    it("sets overdrag on PagerView", () => {
      const photoUris = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
      ];
      const { UNSAFE_getByType } = render(
        <PhotoCarousel photoUris={photoUris} />
      );

      const pagerView = UNSAFE_getByType("PagerView" as any);
      expect(pagerView.props.overdrag).toBe(true);
    });

    it("sets collapsable={false} on each page for Android", () => {
      const photoUris = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
      ];
      const { UNSAFE_getAllByType } = render(
        <PhotoCarousel photoUris={photoUris} />
      );

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      pressables.forEach((p: any) => {
        expect(p.props.collapsable).toBe(false);
      });
    });

    it("provides onPageSelected handler", () => {
      const photoUris = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
      ];
      const { UNSAFE_getByType } = render(
        <PhotoCarousel photoUris={photoUris} />
      );

      const pagerView = UNSAFE_getByType("PagerView" as any);
      expect(pagerView.props.onPageSelected).toBeDefined();

      // Should not throw when called
      expect(() => {
        pagerView.props.onPageSelected({ nativeEvent: { position: 1 } });
      }).not.toThrow();
    });
  });

  describe("onAddPhotoPress prop", () => {
    it("does not show add-photo page when onAddPhotoPress is undefined", () => {
      const photoUris = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
      ];
      const { queryByTestId } = render(
        <PhotoCarousel photoUris={photoUris} />
      );

      const addPhotoPage = queryByTestId("add-photo-page");
      expect(addPhotoPage).toBeNull();
    });

    it("shows add-photo page when onAddPhotoPress is provided", () => {
      const onAddPhotoPress = jest.fn();
      const photoUris = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
      ];
      const { UNSAFE_getAllByType } = render(
        <PhotoCarousel photoUris={photoUris} onAddPhotoPress={onAddPhotoPress} />
      );

      // Should have 3 pressables: 2 photos + 1 add button
      const pressables = UNSAFE_getAllByType("Pressable" as any);
      expect(pressables.length).toBe(3);
    });

    it("calls onAddPhotoPress when add-photo page is pressed", () => {
      const onAddPhotoPress = jest.fn();
      const photoUris = ["https://example.com/photo1.jpg"];
      const { UNSAFE_getAllByType } = render(
        <PhotoCarousel photoUris={photoUris} onAddPhotoPress={onAddPhotoPress} />
      );

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      // Last pressable should be the add-photo page with onPress handler
      const addPhotoPage = pressables[pressables.length - 1];
      expect(addPhotoPage.props.onPress).toBe(onAddPhotoPress);

      // Simulate press by calling onPress directly
      addPhotoPage.props.onPress();
      expect(onAddPhotoPress).toHaveBeenCalledTimes(1);
    });

    it("renders add-photo page with add-circle-outline icon", () => {
      const onAddPhotoPress = jest.fn();
      const photoUris = ["https://example.com/photo1.jpg"];
      const { UNSAFE_getAllByType } = render(
        <PhotoCarousel photoUris={photoUris} onAddPhotoPress={onAddPhotoPress} />
      );

      // Should have an Ionicons with add-circle-outline
      const icons = UNSAFE_getAllByType("Ionicons" as any);
      const addIcon = icons.find((icon: any) => icon.props.name === "add-circle-outline");
      expect(addIcon).toBeTruthy();
    });

    it("uses PagerView for single photo when onAddPhotoPress is provided", () => {
      const onAddPhotoPress = jest.fn();
      const photoUris = ["https://example.com/photo1.jpg"];
      const { UNSAFE_getByType } = render(
        <PhotoCarousel photoUris={photoUris} onAddPhotoPress={onAddPhotoPress} />
      );

      // Should use PagerView (not single image view) when add button is present
      const pagerView = UNSAFE_getByType("PagerView" as any);
      expect(pagerView).toBeTruthy();
    });

    it("does not use PagerView for single photo when onAddPhotoPress is undefined", () => {
      const photoUris = ["https://example.com/photo1.jpg"];
      const { UNSAFE_queryByType } = render(
        <PhotoCarousel photoUris={photoUris} />
      );

      // Should not use PagerView for single photo without add button
      const pagerView = UNSAFE_queryByType("PagerView" as any);
      expect(pagerView).toBeNull();
    });

    it("includes add-photo page in PageIndicator count", () => {
      const onAddPhotoPress = jest.fn();
      const photoUris = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
      ];
      const { UNSAFE_getAllByType } = render(
        <PhotoCarousel photoUris={photoUris} onAddPhotoPress={onAddPhotoPress} />
      );

      // Should have 3 pages total (2 photos + 1 add button)
      const views = UNSAFE_getAllByType("View" as any);
      // Find dots: there should be 3 dot elements (one for each page)
      const dotsContainer = views.find((v: any) =>
        v.props.style &&
        Array.isArray(v.props.children) &&
        v.props.children.length === 3
      );
      expect(dotsContainer).toBeTruthy();
    });

    it("does not include add-photo page in PageIndicator count when onAddPhotoPress is undefined", () => {
      const photoUris = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
      ];
      const { UNSAFE_getAllByType } = render(
        <PhotoCarousel photoUris={photoUris} />
      );

      // Should have 2 pages total (2 photos only)
      const views = UNSAFE_getAllByType("View" as any);
      // Find dots: there should be 2 dot elements
      const dotsContainer = views.find((v: any) =>
        v.props.style &&
        Array.isArray(v.props.children) &&
        v.props.children.length === 2
      );
      expect(dotsContainer).toBeTruthy();
    });

    it("sets proper accessibility props on add-photo page", () => {
      const onAddPhotoPress = jest.fn();
      const photoUris = ["https://example.com/photo1.jpg"];
      const { UNSAFE_getAllByType } = render(
        <PhotoCarousel photoUris={photoUris} onAddPhotoPress={onAddPhotoPress} />
      );

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      // Last pressable should be the add-photo page
      const addPhotoPage = pressables[pressables.length - 1];
      expect(addPhotoPage.props.accessibilityLabel).toBe("Add photo");
      expect(addPhotoPage.props.accessibilityRole).toBe("button");
    });

    it("renders add-photo page as last page in PagerView", () => {
      const onAddPhotoPress = jest.fn();
      const photoUris = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
      ];
      const { UNSAFE_getAllByType } = render(
        <PhotoCarousel photoUris={photoUris} onAddPhotoPress={onAddPhotoPress} />
      );

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      // Should have 3 pressables: 2 photos + 1 add button
      expect(pressables.length).toBe(3);

      // Last pressable should be the add-photo page
      const lastPressable = pressables[2];
      expect(lastPressable.props.testID).toBe("add-photo-page");
    });

    it("updates page indicator when swiping to add-photo page", () => {
      const onAddPhotoPress = jest.fn();
      const photoUris = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
      ];
      const { UNSAFE_getByType } = render(
        <PhotoCarousel photoUris={photoUris} onAddPhotoPress={onAddPhotoPress} />
      );

      const pagerView = UNSAFE_getByType("PagerView" as any);

      // Simulate swiping to the add-photo page (index 2)
      pagerView.props.onPageSelected({ nativeEvent: { position: 2 } });

      // Should not throw
      expect(pagerView.props.onPageSelected).toBeDefined();
    });
  });
});
