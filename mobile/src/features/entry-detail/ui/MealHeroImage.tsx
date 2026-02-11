/**
 * MealHeroImage - Hero image component for meal detail page
 *
 * Displays the meal photo at full width with 4:3 aspect ratio.
 * Includes placeholder state for loading or missing images.
 *
 * @example
 * ```tsx
 * <MealHeroImage
 *   photoUri="file:///path/to/photo.jpg"
 *   onPress={() => openFullscreenViewer()}
 * />
 * ```
 */

import React, { memo } from 'react';
import { View, Pressable, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/shared/ui/tokens';
import { createStyles, useStyles } from '@/shared/ui/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface MealHeroImageProps {
  /** URI of the meal photo */
  photoUri?: string | null | undefined;
  /** Whether image is currently loading */
  loading?: boolean | undefined;
  /** Callback when image is pressed (for fullscreen view) */
  onPress?: (() => void) | undefined;
  /** Test ID for testing */
  testID?: string | undefined;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const MealHeroImage = memo(function MealHeroImage({
  photoUri,
  loading = false,
  onPress,
  testID,
}: MealHeroImageProps) {
  const s = useStyles(styles);
  const { width: screenWidth } = useWindowDimensions();
  const imageHeight = screenWidth; // 1:1 square aspect ratio
  const sizeStyle = { width: screenWidth, height: imageHeight };

  // Render placeholder when loading or no image
  const renderPlaceholder = () => (
    <View style={s.placeholder}>
      {loading ? (
        <ActivityIndicator
          size="large"
          color={s.placeholderIcon.color as string}
          accessibilityLabel="Loading image"
        />
      ) : (
        <Ionicons
          name="image-outline"
          size={tokens.size.icon.xl}
          color={s.placeholderIcon.color as string}
        />
      )}
    </View>
  );

  // Render the actual image
  const renderImage = () => (
    <Image
      source={{ uri: photoUri! }}
      style={s.image}
      contentFit="cover"
      accessibilityLabel="Meal photo"
    />
  );

  const content = photoUri && !loading ? renderImage() : renderPlaceholder();

  // If onPress is provided, wrap in Pressable
  if (onPress) {
    return (
      <Pressable
        style={[s.container, sizeStyle]}
        onPress={onPress}
        accessibilityLabel={photoUri ? 'View meal photo in fullscreen' : 'No meal photo'}
        accessibilityRole="imagebutton"
        testID={testID}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[s.container, sizeStyle]} testID={testID}>
      {content}
    </View>
  );
});

export default MealHeroImage;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    // width and height set dynamically via sizeStyle
    backgroundColor: colors.bg.secondary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
  },
  placeholderIcon: {
    color: colors.text.tertiary,
  },
}));
