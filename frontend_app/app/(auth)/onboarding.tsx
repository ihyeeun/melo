import { signOut } from "@/features/auth/api/authTokenApi";
import { clearTokens, loadRefreshToken } from "@/features/auth/store/tokenStore";
import AppWebViewScreen from "@/src/screens/AppWebviewScreen";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

export default function OnboardingScreen() {
  const appStateRef = useRef(AppState.currentState);
  const isLoggingOutRef = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      const didLeaveApp = prevState === "active" && nextState !== "active";
      if (!didLeaveApp || isLoggingOutRef.current) return;

      isLoggingOutRef.current = true;

      void (async () => {
        let refreshToken: string | null = null;

        try {
          refreshToken = await loadRefreshToken();
        } catch (error) {
          console.warn("온보딩 이탈 refreshToken 조회 실패", error);
        } finally {
          await clearTokens();
          router.replace("/(auth)/login");
        }

        if (!refreshToken) return;

        try {
          await signOut(refreshToken);
        } catch (error) {
          console.warn("온보딩 이탈 로그아웃 요청 실패", error);
        }
      })();
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return <AppWebViewScreen path="/onboarding" />;
}
