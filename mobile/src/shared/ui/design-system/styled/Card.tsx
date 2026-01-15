/**
 * Card - Styled card component with compound components
 *
 * Combines the useCard headless hook with design tokens
 * to create a fully accessible, themed card component.
 *
 * Uses the compound component pattern for flexible composition.
 *
 * @example
 * ```tsx
 * <Card variant="elevated">
 *   <Card.Header>
 *     <Card.Title>Recipe of the Day</Card.Title>
 *   </Card.Header>
 *   <Card.Content>
 *     <Text>Delicious pasta with homemade sauce...</Text>
 *   </Card.Content>
 *   <Card.Footer>
 *     <Button>View Recipe</Button>
 *   </Card.Footer>
 * </Card>
 *
 * // Pressable card
 * <Card variant="outline" pressable onPress={() => navigate('Details')}>
 *   <Card.Content>
 *     <Text>Tap to view details</Text>
 *   </Card.Content>
 * </Card>
 * ```
 */

import React, { createContext, useContext, useMemo } from 'react';
import {
  View,
  Text as RNText,
  Pressable,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { useCard, type UseCardProps, type CardVariant } from '../headless';
import { tokens } from '../tokens';
import { createStyles, useStyles } from '../theme';

// =============================================================================
// TYPES
// =============================================================================

export type { CardVariant } from '../headless';

export interface CardProps extends UseCardProps {
  /** Card content */
  children?: React.ReactNode;
  /** Custom style */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

export interface CardHeaderProps {
  /** Header content */
  children?: React.ReactNode;
  /** Custom style */
  style?: ViewStyle;
}

export interface CardTitleProps {
  /** Title text or content */
  children?: React.ReactNode;
  /** Custom style */
  style?: TextStyle;
}

export interface CardContentProps {
  /** Content */
  children?: React.ReactNode;
  /** Custom style */
  style?: ViewStyle;
}

export interface CardFooterProps {
  /** Footer content */
  children?: React.ReactNode;
  /** Custom style */
  style?: ViewStyle;
}

// =============================================================================
// CONTEXT
// =============================================================================

interface CardContextValue {
  variant: CardVariant;
  isPressable: boolean;
  isPressed: boolean;
}

const CardContext = createContext<CardContextValue | null>(null);

function useCardContext() {
  const context = useContext(CardContext);
  if (!context) {
    throw new Error('Card compound components must be used within a Card');
  }
  return context;
}

// =============================================================================
// ANIMATED PRESSABLE
// =============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// =============================================================================
// COMPOUND COMPONENTS
// =============================================================================

function CardHeader({ children, style }: CardHeaderProps) {
  const s = useStyles(styles);
  return <View style={[s.header, style]}>{children}</View>;
}

function CardTitle({ children, style }: CardTitleProps) {
  const s = useStyles(styles);

  return (
    <RNText style={[s.title, style]}>
      {children}
    </RNText>
  );
}

function CardContent({ children, style }: CardContentProps) {
  const s = useStyles(styles);
  return <View style={[s.content, style]}>{children}</View>;
}

function CardFooter({ children, style }: CardFooterProps) {
  const s = useStyles(styles);
  return <View style={[s.footer, style]}>{children}</View>;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function CardRoot({
  variant = 'elevated',
  children,
  style,
  testID,
  ...hookProps
}: CardProps) {
  const s = useStyles(styles);
  const { cardProps, state } = useCard({ variant, ...hookProps });
  const { isPressable, isPressed, isDisabled } = state;

  // Animation value for press feedback
  const scale = useSharedValue(1);

  // Get variant-specific styles
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return s.elevated;
      case 'outline':
        return s.outline;
      case 'filled':
        return s.filled;
      case 'ghost':
        return s.ghost;
      default:
        return {};
    }
  };

  const variantStyles = getVariantStyles();

  // Animated scale style for pressable cards
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  // Destructure web-only props from cardProps
  const { tabIndex, onKeyDown, ...pressableCardProps } = cardProps;

  // Handle press in/out for animation
  const handlePressIn = () => {
    if (isPressable) {
      scale.value = withTiming(0.98, { duration: tokens.duration.fast });
    }
    pressableCardProps.onPressIn?.();
  };

  const handlePressOut = () => {
    if (isPressable) {
      scale.value = withTiming(1, { duration: tokens.duration.fast });
    }
    pressableCardProps.onPressOut?.();
  };

  // Context value
  const contextValue = useMemo(
    () => ({
      variant,
      isPressable,
      isPressed,
    }),
    [variant, isPressable, isPressed]
  );

  const cardStyle: ViewStyle[] = [
    s.base,
    variantStyles,
    isPressed && isPressable ? s.pressed : undefined,
    isDisabled ? s.disabled : undefined,
    style,
  ].filter(Boolean) as ViewStyle[];

  // Render pressable or non-pressable card
  if (isPressable) {
    return (
      <CardContext.Provider value={contextValue}>
        <AnimatedPressable
          {...pressableCardProps}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          testID={testID}
          style={[cardStyle, animatedStyle]}
        >
          {children}
        </AnimatedPressable>
      </CardContext.Provider>
    );
  }

  // For non-pressable cards, also exclude web-only props from View
  const { role, 'aria-disabled': ariaDisabled, 'aria-selected': ariaSelected, ...viewCardProps } = pressableCardProps;

  return (
    <CardContext.Provider value={contextValue}>
      <View testID={testID} style={cardStyle} {...viewCardProps}>
        {children}
      </View>
    </CardContext.Provider>
  );
}

// =============================================================================
// COMPOUND EXPORT
// =============================================================================

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Content: CardContent,
  Footer: CardFooter,
});

export default Card;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors, { elevation }) => ({
  base: {
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: tokens.spacing.component.lg,
    paddingTop: tokens.spacing.component.lg,
    paddingBottom: tokens.spacing.component.sm,
  },
  title: {
    fontSize: tokens.typography.fontSize.h3,
    fontWeight: tokens.typography.fontWeight.semibold,
    lineHeight: tokens.typography.fontSize.h3 * tokens.typography.lineHeight.heading,
    color: colors.text.primary,
  },
  content: {
    paddingHorizontal: tokens.spacing.component.lg,
    paddingVertical: tokens.spacing.component.md,
  },
  footer: {
    paddingHorizontal: tokens.spacing.component.lg,
    paddingTop: tokens.spacing.component.sm,
    paddingBottom: tokens.spacing.component.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.component.sm,
  },
  pressed: {
    opacity: tokens.opacity.pressed,
  },
  disabled: {
    opacity: tokens.opacity.disabled,
  },
  // Variant styles
  elevated: {
    backgroundColor: colors.bg.elevated,
    ...elevation.card,
  },
  outline: {
    backgroundColor: colors.bg.primary,
    borderWidth: tokens.borderWidth.default,
    borderColor: colors.border.default,
  },
  filled: {
    backgroundColor: colors.bg.secondary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
}));
