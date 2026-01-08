import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { CameraView, useCameraPermissions, FlashMode } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useCameraI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

interface CameraProps {
  onNavigate: (section: string) => void;
  isActive: boolean;
}

export default function Camera({ onNavigate }: CameraProps) {
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [isCapturing, setIsCapturing] = useState(false);
  const [recentMeals] = useState([]);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const t = useCameraI18n();

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const captureButtonScale = useRef(new Animated.Value(1)).current;
  const aiOverlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulsing animation for streak indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const capturePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;

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
        // Show AI processing overlay
        showAIProcessing(photo.uri);
      }
    } catch (error) {
      console.error("Photo capture failed:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCapturing(false);
    }
  };

  const showAIProcessing = (photoUri: string) => {
    // Show AI overlay
    Animated.timing(aiOverlayOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Simulate AI processing
    setTimeout(() => {
      router.push({
        pathname: "/meal-detail",
        params: { photoUri, isNew: "true" },
      });

      // Hide overlay
      Animated.timing(aiOverlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 2500);
  };

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
          {/* Phase 2: Discover feature
          <TouchableOpacity style={styles.controlButton} onPress={() => onNavigate("discover")}>
            <Ionicons name="search" size={24} color="white" />
          </TouchableOpacity>
          */}

          <View style={styles.controlButton} />

          <Animated.View style={[styles.streakIndicator, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.streakText}>🔥 7</Text>
          </Animated.View>

          <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
            <Ionicons name={getFlashIcon()} size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* AI Viewfinder Overlay */}
        <View style={styles.viewfinderOverlay}>
          <View style={styles.gridOverlay}>
            {/* Rule of thirds grid */}
            <View style={styles.gridLine} />
            <View style={[styles.gridLine, styles.gridLineVertical]} />
          </View>

          <Text style={styles.hintText}>{t.hintText}</Text>
        </View>

        {/* Center Capture Area */}
        <TouchableOpacity style={styles.captureArea} onPress={capturePhoto} disabled={isCapturing} activeOpacity={0.8}>
          <Animated.View style={[styles.captureButton, { transform: [{ scale: captureButtonScale }] }]}>
            <View style={[styles.captureRing, isCapturing && styles.capturingRing]}>
              <View style={[styles.captureInner, isCapturing && styles.capturingInner]} />
            </View>
          </Animated.View>
        </TouchableOpacity>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <View style={styles.leftControls}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => onNavigate("progress")}>
              <Ionicons name="bar-chart-outline" size={20} color="white" />
              <Text style={styles.secondaryButtonText}>{t.progress}</Text>
            </TouchableOpacity>
            {/* Phase 2: Social feature
            <TouchableOpacity style={styles.secondaryButton} onPress={() => onNavigate("social")}>
              <Ionicons name="people-outline" size={20} color="white" />
              <Text style={styles.secondaryButtonText}>Social</Text>
            </TouchableOpacity>
            */}
          </View>

          <View style={styles.centerHint}>
            {isCapturing && <Text style={styles.capturingText}>{t.capturingText}</Text>}
          </View>
        </View>

        {/* Recent Meals Quick Access */}
        {recentMeals.length > 0 && (
          <View style={styles.recentMeals}>
            <Text style={styles.recentMealsTitle}>{t.recent}</Text>
            {/* Recent meals carousel would go here */}
          </View>
        )}

        {/* AI Processing Overlay */}
        <Animated.View
          style={[styles.aiProcessingOverlay, { opacity: aiOverlayOpacity }]}
          pointerEvents={isCapturing ? "auto" : "none"}
        >
          <LinearGradient colors={["rgba(0,0,0,0.8)", "rgba(0,0,0,0.6)"]} style={styles.aiGradient}>
            <View style={styles.aiProcessingContent}>
              <View style={styles.aiScanningAnimation}>
                <Ionicons name="scan" size={60} color="#FF6B35" />
              </View>
              <Text style={styles.aiProcessingTitle}>{t.aiAnalysis}</Text>
              <Text style={styles.aiProcessingSubtitle}>{t.aiAnalysisDesc}</Text>
              <View style={styles.aiProgressBar}>
                <Animated.View style={styles.aiProgressFill} />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
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
  streakIndicator: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  streakText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  viewfinderOverlay: {
    position: "absolute",
    top: 120,
    left: 20,
    right: 20,
    bottom: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  gridOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  gridLine: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    height: 1,
    width: "100%",
    top: "33%",
  },
  gridLineVertical: {
    height: "100%",
    width: 1,
    left: "33%",
    top: 0,
  },
  hintText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  captureArea: {
    position: "absolute",
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 40,
    paddingHorizontal: 20,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  leftControls: {
    flexDirection: "row",
    gap: 16,
  },
  secondaryButton: {
    alignItems: "center",
    padding: 8,
  },
  secondaryButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  centerHint: {
    flex: 1,
    alignItems: "center",
  },
  capturingText: {
    color: "#FF6B35",
    fontSize: 16,
    fontWeight: "600",
  },
  recentMeals: {
    position: "absolute",
    bottom: 180,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 12,
    padding: 12,
  },
  recentMealsTitle: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  aiProcessingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  aiGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  aiProcessingContent: {
    alignItems: "center",
    padding: 32,
  },
  aiScanningAnimation: {
    marginBottom: 24,
  },
  aiProcessingTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  aiProcessingSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  aiProgressBar: {
    width: 200,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  aiProgressFill: {
    height: "100%",
    backgroundColor: "#FF6B35",
    width: "100%",
  },
});
