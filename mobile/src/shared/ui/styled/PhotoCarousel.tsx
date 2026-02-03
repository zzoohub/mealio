/**
 * PhotoCarousel - Swipeable photo carousel with page indicator dots.
 *
 * Uses react-native-pager-view for native 60fps page swiping.
 * Falls back to placeholder when loading or no photos provided.
 */

import React, { memo, useCallback, useState } from "react";
import { View, Pressable, Dimensions, ActivityIndicator } from "react-native";
import PagerView from "react-native-pager-view";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { tokens } from "@/shared/ui/tokens";
import { createStyles, useStyles } from "@/shared/ui/theme";

// =============================================================================
// TYPES
// =============================================================================

export interface PhotoCarouselProps {
  /** All photo URIs for this entry */
  photoUris: string[];
  /** Whether images are currently loading */
  loading?: boolean;
  /** Callback when a photo is pressed (for fullscreen view or navigation) */
  onPhotoPress?: ((index: number) => void) | undefined;
  /** Test ID for testing */
  testID?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_HEIGHT = SCREEN_WIDTH; // 1:1 square aspect ratio

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface PageIndicatorProps {
  count: number;
  activeIndex: number;
}

const PageIndicator = memo(function PageIndicator({
  count,
  activeIndex,
}: PageIndicatorProps) {
  const s = useStyles(styles);

  if (count <= 1) return null;

  return (
    <View style={s.indicatorContainer} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[s.dot, i === activeIndex ? s.dotActive : s.dotInactive]}
        />
      ))}
    </View>
  );
});

// =============================================================================
// COMPONENT
// =============================================================================

export const PhotoCarousel = memo(function PhotoCarousel({
  photoUris,
  loading = false,
  onPhotoPress,
  testID,
}: PhotoCarouselProps) {
  const s = useStyles(styles);
  const [activeIndex, setActiveIndex] = useState(0);

  const handlePageSelected = useCallback(
    (e: { nativeEvent: { position: number } }) => {
      setActiveIndex(e.nativeEvent.position);
    },
    [],
  );

  // Placeholder when loading or no images
  if (loading || photoUris.length === 0) {
    return (
      <View style={s.container} testID={testID}>
        <View style={s.placeholder}>
          {loading ? (
            <ActivityIndicator
              size="large"
              color={s.placeholderIcon.color as string}
              accessibilityLabel="Loading images"
            />
          ) : (
            <Ionicons
              name="image-outline"
              size={tokens.size.icon.xl}
              color={s.placeholderIcon.color as string}
            />
          )}
        </View>
      </View>
    );
  }

  // Single photo — no pager needed, just a tappable image
  if (photoUris.length === 1) {
    return (
      <View style={s.container} testID={testID}>
        <Pressable
          onPress={() => onPhotoPress?.(0)}
          disabled={!onPhotoPress}
          style={s.slide}
        >
          <Image
            source={{ uri: photoUris[0] }}
            style={s.image}
            contentFit="cover"
            accessibilityLabel="Meal photo 1"
          />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.container} testID={testID}>
      <PagerView
        style={s.pager}
        initialPage={0}
        onPageSelected={handlePageSelected}
        overdrag
      >
        {photoUris.map((uri, index) => (
          <Pressable
            key={`${uri}-${index}`}
            collapsable={false}
            onPress={() => onPhotoPress?.(index)}
            disabled={!onPhotoPress}
            style={s.slide}
          >
            <Image
              source={{ uri }}
              style={s.image}
              contentFit="cover"
              accessibilityLabel={`Meal photo ${index + 1}`}
            />
          </Pressable>
        ))}
      </PagerView>
      <PageIndicator count={photoUris.length} activeIndex={activeIndex} />
    </View>
  );
});

export default PhotoCarousel;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: colors.bg.secondary,
  },
  pager: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg.secondary,
  },
  placeholderIcon: {
    color: colors.text.tertiary,
  },
  indicatorContainer: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: "white",
  },
  dotInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
}));
