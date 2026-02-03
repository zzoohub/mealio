import { useCallback, useRef } from "react";
import * as ExpoLocation from "expo-location";

export interface DeviceLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export function useDeviceLocation() {
  const permissionRef = useRef<boolean | null>(null);

  const getLocation = useCallback(async (): Promise<DeviceLocation | undefined> => {
    try {
      // Check / request permission (cache result so we only ask once per mount)
      if (permissionRef.current === null) {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        permissionRef.current = status === "granted";
      }

      if (!permissionRef.current) return undefined;

      const position = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;

      let address: string | undefined;
      try {
        const [result] = await ExpoLocation.reverseGeocodeAsync({ latitude, longitude });
        if (result) {
          const parts = [result.name, result.street, result.city, result.region].filter(Boolean);
          address = parts.join(", ") || undefined;
        }
      } catch {
        // Reverse geocoding is best-effort
      }

      return { latitude, longitude, address };
    } catch {
      return undefined;
    }
  }, []);

  return { getLocation };
}
