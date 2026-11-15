import { postHasUserInfo } from "@/features/auth/api/onboardingStatusApi";
import { loadAccessToken } from "@/features/auth/store/tokenStore";
import { subscribeAuthExpired } from "@/src/shared/auth/authSessionEvents";
import { semantic } from "@/src/shared/styles";
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
          // 회원가입 도중 앱이 종료됐으면 회원 정보가 없다. 홈 대신 회원가입으로 이어서 보낸다
          let hasUserInfo = true;
          try {
            hasUserInfo = await postHasUserInfo();
          } catch (error) {
            // 세션이 만료됐으면 apiClient가 토큰을 지우고 로그인으로 보낸 뒤다
            if (!(await loadAccessToken())) return;
            // 네트워크 오류 등은 지금처럼 홈으로 보낸다(웹이 프로필 조회 실패 화면을 보여 준다)
            console.warn("회원 정보 확인 실패", error);
          }
          if (cancelled) return;

          router.replace(hasUserInfo ? "/(tabs)/home" : "/(auth)/onboarding");
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
          <ActivityIndicator size="small" color={semantic.primary.normal} />
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
