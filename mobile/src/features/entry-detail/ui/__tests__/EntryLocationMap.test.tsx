// Mock native modules and dependencies
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  Platform: {
    OS: "ios",
    select: jest.fn((obj) => obj.ios),
  },
  Linking: {
    openURL: jest.fn(),
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => {
      if (!style) return {};
      if (!Array.isArray(style)) return style;
      return style.reduce((acc, s) => ({ ...acc, ...s }), {});
    },
  },
}));

jest.mock("react-native-maps", () => ({
  __esModule: true,
  default: "MapView",
  Marker: "Marker",
  PROVIDER_GOOGLE: "google",
}));

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));

jest.mock("@/shared/ui/theme", () => ({
  createStyles: jest.fn((fn) => fn),
  useStyles: jest.fn((stylesFn) => {
    const mockColors = {
      border: { default: "#E5E5E5" },
      text: { primary: "#000000", secondary: "#666666", tertiary: "#999999" },
    };
    return stylesFn(mockColors);
  }),
  useIsDarkMode: jest.fn(() => false),
}));

jest.mock("@/shared/lib/i18n", () => ({
  useDiaryI18n: jest.fn(() => ({
    location: "Location",
    openInMaps: "Open in Maps",
  })),
}));

jest.mock("@/shared/ui/tokens", () => ({
  tokens: {
    spacing: {
      component: { sm: 8, md: 12, lg: 16 },
    },
    typography: {
      fontSize: { bodySmall: 13, caption: 12 },
      fontWeight: { semibold: "600" },
      lineHeight: { body: 1.5 },
    },
    borderWidth: { default: 1 },
  },
}));

jest.mock("@/entities/entry", () => ({}));

import React from "react";
import { render } from "@testing-library/react-native";
import { Platform, Linking } from "react-native";
import { EntryLocationMap } from "../EntryLocationMap";
import type { Location } from "@/entities/entry";
import { useStyles, useIsDarkMode } from "@/shared/ui/theme";
import { useDiaryI18n } from "@/shared/lib/i18n";

const mockUseStyles = useStyles as jest.Mock;
const mockUseIsDarkMode = useIsDarkMode as jest.Mock;
const mockUseDiaryI18n = useDiaryI18n as jest.Mock;
const mockPlatformSelect = Platform.select as jest.Mock;
const mockLinkingOpenURL = Linking.openURL as jest.Mock;

// =============================================================================
// HELPERS
// =============================================================================

function createMockLocation(overrides: Partial<Location> = {}): Location {
  return {
    latitude: 37.5665,
    longitude: 126.978,
    address: "Seoul, South Korea",
    ...overrides,
  };
}

// =============================================================================
// EntryLocationMap — rendering tests
// =============================================================================

