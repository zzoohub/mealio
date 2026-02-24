import React, { memo, useCallback, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { createStyles, useStyles } from "@/shared/ui/theme";
import { iconSizes, tokens } from "@/shared/ui/tokens";

// =============================================================================
// TYPES
// =============================================================================

export interface PhotoStripProps {
  photos: string[];
  onRemovePhoto: (index: number) => void;
  onDone: () => void;
  onPickFromGallery: () => void;
  photoCount: number;
  /** Bottom safe area inset from parent (accounts for home indicator) */
  bottomInset: number;
}

interface PhotoItemProps {
  uri: string;
  index: number;
  onRemove: (index: number) => void;
}

// =============================================================================
// PHOTO ITEM COMPONENT (Memoized for list performance)
// =============================================================================

const PhotoItem = memo(function PhotoItem({ uri, index, onRemove }: PhotoItemProps) {
  const handleRemove = useCallback(() => {
    onRemove(index);
  }, [onRemove, index]);

  return (
    <View style={styles.thumbnailWrapper}>
      <Image source={{ uri }} style={styles.thumbnail} contentFit="cover" />
      <Pressable
        style={styles.removeButton}
        onPress={handleRemove}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Remove photo"
      >
        <Ionicons name="close-circle" size={20} color="white" />
      </Pressable>
      <View style={styles.thumbnailIndex}>
        <Text style={styles.thumbnailIndexText}>{index + 1}</Text>
      </View>
    </View>
  );
});

// =============================================================================
// COMPONENT
// =============================================================================

export function PhotoStrip({ photos, onRemovePhoto, onDone, onPickFromGallery, photoCount, bottomInset }: PhotoStripProps) {
  const s = useStyles(photoStripStyles);

  const bottomOffset = Math.max(bottomInset, 16);
  const dynamicGalleryStyle = useMemo(() => ({
    bottom: bottomOffset + CAPTURE_AREA_HEIGHT,
  }), [bottomOffset]);
  const dynamicStripStyle = useMemo(() => ({
    bottom: bottomOffset + tokens.spacing.component.lg,
  }), [bottomOffset]);

  const renderItem = useCallback(
    ({ item, index }: { item: string; index: number }) => (
      <PhotoItem uri={item} index={index} onRemove={onRemovePhoto} />
    ),
    [onRemovePhoto]
  );

  const keyExtractor = useCallback((item: string) => item, []);

  return (
    <>
      {/* Gallery Button - Right side */}
      <Pressable
        style={({ pressed }) => [styles.galleryButtonFloating, dynamicGalleryStyle, pressed && styles.galleryButtonPressed]}
        onPress={onPickFromGallery}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Pick from gallery"
      >
        <Ionicons name="images-outline" size={iconSizes.md} color="white" />
        <View style={[styles.photoCountBadge, s.photoCountBadge]}>
          <Text style={styles.photoCountText}>{photoCount}</Text>
        </View>
      </Pressable>

      {/* Thumbnail Strip - Bottom */}
      <View style={[styles.thumbnailContainer, dynamicStripStyle]}>
        <View style={styles.thumbnailListContainer}>
          <FlashList
            data={photos}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailScroll}
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.doneButton, s.doneButton, pressed && styles.doneButtonPressed]}
          onPress={onDone}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Done"
        >
          <Ionicons name="checkmark" size={22} color="white" />
        </Pressable>
      </View>
    </>
  );
}

// =============================================================================
// STYLES
// =============================================================================

/** Height reserved for the capture button area above the strip */
const CAPTURE_AREA_HEIGHT = 80;

const THUMBNAIL_SIZE = 52;

const styles = StyleSheet.create({
  galleryButtonFloating: {
    position: "absolute",
    right: tokens.spacing.layout.md,
    padding: tokens.spacing.component.md,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: tokens.radius.full,
  },
  galleryButtonPressed: {
    opacity: 0.6,
  },
  photoCountBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  photoCountText: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
  },
  thumbnailContainer: {
    position: "absolute",
    left: tokens.spacing.component.lg,
    right: tokens.spacing.component.lg,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 6,
  },
  thumbnailListContainer: {
    flex: 1,
    height: 66, // Fixed height for FlashList
  },
  thumbnailScroll: {
    paddingRight: 8,
  },
  thumbnailWrapper: {
    position: "relative",
    paddingTop: 6,
    paddingRight: 6,
    marginRight: 8,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  removeButton: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 10,
  },
  thumbnailIndex: {
    position: "absolute",
    bottom: 2,
    left: 2,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  thumbnailIndexText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },
  doneButton: {
    justifyContent: "center",
    alignItems: "center",
    width: 42,
    height: 42,
    borderRadius: 21,
    marginLeft: 10,
  },
  doneButtonPressed: {
    opacity: 0.7,
  },
});

const photoStripStyles = createStyles((colors) => ({
  photoCountBadge: {
    backgroundColor: colors.interactive.primary,
  },
  doneButton: {
    backgroundColor: colors.interactive.primary,
  },
}));
