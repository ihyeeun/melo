import { loadAccessToken } from "@/features/auth/store/tokenStore";
import { subscribeAuthExpired } from "@/src/shared/auth/authSessionEvents";
import { pretendardFonts } from "@/src/shared/styles/fonts";
import { useFonts } from "expo-font";
import { router, Stack, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

function isRootRoute(segments: string[]) {
  return segments.length === 0 || (segments.length === 1 && segments[0] === "index");
}

function isProtectedRoute(segments: string[]) {
  return (
    segments[0] === "(tabs)" || segments[0] === "camera-capture" || segments[0] === "settings"
  );
}

export default function RootLayout() {
  const segments = useSegments();
  const segmentRef = useRef<string[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [fontsLoaded, fontError] = useFonts(pretendardFonts);

  useEffect(() => {
    segmentRef.current = segments as string[];
  }, [segments]);

  useEffect(() => {
    const unsubscribe = subscribeAuthExpired(() => {
      const isAuthRoute = segmentRef.current[0] === "(auth)";
      if (isAuthRoute) return;
      router.replace("/(auth)/login");
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (fontError) {
      console.error("Pretendard font load failed:", fontError);
    }
  }, [fontError]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const currentSegments = segments as string[];
      const shouldCheckToken =
        isRootRoute(currentSegments) || isProtectedRoute(currentSegments);

      try {
        if (!shouldCheckToken) {
          return;
        }

        const token = await loadAccessToken();

        if (cancelled) return;

        if (isRootRoute(currentSegments) && token) {
          router.replace("/(tabs)/home");
        } else if (!token) {
          router.replace("/(auth)/login");
        }
      } catch (error) {
        console.error("Failed to bootstrap auth session:", error);
        if (cancelled) return;
        router.replace("/(auth)/login");
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [segments]);

  const shouldShowBootOverlay = (!fontsLoaded && !fontError) || isBootstrapping;

  return (
    <View style={styles.container}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="camera-capture" options={{ headerShown: false }} />
        <Stack.Screen name="settings/feedback" options={{ headerShown: false }} />
      </Stack>
      {shouldShowBootOverlay ? (
        <View style={styles.bootOverlay}>
          <ActivityIndicator size="small" color="#ff8000" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  bootOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "#ffffff",
    justifyContent: "center",
  },
});
