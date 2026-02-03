import { useState, useRef, useCallback } from "react";
import { CameraView, FlashMode } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { MealType } from "@/entities/meal";
import type { Entry } from "@/entities/entry";
import { useCameraI18n } from "@/shared/lib/i18n";
import { useOverlayHelpers } from "@/app/providers/overlay";

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_PHOTOS = 10;

// =============================================================================
// TYPES (Interface-First Design)
// =============================================================================

export interface UseCameraOptions {
  onSaveEntry: (entry: Omit<Entry, "id" | "createdAt" | "updatedAt">) => Promise<void>;
}

export interface UseCameraReturn {
  // Refs
  cameraRef: React.RefObject<CameraView | null>;
  /** Shared value for capture button animation (0 = normal, 1 = pressed) */
  captureButtonPressed: SharedValue<number>;

  // State
  flashMode: FlashMode;
  isCapturing: boolean;
  isSaving: boolean;
  capturedPhotos: string[];

  // Computed
  canCapture: boolean;
  remainingPhotos: number;
  hasPhotos: boolean;

  // Actions
  capturePhoto: () => Promise<void>;
  pickFromGallery: () => Promise<void>;
  removePhoto: (index: number) => void;
  toggleFlash: () => void;
  handleDone: () => void;
  getFlashIcon: () => "flash" | "flash-outline" | "flash-off";
}

// =============================================================================
// HELPERS
// =============================================================================

export function detectMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 10) return MealType.BREAKFAST;
  if (hour < 14) return MealType.LUNCH;
  if (hour < 17) return MealType.SNACK;
  return MealType.DINNER;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useCamera(options: UseCameraOptions): UseCameraReturn {
  const { onSaveEntry } = options;
  const t = useCameraI18n();
  const { toast } = useOverlayHelpers();

  // Refs
  const cameraRef = useRef<CameraView>(null);

  // Reanimated shared value for capture button animation
  const captureButtonPressed = useSharedValue(0);

  // State
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);

  // Computed values
  const canCapture = capturedPhotos.length < MAX_PHOTOS;
  const remainingPhotos = MAX_PHOTOS - capturedPhotos.length;
  const hasPhotos = capturedPhotos.length > 0;

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current || isCapturing) return;
    if (!canCapture) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    try {
      setIsCapturing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Capture animation using Reanimated
      captureButtonPressed.set(
        withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(1.2, { duration: 200 }),
          withTiming(0, { duration: 100 })
        )
      );

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        setCapturedPhotos((prev) => [...prev, photo.uri]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Photo capture failed:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, canCapture, captureButtonPressed]);

  const pickFromGallery = useCallback(async () => {
    if (remainingPhotos <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remainingPhotos,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((asset) => asset.uri);
      setCapturedPhotos((prev) => [...prev, ...newUris]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [remainingPhotos]);

  const removePhoto = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCapturedPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDone = useCallback(async () => {
    if (capturedPhotos.length === 0 || isSaving) return;

    setIsSaving(true);
    try {
      const entry: Omit<Entry, "id" | "createdAt" | "updatedAt"> = {
        userId: "",
        timestamp: new Date(),
        notes: "",
        meal: {
          photoUri: capturedPhotos[0]!,
          mealType: detectMealType(),
        },
      };

      await onSaveEntry(entry);
      setCapturedPhotos([]);

      toast({
        title: t.capture.success,
        message: t.capture.successMessage,
        type: "success",
        position: "top",
        showArrow: true,
        duration: 4000,
      });
    } catch (error) {
      console.error("Failed to save entry:", error);
      toast({
        title: t.capture.error,
        message: t.capture.errorMessage,
        type: "error",
        position: "top",
        duration: 4000,
      });
    } finally {
      setIsSaving(false);
    }
  }, [capturedPhotos, isSaving, onSaveEntry, toast, t]);

  const toggleFlash = useCallback(() => {
    const modes: FlashMode[] = ["off", "on", "auto"];
    const currentIndex = modes.indexOf(flashMode);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex] || "off";
    setFlashMode(nextMode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [flashMode]);

  const getFlashIcon = useCallback((): "flash" | "flash-outline" | "flash-off" => {
    switch (flashMode) {
      case "on":
        return "flash";
      case "auto":
        return "flash-outline";
      default:
        return "flash-off";
    }
  }, [flashMode]);

  return {
    // Refs
    cameraRef,
    captureButtonPressed,

    // State
    flashMode,
    isCapturing,
    isSaving,
    capturedPhotos,

    // Computed
    canCapture,
    remainingPhotos,
    hasPhotos,

    // Actions
    capturePhoto,
    pickFromGallery,
    removePhoto,
    toggleFlash,
    handleDone,
    getFlashIcon,
  };
}