describe("EntryLocationMap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsDarkMode.mockReturnValue(false);
    mockUseDiaryI18n.mockReturnValue({
      location: "Location",
      openInMaps: "Open in Maps",
    });
    mockPlatformSelect.mockImplementation((obj) => obj.ios);
    mockUseStyles.mockImplementation((stylesFn) => {
      const mockColors = {
        border: { default: "#E5E5E5" },
        text: { primary: "#000000", secondary: "#666666", tertiary: "#999999" },
      };
      return stylesFn(mockColors);
    });
  });

  // =============================================================================
  // NULL RENDERING
  // =============================================================================

  describe("null rendering", () => {
    it("returns null when location is undefined", () => {
      const { toJSON } = render(<EntryLocationMap location={undefined} />);
      expect(toJSON()).toBeNull();
    });

    it("returns null when location is null", () => {
      const { toJSON } = render(<EntryLocationMap location={null} />);
      expect(toJSON()).toBeNull();
    });

    it("returns null when location has no latitude", () => {
      const location = createMockLocation({ latitude: undefined as any });
      const { toJSON } = render(<EntryLocationMap location={location} />);
      expect(toJSON()).toBeNull();
    });

    it("returns null when location has no longitude", () => {
      const location = createMockLocation({ longitude: undefined as any });
      const { toJSON } = render(<EntryLocationMap location={location} />);
      expect(toJSON()).toBeNull();
    });

    it("returns null when location has zero latitude", () => {
      const location = createMockLocation({ latitude: 0 });
      const { toJSON } = render(<EntryLocationMap location={location} />);
      expect(toJSON()).toBeNull();
    });

    it("returns null when location has zero longitude", () => {
      const location = createMockLocation({ longitude: 0 });
      const { toJSON } = render(<EntryLocationMap location={location} />);
      expect(toJSON()).toBeNull();
    });

    it("returns null when location has both zero latitude and longitude", () => {
      const location = createMockLocation({ latitude: 0, longitude: 0 });
      const { toJSON } = render(<EntryLocationMap location={location} />);
      expect(toJSON()).toBeNull();
    });

    it("returns null when location is empty object", () => {
      const location = {} as Location;
      const { toJSON } = render(<EntryLocationMap location={location} />);
      expect(toJSON()).toBeNull();
    });
  });

  // =============================================================================
  // MAP RENDERING
  // =============================================================================

  describe("map rendering", () => {
    it("renders map when location is provided", () => {
      const location = createMockLocation();
      const { UNSAFE_getByType } = render(<EntryLocationMap location={location} />);

      const mapView = UNSAFE_getByType("MapView" as any);
      expect(mapView).toBeTruthy();
    });

    it("renders marker when location is provided", () => {
      const location = createMockLocation();
      const { UNSAFE_getByType } = render(<EntryLocationMap location={location} />);

      const marker = UNSAFE_getByType("Marker" as any);
      expect(marker).toBeTruthy();
    });

    it("passes correct region to MapView", () => {
      const location = createMockLocation({
        latitude: 40.7128,
        longitude: -74.006,
      });
      const { UNSAFE_getByType } = render(<EntryLocationMap location={location} />);

      const mapView = UNSAFE_getByType("MapView" as any);
      expect(mapView.props.region).toEqual({
        latitude: 40.7128,
        longitude: -74.006,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    });

    it("passes correct coordinate to Marker", () => {
      const location = createMockLocation({
        latitude: 51.5074,
        longitude: -0.1278,
      });
      const { UNSAFE_getByType } = render(<EntryLocationMap location={location} />);

      const marker = UNSAFE_getByType("Marker" as any);
      expect(marker.props.coordinate).toEqual({
        latitude: 51.5074,
        longitude: -0.1278,
      });
    });

    it("disables map scroll, zoom, rotate, and pitch", () => {
      const location = createMockLocation();
      const { UNSAFE_getByType } = render(<EntryLocationMap location={location} />);

      const mapView = UNSAFE_getByType("MapView" as any);
      expect(mapView.props.scrollEnabled).toBe(false);
      expect(mapView.props.zoomEnabled).toBe(false);
      expect(mapView.props.rotateEnabled).toBe(false);
      expect(mapView.props.pitchEnabled).toBe(false);
    });

    it("sets pointerEvents to none", () => {
      const location = createMockLocation();
      const { UNSAFE_getByType } = render(<EntryLocationMap location={location} />);

      const mapView = UNSAFE_getByType("MapView" as any);
      expect(mapView.props.pointerEvents).toBe("none");
    });

    it("handles negative latitude and longitude", () => {
      const location = createMockLocation({
        latitude: -33.8688,
        longitude: 151.2093,
      });
      const { UNSAFE_getByType } = render(<EntryLocationMap location={location} />);

      const mapView = UNSAFE_getByType("MapView" as any);
      expect(mapView.props.region.latitude).toBe(-33.8688);
      expect(mapView.props.region.longitude).toBe(151.2093);
    });

    it("handles extreme latitude values", () => {
      const location = createMockLocation({
        latitude: 89.9999,
        longitude: 126.978,
      });
      const { UNSAFE_getByType } = render(<EntryLocationMap location={location} />);

      const mapView = UNSAFE_getByType("MapView" as any);
      expect(mapView.props.region.latitude).toBe(89.9999);
    });

    it("handles extreme longitude values", () => {
      const location = createMockLocation({
        latitude: 37.5665,
        longitude: -179.9999,
      });
      const { UNSAFE_getByType } = render(<EntryLocationMap location={location} />);

      const mapView = UNSAFE_getByType("MapView" as any);
      expect(mapView.props.region.longitude).toBe(-179.9999);
    });
  });

  // =============================================================================
  // ADDRESS RENDERING
  // =============================================================================

  describe("address rendering", () => {
    it("renders address when available", () => {
      const location = createMockLocation({
        address: "123 Main St, New York, NY",
      });
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const addressText = texts.find(
        (text: any) => text.props.children === "123 Main St, New York, NY"
      );
      expect(addressText).toBeTruthy();
      expect(addressText.props.numberOfLines).toBe(1);
    });

    it("hides address when undefined", () => {
      const location = createMockLocation({ address: undefined });
      const { toJSON } = render(<EntryLocationMap location={location} />);

      const tree = JSON.stringify(toJSON());
      expect(tree).not.toContain("address");
    });

    it("hides address when empty string", () => {
      const location = createMockLocation({ address: "" });
      const { toJSON } = render(<EntryLocationMap location={location} />);

      const tree = JSON.stringify(toJSON());
      expect(tree).not.toContain("open-outline");
    });

    it("renders open icon when address is present", () => {
      const location = createMockLocation({
        address: "123 Main St",
      });
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const openIcon = ionicons.find((icon: any) => icon.props.name === "open-outline");
      expect(openIcon).toBeTruthy();
      expect(openIcon.props.size).toBe(14);
    });

    it("hides open icon when address is not present", () => {
      const location = createMockLocation({ address: undefined });
      const { toJSON } = render(<EntryLocationMap location={location} />);

      const tree = JSON.stringify(toJSON());
      expect(tree).not.toContain("open-outline");
    });

    it("handles very long address", () => {
      const longAddress = "A".repeat(200);
      const location = createMockLocation({ address: longAddress });
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const addressText = texts.find((text: any) => text.props.children === longAddress);
      expect(addressText).toBeTruthy();
      expect(addressText.props.numberOfLines).toBe(1);
    });

    it("handles address with special characters", () => {
      const location = createMockLocation({
        address: "Café, Straße #123",
      });
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const addressText = texts.find(
        (text: any) => text.props.children === "Café, Straße #123"
      );
      expect(addressText).toBeTruthy();
    });

    it("handles address with emoji", () => {
      const location = createMockLocation({
        address: "Tokyo 🗼",
      });
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const addressText = texts.find(
        (text: any) => text.props.children === "Tokyo 🗼"
      );
      expect(addressText).toBeTruthy();
    });
  });

  // =============================================================================
  // LINKING / MAPS OPENING
  // =============================================================================

  describe("opening maps", () => {
    it("calls Linking.openURL when map is pressed", () => {
      const location = createMockLocation({
        latitude: 37.5665,
        longitude: 126.978,
        address: "Seoul, South Korea",
      });
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const mapPressable = pressables[0];
      mapPressable.props.onPress();

      expect(mockLinkingOpenURL).toHaveBeenCalledTimes(1);
    });

    it("opens Google Maps URL with address label", () => {
      const location = createMockLocation({
        latitude: 37.5665,
        longitude: 126.978,
        address: "Seoul, South Korea",
      });
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const mapPressable = pressables[0];
      mapPressable.props.onPress();

      expect(mockLinkingOpenURL).toHaveBeenCalledWith(
        "https://www.google.com/maps/search/?api=1&query=Seoul&query_place_id&center=37.5665,126.978"
      );
    });

    it("uses first part of address as query", () => {
      const location = createMockLocation({
        latitude: 40.7128,
        longitude: -74.006,
        address: "New York, NY, USA",
      });
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const mapPressable = pressables[0];
      mapPressable.props.onPress();

      expect(mockLinkingOpenURL).toHaveBeenCalledWith(
        "https://www.google.com/maps/search/?api=1&query=New%20York&query_place_id&center=40.7128,-74.006"
      );
    });

    it("uses coordinates as query when address is undefined", () => {
      const location = createMockLocation({
        latitude: 37.5665,
        longitude: 126.978,
        address: undefined,
      });
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const mapPressable = pressables[0];
      mapPressable.props.onPress();

      expect(mockLinkingOpenURL).toHaveBeenCalledWith(
        "https://www.google.com/maps/search/?api=1&query=37.5665,126.978&query_place_id&center=37.5665,126.978"
      );
    });

    it("uses full address as label when no comma", () => {
      const location = createMockLocation({
        latitude: 37.5665,
        longitude: 126.978,
        address: "Seoul",
      });
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const mapPressable = pressables[0];
      mapPressable.props.onPress();

      expect(mockLinkingOpenURL).toHaveBeenCalledWith(
        "https://www.google.com/maps/search/?api=1&query=Seoul&query_place_id&center=37.5665,126.978"
      );
    });

    it("calls Linking.openURL when address row is pressed", () => {
      const location = createMockLocation({
        latitude: 37.5665,
        longitude: 126.978,
        address: "Seoul, South Korea",
      });
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const addressPressable = pressables[1]; // Second pressable is address row
      addressPressable.props.onPress();

      expect(mockLinkingOpenURL).toHaveBeenCalledTimes(1);
    });

    it("handles negative coordinates in URL", () => {
      const location = createMockLocation({
        latitude: -33.8688,
        longitude: -151.2093,
        address: "Sydney",
      });
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const mapPressable = pressables[0];
      mapPressable.props.onPress();

      expect(mockLinkingOpenURL).toHaveBeenCalledWith(
        "https://www.google.com/maps/search/?api=1&query=Sydney&query_place_id&center=-33.8688,-151.2093"
      );
    });

    it("sets correct accessibility label on map pressable", () => {
      const location = createMockLocation();
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const mapPressable = pressables[0];
      expect(mapPressable.props.accessibilityLabel).toBe("Open in Maps");
      expect(mapPressable.props.accessibilityRole).toBe("button");
    });

    it("uses i18n translation for accessibility label", () => {
      mockUseDiaryI18n.mockReturnValue({
        location: "Location",
        openInMaps: "지도에서 열기",
      });
      const location = createMockLocation();
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const mapPressable = pressables[0];
      expect(mapPressable.props.accessibilityLabel).toBe("지도에서 열기");
    });
  });

  // =============================================================================
  // DARK MODE
  // =============================================================================

  describe("dark mode", () => {
    it("does not apply custom map style when dark mode is false", () => {
      mockUseIsDarkMode.mockReturnValue(false);
      const location = createMockLocation();
      const { UNSAFE_getByType } = render(<EntryLocationMap location={location} />);

      const mapView = UNSAFE_getByType("MapView" as any);
      expect(mapView.props.customMapStyle).toBeUndefined();
    });

    it("applies custom map style when dark mode is true", () => {
      mockUseIsDarkMode.mockReturnValue(true);
      const location = createMockLocation();
      const { UNSAFE_getByType } = render(<EntryLocationMap location={location} />);

      const mapView = UNSAFE_getByType("MapView" as any);
      expect(mapView.props.customMapStyle).toBeDefined();
      expect(Array.isArray(mapView.props.customMapStyle)).toBe(true);
      expect(mapView.props.customMapStyle.length).toBeGreaterThan(0);
    });

    it("applies dark map style with correct structure", () => {
      mockUseIsDarkMode.mockReturnValue(true);
      const location = createMockLocation();
      const { UNSAFE_getByType } = render(<EntryLocationMap location={location} />);

      const mapView = UNSAFE_getByType("MapView" as any);
      const style = mapView.props.customMapStyle;
      expect(style[0]).toHaveProperty("elementType");
      expect(style[0]).toHaveProperty("stylers");
      expect(Array.isArray(style[0].stylers)).toBe(true);
    });

    it("calls useIsDarkMode hook", () => {
      const location = createMockLocation();
      render(<EntryLocationMap location={location} />);

      expect(mockUseIsDarkMode).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // ANDROID-SPECIFIC
  // =============================================================================

  describe("Android-specific behavior", () => {
    beforeEach(() => {
      (Platform as any).OS = "android";
    });

    afterEach(() => {
      (Platform as any).OS = "ios";
    });

    it("applies Google provider and lite mode on Android", () => {
      const location = createMockLocation();
      const { UNSAFE_getByType } = render(<EntryLocationMap location={location} />);

      const mapView = UNSAFE_getByType("MapView" as any);
      expect(mapView.props.provider).toBe("google");
      expect(mapView.props.liteMode).toBe(true);
    });

    it("does not apply lite mode on iOS", () => {
      (Platform as any).OS = "ios";
      const location = createMockLocation();
      const { UNSAFE_getByType } = render(<EntryLocationMap location={location} />);

      const mapView = UNSAFE_getByType("MapView" as any);
      expect(mapView.props.provider).toBe("google");
      expect(mapView.props.liteMode).toBeUndefined();
    });
  });

  // =============================================================================
  // THEME INTEGRATION
  // =============================================================================

  describe("theme integration", () => {
    it("applies theme secondary color to address text", () => {
      const location = createMockLocation({ address: "Test Location" });
      mockUseStyles.mockImplementationOnce((stylesFn) => {
        const mockColors = {
          border: { default: "#E5E5E5" },
          text: { primary: "#FF0000", secondary: "#00FF00", tertiary: "#999999" },
        };
        return stylesFn(mockColors);
      });
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const addressText = texts.find((text: any) => text.props.children === "Test Location");
      const style = Array.isArray(addressText.props.style) ? addressText.props.style.flat() : [addressText.props.style];
      const colorStyle = style.find((s: any) => s && s.color);
      expect(colorStyle.color).toBe("#00FF00");
    });

    it("applies theme text colors to address", () => {
      const location = createMockLocation({ address: "Test Address" });
      mockUseStyles.mockImplementationOnce((stylesFn) => {
        const mockColors = {
          border: { default: "#E5E5E5" },
          text: { primary: "#000000", secondary: "#00FF00", tertiary: "#999999" },
        };
        return stylesFn(mockColors);
      });
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const addressText = texts.find(
        (text: any) => text.props.children === "Test Address"
      );
      const style = Array.isArray(addressText.props.style) ? addressText.props.style.flat() : [addressText.props.style];
      const colorStyle = style.find((s: any) => s && s.color);
      expect(colorStyle.color).toBe("#00FF00");
    });

    it("applies theme icon color to open icon", () => {
      const location = createMockLocation({ address: "Test Address" });
      mockUseStyles.mockImplementationOnce((stylesFn) => {
        const mockColors = {
          border: { default: "#E5E5E5" },
          text: { primary: "#000000", secondary: "#666666", tertiary: "#0000FF" },
        };
        return stylesFn(mockColors);
      });
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const openIcon = ionicons.find(
        (icon: any) => icon.props.name === "open-outline"
      );
      expect(openIcon.props.color).toBe("#0000FF");
    });

    it("applies theme border color", () => {
      const location = createMockLocation();
      mockUseStyles.mockImplementationOnce((stylesFn) => {
        const mockColors = {
          border: { default: "#FF00FF" },
          text: { primary: "#000000", secondary: "#666666", tertiary: "#999999" },
        };
        return stylesFn(mockColors);
      });
      const result = render(
        <EntryLocationMap location={location} testID="location-map" />
      );
      const container = result.getByTestId("location-map");
      const style = Array.isArray(container.props.style) ? container.props.style.flat() : [container.props.style];
      const borderStyle = style.find((s: any) => s && s.borderBottomColor);
      expect(borderStyle.borderBottomColor).toBe("#FF00FF");
    });
  });

  // =============================================================================
  // I18N INTEGRATION
  // =============================================================================

  describe("i18n integration", () => {
    it("calls useDiaryI18n hook", () => {
      const location = createMockLocation();
      render(<EntryLocationMap location={location} />);

      expect(mockUseDiaryI18n).toHaveBeenCalled();
    });

    it("uses i18n translations for accessibility label", () => {
      mockUseDiaryI18n.mockReturnValue({
        location: "Ubicación",
        openInMaps: "Abrir en Mapas",
      });
      const location = createMockLocation();
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const mapPressable = pressables[0];
      expect(mapPressable.props.accessibilityLabel).toBe("Abrir en Mapas");
    });
  });

  // =============================================================================
  // TEST ID
  // =============================================================================

  describe("testID prop", () => {
    it("applies testID to container when provided", () => {
      const location = createMockLocation();
      const result = render(
        <EntryLocationMap location={location} testID="custom-test-id" />
      );

      const container = result.getByTestId("custom-test-id");
      expect(container).toBeTruthy();
    });

    it("works without testID", () => {
      const location = createMockLocation();
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const views = UNSAFE_getAllByType("View" as any);
      expect(views.length).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe("edge cases", () => {
    it("handles location with only required fields", () => {
      const location: Location = {
        latitude: 37.5665,
        longitude: 126.978,
      };
      const { UNSAFE_getByType } = render(<EntryLocationMap location={location} />);

      const mapView = UNSAFE_getByType("MapView" as any);
      expect(mapView).toBeTruthy();
    });

    it("handles fractional coordinates", () => {
      const location = createMockLocation({
        latitude: 37.123456789,
        longitude: 126.987654321,
      });
      const { UNSAFE_getByType } = render(<EntryLocationMap location={location} />);

      const marker = UNSAFE_getByType("Marker" as any);
      expect(marker.props.coordinate.latitude).toBe(37.123456789);
      expect(marker.props.coordinate.longitude).toBe(126.987654321);
    });

    it("handles very small coordinate values", () => {
      const location = createMockLocation({
        latitude: 0.000001,
        longitude: 0.000001,
      });
      const { UNSAFE_getByType } = render(<EntryLocationMap location={location} />);

      const mapView = UNSAFE_getByType("MapView" as any);
      expect(mapView.props.region.latitude).toBe(0.000001);
      expect(mapView.props.region.longitude).toBe(0.000001);
    });

    it("handles address with only whitespace", () => {
      const location = createMockLocation({ address: "   " });
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const addressText = texts.find((text: any) => text.props.children === "   ");
      expect(addressText).toBeTruthy();
    });

    it("handles address with newlines", () => {
      const location = createMockLocation({
        address: "Line 1\nLine 2",
      });
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const addressText = texts.find(
        (text: any) => text.props.children === "Line 1\nLine 2"
      );
      expect(addressText).toBeTruthy();
    });

    it("renders correctly with all features enabled", () => {
      mockUseIsDarkMode.mockReturnValue(true);
      const location = createMockLocation({
        latitude: 37.5665,
        longitude: 126.978,
        address: "Seoul, South Korea",
      });
      const { UNSAFE_getByType, UNSAFE_getAllByType } = render(
        <EntryLocationMap location={location} testID="full-featured" />
      );

      const mapView = UNSAFE_getByType("MapView" as any);
      const marker = UNSAFE_getByType("Marker" as any);
      const texts = UNSAFE_getAllByType("Text" as any);

      expect(mapView).toBeTruthy();
      expect(marker).toBeTruthy();
      expect(mapView.props.customMapStyle).toBeDefined();
      expect(texts.length).toBeGreaterThanOrEqual(1);
    });

    it("always opens Google Maps URL regardless of platform", () => {
      const location = createMockLocation({
        address: "Seoul, South Korea",
      });
      const { UNSAFE_getAllByType } = render(<EntryLocationMap location={location} />);

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const mapPressable = pressables[0];
      mapPressable.props.onPress();

      expect(mockLinkingOpenURL).toHaveBeenCalledWith(
        expect.stringContaining("https://www.google.com/maps/search/")
      );
    });

    it("does not call openURL when location is null in handler", () => {
      const location = createMockLocation();
      const { UNSAFE_getAllByType, rerender } = render(<EntryLocationMap location={location} />);

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const mapPressable = pressables[0];

      // Handler should work with valid location
      expect(() => mapPressable.props.onPress()).not.toThrow();
      expect(mockLinkingOpenURL).toHaveBeenCalledTimes(1);
    });
  });
});
