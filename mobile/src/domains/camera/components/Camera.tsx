import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useCameraI18n, useNavigationI18n } from "@/lib/i18n";
import { createStyles, useStyles } from "@/design-system/theme";
import { tokens } from "@/design-system/tokens";
import { useCamera } from "../hooks/useCamera";
import { CameraPermissionScreen } from "./CameraPermissionScreen";
import { CameraTopControls } from "./CameraTopControls";
import { CaptureButton } from "./CaptureButton";
import { CameraBottomControls } from "./CameraBottomControls";
import { PhotoStrip } from "./PhotoStrip";

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function Camera() {
  const s = useStyles(cameraStyles);
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();
  const t = useCameraI18n();
  const nav = useNavigationI18n();

  const {
    cameraRef,
    captureButtonScale,
    flashMode,
    isCapturing,
    capturedPhotos,
    hasPhotos,
    capturePhoto,
    pickFromGallery,
    removePhoto,
    toggleFlash,
    handleDone,
    getFlashIcon,
  } = useCamera();

  // Loading state
  if (!permission) {
    return (
      <View style={[styles.loadingContainer, s.loadingContainer]}>
        <Text style={[styles.loadingText, s.loadingText]}>{t.preparing}</Text>
      </View>
    );
  }

  // Permission not granted
  if (!permission.granted) {
    return (
      <CameraPermissionScreen
        onRequestPermission={requestPermission}
        labels={{
          title: t.permissions.title,
          message: t.permissions.message,
          buttonText: t.welcome.enableCamera,
        }}
      />
    );
  }

  // Main camera view
  return (
    <View style={styles.container}>
      {/* Camera View */}
      <CameraView ref={cameraRef} style={styles.camera} facing="back" flash={flashMode} mode="picture" />

      {/* Top Controls */}
      <CameraTopControls
        flashIcon={getFlashIcon()}
        onToggleFlash={toggleFlash}
        onSettingsPress={() => router.push("/settings")}
      />

      {/* Capture Button */}
      <CaptureButton
        onCapture={capturePhoto}
        isCapturing={isCapturing}
        scaleValue={captureButtonScale}
        disabled={isCapturing}
      />

      {/* Bottom Controls - Changes based on photo state */}
      {!hasPhotos ? (
        <CameraBottomControls
          onDiaryPress={() => router.push("/diary")}
          onGalleryPress={pickFromGallery}
          diaryLabel={nav.diary}
        />
      ) : (
        <PhotoStrip
          photos={capturedPhotos}
          onRemovePhoto={removePhoto}
          onDone={handleDone}
          onPickFromGallery={pickFromGallery}
          photoCount={capturedPhotos.length}
        />
      )}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000", // Camera screens always use black background
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: tokens.typography.fontSize.body,
  },
});

const cameraStyles = createStyles((colors) => ({
  loadingContainer: {
    backgroundColor: colors.bg.primary,
  },
  loadingText: {
    color: colors.text.primary,
  },
}));
