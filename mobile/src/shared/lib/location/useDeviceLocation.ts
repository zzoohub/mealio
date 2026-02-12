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

      // Use last known location for instant response, fall back to fresh GPS with timeout
      const position =
        await ExpoLocation.getLastKnownPositionAsync() ??
        await Promise.race([
          ExpoLocation.getCurrentPositionAsync({
            accuracy: ExpoLocation.Accuracy.Low,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Location timeout")), 2000),
          ),
        ]);

      const { latitude, longitude } = position.coords;

      // Reverse geocode in background — don't block the save
      let address: string | undefined;
      try {
        const [result] = await Promise.race([
          ExpoLocation.reverseGeocodeAsync({ latitude, longitude }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Geocode timeout")), 1000),
          ),
        ]);
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
