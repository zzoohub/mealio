/**
 * EntryDetailPage - Main diary entry detail page UI
 *
 * Pure UI scaffold that composes all detail components.
 * Supports inline editing with auto-save callbacks.
 *
 * Layout Structure:
 * - Header with back button
 * - Hero image (4:3 aspect ratio)
 * - AI comment banner (optional)
 * - Context bar (meal type, time, location)
 * - Notes section (inline editable)
 * - Feedback row (rating + would eat again)
 * - AI Nutrition row
 * - Delete button
 *
 * @example
 * ```tsx
 * <EntryDetailPage
 *   entry={entryData}
 *   onBackPress={() => navigation.goBack()}
 *   onNotesChange={(notes) => updateEntry({ notes })}
 *   onRatingChange={(rating) => updateEntry({ rating })}
 *   onDeletePress={() => showDeleteConfirmation()}
 * />
 * ```
 */

import React from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/design-system/tokens';
import { createStyles, useStyles } from '@/design-system/theme';

import { EntryDetailHeader } from './EntryDetailHeader';
import { MealHeroImage } from './MealHeroImage';
import { AICommentBanner } from './AICommentBanner';
import { EntryContextBar } from './EntryContextBar';
import { EntryNotesSection } from './EntryNotesSection';
import { AIAnalysisSection } from './AIAnalysisSection';
import { EntryDeleteButton } from './EntryDeleteButton';
import type { Entry, MealType, NutritionInfo } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export interface EntryDetailPageProps {
  /** Entry data to display */
  entry: Entry | null | undefined;
  /** Whether the page is loading */
  loading?: boolean | undefined;
  /** Whether delete operation is in progress */
  deleting?: boolean | undefined;
  /** Callback when back button is pressed */
  onBackPress?: (() => void) | undefined;
  /** Callback when photo is pressed (fullscreen view or change) */
  onPhotoPress?: (() => void) | undefined;
  /** Callback when meal type changes */
  onMealTypeChange?: ((mealType: MealType) => void) | undefined;
  /** Callback when notes change (auto-save) */
  onNotesChange?: ((notes: string) => void) | undefined;
  /** Callback when rating changes */
  onRatingChange?: ((rating: number) => void) | undefined;
  /** Callback when would-eat-again changes */
  onWouldEatAgainChange?: ((value: boolean) => void) | undefined;
  /** Callback when ingredients change */
  onIngredientsChange?: ((ingredients: string[]) => void) | undefined;
  /** Callback when nutrition changes */
  onNutritionChange?: ((nutrition: NutritionInfo) => void) | undefined;
  /** Callback when delete button is pressed */
  onDeletePress?: (() => void) | undefined;
  /** Test ID for testing */
  testID?: string | undefined;
}

// =============================================================================
// COMPONENT
// =============================================================================

// Header height constant for layout calculations
const HEADER_HEIGHT = 56;

export function EntryDetailPage({
  entry,
  loading = false,
  deleting = false,
  onBackPress,
  onPhotoPress,
  onMealTypeChange,
  onNotesChange,
  onRatingChange,
  onWouldEatAgainChange,
  onIngredientsChange,
  onNutritionChange,
  onDeletePress,
  testID,
}: EntryDetailPageProps) {
  const s = useStyles(styles);
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  // Calculate minimum content height so delete button sticks to bottom when content is short
  const minContentHeight = screenHeight - insets.top - HEADER_HEIGHT;
  const isDisabled = loading || !entry;

  return (
    <View style={[s.container, { paddingTop: insets.top }]} testID={testID}>
      {/* Header - Back button only */}
      <EntryDetailHeader
        onBackPress={onBackPress}
        testID={testID ? `${testID}-header` : undefined}
      />

      {/* Scrollable Content */}
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[
          s.scrollContent,
          { minHeight: minContentHeight },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Image */}
        <MealHeroImage
          photoUri={entry?.meal.photoUri}
          loading={loading && !entry}
          onPress={entry?.meal.photoUri ? onPhotoPress : undefined}
          testID={testID ? `${testID}-hero-image` : undefined}
        />

        {/* AI Comment Banner */}
        <AICommentBanner
          comment={entry?.meal.aiAnalysis?.comment}
          testID={testID ? `${testID}-ai-comment` : undefined}
        />

        {/* Context Bar */}
        {entry && (
          <EntryContextBar
            mealType={entry.meal.mealType}
            timestamp={entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp)}
            location={entry.location}
            onMealTypeChange={onMealTypeChange}
            disabled={isDisabled}
            testID={testID ? `${testID}-context-bar` : undefined}
          />
        )}

        {/* Notes Section - Inline Editable with Feedback */}
        <EntryNotesSection
          notes={entry?.notes}
          rating={entry?.rating}
          wouldEatAgain={entry?.wouldEatAgain}
          onNotesChange={onNotesChange}
          onRatingChange={onRatingChange}
          onWouldEatAgainChange={onWouldEatAgainChange}
          disabled={isDisabled}
          testID={testID ? `${testID}-notes` : undefined}
        />

        {/* AI Analysis Section - Ingredients & Nutrition */}
        <AIAnalysisSection
          ingredients={entry?.meal.ingredients ?? entry?.meal.aiAnalysis?.ingredients}
          nutrition={entry?.meal.nutrition}
          onIngredientsChange={onIngredientsChange}
          onNutritionChange={onNutritionChange}
          disabled={isDisabled}
          testID={testID ? `${testID}-ai-analysis` : undefined}
        />

        {/* Spacer to push delete button down */}
        <View style={s.spacer} />

        {/* Delete Button */}
        <EntryDeleteButton
          onPress={onDeletePress}
          loading={deleting}
          disabled={isDisabled}
          testID={testID ? `${testID}-delete` : undefined}
        />
      </ScrollView>
    </View>
  );
}

export default EntryDetailPage;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  spacer: {
    flex: 1,
  },
}));
