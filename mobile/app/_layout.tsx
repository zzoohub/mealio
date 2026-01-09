import { StatusBar } from "expo-status-bar";
import { Stack, Slot } from "expo-router";
import { AppProvider } from "@/providers";
import "react-native-reanimated";
import "@/lib/i18n";

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
            gestureEnabled: false,
            animation: "fade",
          }}
        />

        {/* Main App with Orbital Navigation */}
        <Stack.Screen
          name="(main)"
          options={{
            gestureEnabled: false,
          }}
        />

        <Stack.Screen
          name="profile"
          options={{
            presentation: "modal",
          }}
        />

        <Stack.Screen
          name="challenge-detail"
          options={{
            presentation: "modal",
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

        <Stack.Screen
          name="settings/account"
          options={{
            animation: "slide_from_right",
            gestureEnabled: true,
          }}
        />

        <Stack.Screen
          name="settings/display"
          options={{
            animation: "slide_from_right",
            gestureEnabled: true,
          }}
        />

        <Stack.Screen
          name="settings/notifications"
          options={{
            animation: "slide_from_right",
            gestureEnabled: true,
          }}
        />

        <Stack.Screen
          name="settings/privacy"
          options={{
            animation: "slide_from_right",
            gestureEnabled: true,
          }}
        />

        <Stack.Screen
          name="settings/goals"
          options={{
            animation: "slide_from_right",
            gestureEnabled: true,
          }}
        />

        <Stack.Screen
          name="settings/data"
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
