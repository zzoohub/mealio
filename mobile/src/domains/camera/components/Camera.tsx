import React, { useState, useRef, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image, ScrollView } from "react-native";
import { CameraView, useCameraPermissions, FlashMode } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCameraI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useOverlayHelpers } from "@/components/Overlay";

const MAX_PHOTOS = 10;

interface CameraProps {
  onNavigate: (section: string) => void;
  isActive: boolean;
}

export default function Camera({ onNavigate }: CameraProps) {
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const t = useCameraI18n();
  const { toast } = useOverlayHelpers();

  // Animations
  const captureButtonScale = useRef(new Animated.Value(1)).current;

  const capturePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;
    if (capturedPhotos.length >= MAX_PHOTOS) {
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
  };

  const pickFromGallery = async () => {
    const remainingSlots = MAX_PHOTOS - capturedPhotos.length;
    if (remainingSlots <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((asset) => asset.uri);
      setCapturedPhotos((prev) => [...prev, ...newUris]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const removePhoto = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCapturedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

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
      onPress: () => {
        router.push({
          pathname: "/meal-detail",
          params: { photoUris: JSON.stringify(photosToSave), isNew: "true" },
        });
      },
    });
  }, [capturedPhotos, toast, t, router]);

  const toggleFlash = () => {
    const modes: FlashMode[] = ["off", "on", "auto"];
    const currentIndex = modes.indexOf(flashMode);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex] || "off"; // Fallback to 'off' if undefined
    setFlashMode(nextMode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getFlashIcon = () => {
    switch (flashMode) {
      case "on":
        return "flash";
      case "auto":
        return "flash-outline";
      default:
        return "flash-off";
    }
  };

  if (!permission) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>{t.preparing}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="camera-outline" size={80} color={theme.colors.primary} />
        <Text style={[styles.permissionTitle, { color: theme.colors.text }]}>{t.permissions.title}</Text>
        <Text style={[styles.permissionMessage, { color: theme.colors.textSecondary }]}>{t.permissions.message}</Text>
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: theme.colors.primary }]}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>{t.welcome.enableCamera}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" flash={flashMode} mode="picture">
        {/* Top Controls */}
        <View style={styles.topControls}>
          <View style={styles.controlButton} />

          <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
            <Ionicons name={getFlashIcon()} size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Center Capture Area */}
        <TouchableOpacity style={styles.captureArea} onPress={capturePhoto} disabled={isCapturing} activeOpacity={0.8}>
          <Animated.View style={[styles.captureButton, { transform: [{ scale: captureButtonScale }] }]}>
            <View style={[styles.captureRing, isCapturing && styles.capturingRing]}>
              <View style={[styles.captureInner, isCapturing && styles.capturingInner]} />
            </View>
          </Animated.View>
        </TouchableOpacity>

        {/* Bottom Controls - Changes based on photo state */}
        {capturedPhotos.length === 0 ? (
          <View style={styles.bottomControls}>
            <TouchableOpacity style={styles.bottomButton} onPress={() => onNavigate("progress")}>
              <Ionicons name="bar-chart-outline" size={24} color="white" />
              <Text style={styles.bottomButtonText}>{t.progress}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomButton} onPress={pickFromGallery}>
              <Ionicons name="images-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Gallery Button - Right side */}
            <TouchableOpacity style={styles.galleryButtonFloating} onPress={pickFromGallery}>
              <Ionicons name="images-outline" size={24} color="white" />
              <View style={styles.photoCountBadge}>
                <Text style={styles.photoCountText}>{capturedPhotos.length}</Text>
              </View>
            </TouchableOpacity>

            {/* Thumbnail Strip - Bottom */}
            <View style={styles.thumbnailContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbnailScrollView}
                contentContainerStyle={styles.thumbnailScroll}
              >
                {capturedPhotos.map((uri, index) => (
                  <View key={uri} style={styles.thumbnailWrapper}>
                    <Image source={{ uri }} style={styles.thumbnail} />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removePhoto(index)}
                    >
                      <Ionicons name="close-circle" size={20} color="white" />
                    </TouchableOpacity>
                    <View style={styles.thumbnailIndex}>
                      <Text style={styles.thumbnailIndexText}>{index + 1}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
                <Ionicons name="checkmark" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </>
        )}

      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  camera: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 16,
    textAlign: "center",
  },
  permissionMessage: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  topControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureArea: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
    left: "50%",
    marginLeft: -40,
  },
  captureButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  captureRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  capturingRing: {
    borderColor: "#FF6B35",
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
  },
  capturingInner: {
    backgroundColor: "#FF6B35",
  },
  bottomControls: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomButton: {
    alignItems: "center",
    padding: 8,
    position: "relative",
  },
  bottomButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  galleryButtonFloating: {
    position: "absolute",
    bottom: 120,
    right: 24,
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 24,
  },
  photoCountBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#FF6B35",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  photoCountText: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
  },
  thumbnailContainer: {
    position: "absolute",
    bottom: 40,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 6,
  },
  thumbnailScrollView: {
    flex: 1,
  },
  thumbnailScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 8,
  },
  thumbnailWrapper: {
    position: "relative",
    paddingTop: 6,
    paddingRight: 6,
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  removeButton: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 10,
  },
  thumbnailIndex: {
    position: "absolute",
    bottom: 2,
    left: 2,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  thumbnailIndexText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },
  doneButton: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FF6B35",
    width: 42,
    height: 42,
    borderRadius: 21,
    marginLeft: 10,
  },
});
