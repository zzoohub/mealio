import React from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createStyles, useStyles } from "@/shared/ui/design-system/theme";
import { iconSizes } from "@/shared/ui/design-system/tokens";

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

// =============================================================================
// COMPONENT
// =============================================================================

export function PhotoStrip({ photos, onRemovePhoto, onDone, onPickFromGallery, photoCount }: PhotoStripProps) {
  const s = useStyles(photoStripStyles);

  return (
    <>
      {/* Gallery Button - Right side */}
      <TouchableOpacity style={styles.galleryButtonFloating} onPress={onPickFromGallery}>
        <Ionicons name="images-outline" size={iconSizes.md} color="white" />
        <View style={[styles.photoCountBadge, s.photoCountBadge]}>
          <Text style={styles.photoCountText}>{photoCount}</Text>
        </View>
      </TouchableOpacity>

      {/* Thumbnail Strip - Bottom */}
      <View style={styles.thumbnailContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.thumbnailScrollView}
          contentContainerStyle={styles.thumbnailScroll}
        >
          {photos.map((uri, index) => (
            <View key={uri} style={styles.thumbnailWrapper}>
              <Image source={{ uri }} style={styles.thumbnail} />
              <TouchableOpacity style={styles.removeButton} onPress={() => onRemovePhoto(index)}>
                <Ionicons name="close-circle" size={20} color="white" />
              </TouchableOpacity>
              <View style={styles.thumbnailIndex}>
                <Text style={styles.thumbnailIndexText}>{index + 1}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity style={[styles.doneButton, s.doneButton]} onPress={onDone}>
          <Ionicons name="checkmark" size={22} color="white" />
        </TouchableOpacity>
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
  thumbnailScrollView: {
    flex: 1,
  },
  thumbnailScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 8,
  },
  thumbnailWrapper: {
    position: "relative",
    paddingTop: 6,
    paddingRight: 6,
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
