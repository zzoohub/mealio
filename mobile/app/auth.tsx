import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useAuthStore, selectIsAuthenticated } from "@/features/auth/model/authStore";
import { AuthFlow } from "@/features/auth";
import { consumePendingDeepLink } from "@/shared/lib/deeplink";
import { useEffect } from "react";

export default function AuthScreen() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      const pending = consumePendingDeepLink();
      router.replace(pending ?? "/");
    }
  }, [isAuthenticated]);

  const handleAuthComplete = () => {
    const pending = consumePendingDeepLink();
    router.replace(pending ?? "/");
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
