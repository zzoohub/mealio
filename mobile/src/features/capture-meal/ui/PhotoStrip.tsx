import React, { memo, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { createStyles, useStyles } from "@/shared/ui/theme";
import { iconSizes } from "@/shared/ui/tokens";

// =============================================================================
// TYPES
// =============================================================================

export interface PhotoStripProps {
  photos: string[];
  onRemovePhoto: (index: number) => void;
  onDone: () => void;
  onPickFromGallery: () => void;
  photoCount: number;
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
      <Pressable style={styles.removeButton} onPress={handleRemove}>
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

export function PhotoStrip({ photos, onRemovePhoto, onDone, onPickFromGallery, photoCount }: PhotoStripProps) {
  const s = useStyles(photoStripStyles);

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
      <Pressable style={styles.galleryButtonFloating} onPress={onPickFromGallery}>
        <Ionicons name="images-outline" size={iconSizes.md} color="white" />
        <View style={[styles.photoCountBadge, s.photoCountBadge]}>
          <Text style={styles.photoCountText}>{photoCount}</Text>
        </View>
      </Pressable>

      {/* Thumbnail Strip - Bottom */}
      <View style={styles.thumbnailContainer}>
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

        <Pressable style={[styles.doneButton, s.doneButton]} onPress={onDone}>
          <Ionicons name="checkmark" size={22} color="white" />
        </Pressable>
      </View>
    </>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  galleryButtonFloating: {
    position: "absolute",
    bottom: 120,
    right: 24,
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 24,
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
    bottom: 40,
    left: 16,
    right: 16,
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
    width: 52,
    height: 52,
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
});

const photoStripStyles = createStyles((colors) => ({
  photoCountBadge: {
    backgroundColor: colors.interactive.primary,
  },
  doneButton: {
    backgroundColor: colors.interactive.primary,
  },
}));
