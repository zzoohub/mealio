import React from "react";
import { Stack } from "expo-router";

export default function DiaryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="search" />
    </Stack>
  );
}
