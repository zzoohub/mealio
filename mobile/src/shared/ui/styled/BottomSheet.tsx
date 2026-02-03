/**
 * BottomSheet Component
 *
 * Animated bottom sheet modal with customizable appearance.
 * Uses design system tokens for consistent styling.
 *
 * @example
 * <BottomSheet visible={isOpen} onClose={() => setIsOpen(false)}>
 *   <Text>Sheet content</Text>
 * </BottomSheet>
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Modal,
  Dimensions,
  Pressable,
  StyleSheet,
  ViewStyle,
  ModalProps,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { tokens } from '../tokens';
import { useTheme, createStyles, useStyles } from '../theme';

interface BottomSheetProps extends Omit<ModalProps, 'animationType' | 'transparent'> {
  /** Whether the sheet is visible */
  visible: boolean;
  /** Callback when the sheet should close */
  onClose: () => void;
  /** Sheet content */
  children: React.ReactNode;
  /** Sheet height (number in pixels or 'auto') */
  height?: number | string;
  /** Custom style for the sheet */
  style?: ViewStyle;
  /** Opacity of the dim overlay (0-1) */
  dimOpacity?: number;
  /** Spring animation configuration for slide */
  slideAnimationConfig?: {
    tension?: number;
    friction?: number;
    duration?: number;
  };
  /** Duration of the fade animation in ms */
  fadeAnimationDuration?: number;
  /** Whether swipe down to close is enabled (future feature) */
  enableSwipeDown?: boolean;
  /** Callback after close animation completes (for cleanup) */
  onDismiss?: () => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

// Animation defaults using tokens
const DEFAULT_DIM_OPACITY = tokens.opacity.overlay;
const DEFAULT_FADE_DURATION = tokens.duration.normal;
const DEFAULT_SLIDE_CONFIG = {
  tension: 65,
  friction: 11,
};

export function BottomSheet({
  visible,
  onClose,
  children,
  height = 'auto',
  style,
  dimOpacity = DEFAULT_DIM_OPACITY,
  slideAnimationConfig = DEFAULT_SLIDE_CONFIG,
  fadeAnimationDuration = DEFAULT_FADE_DURATION,
  onDismiss,
  ...modalProps
}: BottomSheetProps) {
  const { colors } = useTheme();
  const s = useStyles(styles);
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(SCREEN_HEIGHT);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      // Show modal first
      setModalVisible(true);
      // Reset values before animating in
      fadeAnim.value = 0;
      slideAnim.value = SCREEN_HEIGHT;

      // Start both animations when showing
      fadeAnim.value = withTiming(dimOpacity, { duration: fadeAnimationDuration });
      slideAnim.value = withSpring(0, {
        damping: slideAnimationConfig.friction || DEFAULT_SLIDE_CONFIG.friction,
        stiffness: slideAnimationConfig.tension || DEFAULT_SLIDE_CONFIG.tension,
      });
    } else if (modalVisible) {
      // Reverse animations when hiding
      const closeDuration = slideAnimationConfig.duration || tokens.duration.fast;

      fadeAnim.value = withTiming(0, {
        duration: fadeAnimationDuration * 0.7, // Slightly faster when closing
      });
      slideAnim.value = withTiming(
        SCREEN_HEIGHT,
        { duration: closeDuration },
        (finished) => {
          if (finished) {
            runOnJS(setModalVisible)(false);
            if (onDismiss) {
              runOnJS(onDismiss)();
            }
          }
        },
      );
    }
  }, [visible, onDismiss, dimOpacity, fadeAnimationDuration, slideAnimationConfig, modalVisible, fadeAnim, slideAnim]);

  const handleClose = () => {
    // Trigger close animation via parent
    onClose();
  };

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideAnim.value }],
  }));

  return (
    <Modal
      transparent={true}
      visible={modalVisible}
      onRequestClose={handleClose}
      animationType="none" // We handle animations manually
      {...modalProps}
    >
      <View style={s.container}>
        {/* Animated dim overlay with fade - separate from content */}
        <Pressable onPress={handleClose} style={StyleSheet.absoluteFillObject}>
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              s.dimOverlay,
              fadeStyle,
            ]}
          />
        </Pressable>

        {/* Animated sheet content with slide - no opacity applied */}
        <Animated.View
          style={[
            s.sheet,
            {
              backgroundColor: colors.bg.secondary,
              height: height as number | 'auto',
            },
            slideStyle,
            style,
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = createStyles(() => ({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dimOverlay: {
    // Solid black, opacity controlled by animation
    // Using solid color since opacity is animated separately
    backgroundColor: 'rgba(0, 0, 0, 1)',
  },
  sheet: {
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    maxHeight: '90%',
    minHeight: 100,
  },
}));
