import React, { useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useCameraI18n, useNavigationI18n } from "@/shared/lib/i18n";
import { createStyles, useStyles } from "@/shared/ui/theme";
import { tokens } from "@/shared/ui/tokens";
import { useEntryData, useUploadQueueStore } from "@/entities/entry";
import type { Entry } from "@/entities/entry";
import { useIsAuthenticated } from "@/shared/lib/auth";
import { useCamera } from "../model/useCamera";
import { CameraPermissionScreen } from "./CameraPermissionScreen";
import { CameraTopControls } from "./CameraTopControls";
import { CaptureButton } from "./CaptureButton";
import { CameraBottomControls } from "./CameraBottomControls";
import { PhotoStrip } from "./PhotoStrip";

// =============================================================================
// TYPES
// =============================================================================

export interface CameraProps {
  /** Pre-loaded photo URIs from album picker */
  initialPhotos?: string;
  /** Target date ISO string for the entry */
  targetDate?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function Camera({ initialPhotos, targetDate }: CameraProps) {
  const s = useStyles(cameraStyles);
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();
  const t = useCameraI18n();
  const nav = useNavigationI18n();

  const { saveEntry, isAtGuestLimit } = useEntryData();
  const isAuthenticated = useIsAuthenticated();
  const enqueue = useUploadQueueStore((s) => s.enqueue);

  // Parse and validate props from route params (treated as untrusted input)
  const ALLOWED_SCHEMES = ["file://", "ph://", "content://", "asset-library://"];
  const parsedInitialPhotos = initialPhotos
    ? initialPhotos
        .split(",")
        .filter(Boolean)
        .filter((uri) => ALLOWED_SCHEMES.some((s) => uri.startsWith(s)))
        .slice(0, 10)
    : undefined;
  const parsedDate = targetDate ? new Date(targetDate) : undefined;
  const parsedTargetDate =
    parsedDate && !isNaN(parsedDate.getTime()) && parsedDate <= new Date() ? parsedDate : undefined;

  const handleSaveEntry = useCallback(
    async (entry: Omit<Entry, "id" | "createdAt" | "updatedAt">, photoUris?: string[]) => {
      if (isAuthenticated && photoUris?.length) {
        enqueue(entry, photoUris);
        return undefined; // Background upload — no server ID yet
      }
      return saveEntry(entry, photoUris);
    },
    [isAuthenticated, enqueue, saveEntry],
  );

  const handleNavigateToEntry = useCallback(
    (entryId: string) => {
      router.push(`/diary/${entryId}`);
    },
    [router],
  );

  const {
    cameraRef,
    captureButtonPressed,
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
  } = useCamera({
    onSaveEntry: handleSaveEntry,
    onNavigateToEntry: handleNavigateToEntry,
    initialPhotos: parsedInitialPhotos,
    targetDate: parsedTargetDate,
    isAtGuestLimit,
  });

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
        pressedState={captureButtonPressed}
        disabled={isCapturing || isAtGuestLimit}
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
