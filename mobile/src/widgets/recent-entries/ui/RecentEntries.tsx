/**
 * RecentEntries - Horizontal scrolling list of recent entries
 *
 * Displays the user's most recent diary entries in a horizontal carousel.
 * Uses Card component from design system for entry items.
 *
 * Features:
 * - Horizontal scroll with entry cards
 * - Loading and empty states
 * - Navigation to entry detail
 * - "See All" action to view full history
 *
 * @example
 * ```tsx
 * <RecentEntries onSeeAll={() => navigation.navigate('DiaryHistory')} />
 * ```
 */

import React, { useState, useEffect } from 'react';
import { ScrollView, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Box, Text, HStack, VStack, Card } from '@/shared/ui/styled';
import { createStyles, useStyles } from '@/shared/ui/theme';
import { tokens } from '@/shared/ui/tokens';
import type { Entry } from '@/entities/entry';
import { entryStorageUtils, generateMockEntries } from '@/features/diary-feed/model/useEntryStorage';

// =============================================================================
// TYPES
// =============================================================================

interface RecentEntriesProps {
  onSeeAll?: () => void;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface EntryCardItemProps {
  entry: Entry;
  onPress: () => void;
  formatTime: (date: Date) => string;
}

const getMealTypeLabel = (mealType: string): string => {
  switch (mealType.toLowerCase()) {
    case "breakfast":
      return "Breakfast";
    case "lunch":
      return "Lunch";
    case "dinner":
      return "Dinner";
    case "snack":
      return "Snack";
    default:
      return "Meal";
  }
};

function EntryCardItem({ entry, onPress, formatTime }: EntryCardItemProps) {
  const s = useStyles(entryCardStyles);

  return (
    <Card
      variant="elevated"
      pressable
      onPress={onPress}
      style={s.card}
    >
      <Image source={{ uri: entry.meal.photoUri }} style={s.image} />
      <VStack gap="xs" style={s.content}>
        <Text variant="bodySmall" weight="medium" numberOfLines={2}>
          {getMealTypeLabel(entry.meal.mealType)}
        </Text>
        <Text variant="caption" color="secondary">
          {formatTime(entry.timestamp)}
        </Text>
        {entry.meal.nutrition && (
          <Text variant="caption" color="link" weight="medium">
            {entry.meal.nutrition.calories} cal
          </Text>
        )}
      </VStack>
    </Card>
  );
}

interface HeaderProps {
  onSeeAll?: (() => void) | undefined;
}

function Header({ onSeeAll }: HeaderProps) {
  const s = useStyles(headerStyles);

  return (
    <HStack justify="space-between" align="center" style={{ marginBottom: tokens.spacing.component.lg }}>
      <Text variant="h3" weight="semibold">
        Recent Meals
      </Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <HStack gap="xs" align="center">
            <Text variant="bodySmall" color="link">
              See All
            </Text>
            <Ionicons
              name="chevron-forward"
              size={tokens.size.icon.xs}
              color={s.chevron.color}
            />
          </HStack>
        </TouchableOpacity>
      )}
    </HStack>
  );
}

// Constants for consistent height across all states
// Card height: image (100) + content padding (12*2) + text lines (~60) = ~184
// This minHeight ensures loading/empty states match the scrollable content area
const CONTENT_MIN_HEIGHT = 184;

function LoadingState() {
  return (
    <Box mb="lg">
      <Header />
      <Box minHeight={CONTENT_MIN_HEIGHT} center>
        <Text variant="bodySmall" color="secondary">
          Loading meals...
        </Text>
      </Box>
    </Box>
  );
}

function EmptyState() {
  return (
    <Box mb="lg">
      <Header />
      <Box minHeight={CONTENT_MIN_HEIGHT} center>
        <Text variant="bodySmall" color="secondary" align="center">
          No meals logged yet. Start by taking a photo of your meal!
        </Text>
      </Box>
    </Box>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function RecentEntries({ onSeeAll }: RecentEntriesProps) {
  const [recentEntries, setRecentEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mockDataInitialized, setMockDataInitialized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadRecentEntries();
  }, []);

  const loadRecentEntries = async () => {
    try {
      setIsLoading(true);
      let entries = await entryStorageUtils.getRecentEntries(6);

      // For development: add mock data if no entries exist
      if (entries.length === 0 && !mockDataInitialized) {
        const mockEntries = generateMockEntries();
        // Save mock entries to storage so they can be found later
        for (const mockEntry of mockEntries) {
          const entryData: Parameters<typeof entryStorageUtils.saveEntry>[0] = {
            userId: mockEntry.userId,
            timestamp: mockEntry.timestamp,
            notes: mockEntry.notes,
            meal: mockEntry.meal,
          };
          if (mockEntry.location) {
            entryData.location = mockEntry.location;
          }
          await entryStorageUtils.saveEntry(entryData);
        }
        // Reload entries after saving mock data
        entries = await entryStorageUtils.getRecentEntries(6);
        setMockDataInitialized(true);
      }

      setRecentEntries(entries);
    } catch (error) {
      console.error('Error loading recent entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEntryPress = (entry: Entry) => {
    // Navigate to entry detail for editing
    router.push(`/diary/${entry.id}`);
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (recentEntries.length === 0) {
    return <EmptyState />;
  }

  return (
    <Box mb="lg">
      <Header onSeeAll={onSeeAll} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 0 }}
      >
        {recentEntries.map((entry) => (
          <EntryCardItem
            key={entry.id}
            entry={entry}
            onPress={() => handleEntryPress(entry)}
            formatTime={formatRelativeTime}
          />
        ))}
      </ScrollView>
    </Box>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const entryCardStyles = createStyles((colors) => ({
  card: {
    width: 140,
    marginRight: tokens.spacing.component.md,
    overflow: 'hidden' as const,
  },
  image: {
    width: '100%' as const,
    height: 100,
    backgroundColor: colors.border.default,
  },
  content: {
    padding: tokens.spacing.component.md,
  },
}));

const headerStyles = createStyles((colors) => ({
  chevron: {
    color: colors.interactive.primary,
  },
}));
