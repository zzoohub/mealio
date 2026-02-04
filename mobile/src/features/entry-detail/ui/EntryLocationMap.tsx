/**
 * EntryLocationMap - Map preview showing meal location
 *
 * Displays a static MapView with a marker at the entry's location.
 * Tapping opens the location in the device's Maps app.
 * Only renders when location data (lat/lng) is available.
 */

import { useCallback } from 'react';
import { View, Text, Pressable, Linking, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/shared/ui/tokens';
import { createStyles, useStyles, useIsDarkMode } from '@/shared/ui/theme';
import { useDiaryI18n } from '@/shared/lib/i18n';
import type { Location } from '@/entities/entry';

// =============================================================================
// TYPES
// =============================================================================

export interface EntryLocationMapProps {
  location?: Location | null | undefined;
  testID?: string | undefined;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MAP_HEIGHT = 200;
const MAP_DELTA = 0.005;

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#75818f' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function EntryLocationMap({ location, testID }: EntryLocationMapProps) {
  const s = useStyles(styles);
  const isDark = useIsDarkMode();
  const diary = useDiaryI18n();

  const handleOpenMaps = useCallback(() => {
    if (!location) return;
    const { latitude, longitude } = location;
    const label = location.address?.split(',')[0] ?? '';
    const query = label ? encodeURIComponent(label) : `${latitude},${longitude}`;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}&query_place_id&center=${latitude},${longitude}`);
  }, [location]);

  if (!location?.latitude || !location?.longitude) return null;

  const region = {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: MAP_DELTA,
    longitudeDelta: MAP_DELTA,
  };

  return (
    <View style={s.container} testID={testID}>
      {/* Map */}
      <Pressable onPress={handleOpenMaps} accessibilityLabel={diary.openInMaps} accessibilityRole="button">
        <View style={s.mapWrapper}>
          <MapView
            style={s.map}
            region={region}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            provider={PROVIDER_GOOGLE}
            {...(Platform.OS === 'android' ? { liteMode: true } : {})}
            {...(isDark ? { customMapStyle: DARK_MAP_STYLE } : {})}
            pointerEvents="none"
          >
            <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }} />
          </MapView>
        </View>
      </Pressable>

      {/* Address */}
      {location.address && (
        <Pressable onPress={handleOpenMaps} style={s.addressRow}>
          <Text style={s.address} numberOfLines={1}>{location.address}</Text>
          <Ionicons name="open-outline" size={14} color={s.iconColor.color as string} />
        </Pressable>
      )}
    </View>
  );
}

export default EntryLocationMap;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    paddingTop: tokens.spacing.component.md,
    borderBottomWidth: tokens.borderWidth.default,
    borderBottomColor: colors.border.default,
  },
  mapWrapper: {
    height: MAP_HEIGHT,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.component.lg,
    paddingVertical: tokens.spacing.component.sm,
    gap: tokens.spacing.component.sm,
  },
  address: {
    flex: 1,
    fontSize: tokens.typography.fontSize.caption,
    color: colors.text.secondary,
    lineHeight: tokens.typography.fontSize.caption * tokens.typography.lineHeight.body,
  },
  iconColor: {
    color: colors.text.tertiary,
  },
}));
