import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { AppProvider } from "@/app/providers";
import "react-native-reanimated";
import "@/shared/lib/i18n";

export default function RootLayout() {
  return (
    <AppProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          gestureEnabled: true,
          animationDuration: 300,
        }}
      >
        {/* Initial Screen */}
        <Stack.Screen
          name="index"
          options={{
            gestureEnabled: false,
            animation: "fade",
          }}
        />

        {/* Auth Flow */}
        <Stack.Screen
          name="auth"
          options={{
            gestureEnabled: true,
            animation: "slide_from_right",
          }}
        />

        {/* Diary Flow */}
        <Stack.Screen
          name="diary"
          options={{
            animation: "slide_from_right",
            gestureEnabled: true,
          }}
        />

        {/* Settings Flow - Connected Navigation */}
        <Stack.Screen
          name="settings"
          options={{
            animation: "slide_from_right",
            gestureEnabled: true,
          }}
        />

      </Stack>
      <StatusBar style="auto" />
    </AppProvider>
  );
}
