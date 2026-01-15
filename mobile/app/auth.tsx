import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useAuthStore, selectIsAuthenticated } from "@/features/auth/model/authStore";
import { AuthFlow } from "@/features/auth";
import { useEffect } from "react";

export default function AuthScreen() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  useEffect(() => {
    // If user is already authenticated, redirect to main app
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated]);

  const handleAuthComplete = () => {
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      <AuthFlow onComplete={handleAuthComplete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
