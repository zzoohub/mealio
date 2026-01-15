import { useState, useRef, useCallback } from "react";
import { Animated } from "react-native";
import { CameraView, FlashMode } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useCameraI18n } from "@/shared/lib/i18n";
import { useOverlayHelpers } from "@/app/providers/overlay";

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_PHOTOS = 10;

// =============================================================================
// TYPES (Interface-First Design)
// =============================================================================

export interface UseCameraReturn {
  // Refs
  cameraRef: React.RefObject<CameraView | null>;
  captureButtonScale: Animated.Value;

  // State
  flashMode: FlashMode;
  isCapturing: boolean;
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
// HOOK IMPLEMENTATION
// =============================================================================

export function useCamera(): UseCameraReturn {
  const t = useCameraI18n();
  const { toast } = useOverlayHelpers();

  // Refs
  const cameraRef = useRef<CameraView>(null);
  const captureButtonScale = useRef(new Animated.Value(1)).current;

  // State
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [isCapturing, setIsCapturing] = useState(false);
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

      // Capture animation
      Animated.sequence([
        Animated.timing(captureButtonScale, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(captureButtonScale, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(captureButtonScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

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
  }, [isCapturing, canCapture, captureButtonScale]);

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

  const handleDone = useCallback(() => {
    if (capturedPhotos.length === 0) return;

    const photosToSave = [...capturedPhotos];
    setCapturedPhotos([]);

    toast({
      title: t.capture.success,
      message: t.tapToEdit,
      type: "success",
      position: "top",
      showArrow: true,
      duration: 4000,
      onPress: () => {},
    });
  }, [capturedPhotos, toast, t]);

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
    captureButtonScale,

    // State
    flashMode,
    isCapturing,
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
