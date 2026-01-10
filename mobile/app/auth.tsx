import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/domains/auth/stores/authStore";
import { AuthFlow } from "@/domains/auth";
import { useEffect } from "react";

export default function AuthScreen() {
  const { user } = useAuthStore();
  const isAuthenticated = !!user?.isLoggedIn;

  useEffect(() => {
    // If user is already authenticated, redirect to main app
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated]);

  const handleAuthComplete = () => {
    router.replace("/");
  };

  const handleAuthCancel = () => {
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      <AuthFlow onComplete={handleAuthComplete} onCancel={handleAuthCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
