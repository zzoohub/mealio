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

import React from 'react';
import { View, Image, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/design-system/tokens';
import { createStyles, useStyles } from '@/design-system/theme';

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
// CONSTANTS
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_WIDTH; // 1:1 square aspect ratio

// =============================================================================
// COMPONENT
// =============================================================================

export function MealHeroImage({
  photoUri,
  loading = false,
  onPress,
  testID,
}: MealHeroImageProps) {
  const s = useStyles(styles);

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
      resizeMode="cover"
      accessibilityLabel="Meal photo"
    />
  );

  const content = photoUri && !loading ? renderImage() : renderPlaceholder();

  // If onPress is provided, wrap in TouchableOpacity
  if (onPress) {
    return (
      <TouchableOpacity
        style={s.container}
        onPress={onPress}
        activeOpacity={0.9}
        accessibilityLabel={photoUri ? 'View meal photo in fullscreen' : 'No meal photo'}
        accessibilityRole="imagebutton"
        testID={testID}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={s.container} testID={testID}>
      {content}
    </View>
  );
}

export default MealHeroImage;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
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
