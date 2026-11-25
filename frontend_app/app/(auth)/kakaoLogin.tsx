import { exchangeKakaoCodeForToken } from "@/features/auth/api/authTokenApi";
import { postHasUserInfo } from "@/features/auth/api/onboardingStatusApi";
import { parseKakaoRedirectUrl } from "@/features/auth/hooks/parseKakaoCode";
import { saveLastLoginMethod } from "@/features/auth/store/lastLoginMethodStore";
import { LoadingOverlay, Typo } from "@/src/shared/ui";
import { isAxiosError } from "axios";
import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WebView, { WebViewNavigation } from "react-native-webview";
import { semantic } from "@/src/shared/styles/color";

const restApiKey = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY;
const redirectUri = process.env.EXPO_PUBLIC_KAKAO_REDIRECT_URI;

function createKakaoAuthorizeUrl() {
  if (!restApiKey || !redirectUri) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: restApiKey,
    redirect_uri: redirectUri,
    response_type: "code",
  });

  return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
}

function getKakaoLoginErrorLog(error: unknown) {
  if (isAxiosError(error)) {
    return {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    };
  }

  return error;
}

const kakaoAuthorizeUrl = createKakaoAuthorizeUrl();

if (!kakaoAuthorizeUrl) {
  console.error("카카오 로그인 설정(EXPO_PUBLIC_KAKAO_REST_API_KEY · REDIRECT_URI)이 없습니다.");
}

// screen: ONB-01-002
export default function KakaoLogin() {
  const isExchangingRef = useRef(false);
  // 실패 원인은 기록에만 남기고, 화면에는 원인과 상관없이 같은 안내를 보여 준다
  const [hasFailed, setHasFailed] = useState(!kakaoAuthorizeUrl);
  const [isPageLoading, setIsPageLoading] = useState(Boolean(kakaoAuthorizeUrl));
  const [isCallbackProcessing, setIsCallbackProcessing] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);

  const handleRetry = useCallback(() => {
    isExchangingRef.current = false;
    setHasFailed(false);
    setIsCallbackProcessing(false);
    setIsPageLoading(Boolean(kakaoAuthorizeUrl));
    setWebViewKey((currentKey) => currentKey + 1);
  }, []);

  const handleBackToLogin = useCallback(() => {
    router.replace("/(auth)/login");
  }, []);

  const onShouldStartLoadWithRequest = useCallback((request: WebViewNavigation) => {
    const redirectResult = parseKakaoRedirectUrl(request.url, redirectUri);
    if (!redirectResult) return true;

    if (redirectResult.type === "code") {
      if (isExchangingRef.current) return false;
      isExchangingRef.current = true;
      setHasFailed(false);
      setIsCallbackProcessing(true);

      (async () => {
        try {
          await exchangeKakaoCodeForToken(redirectResult.code);
          await saveLastLoginMethod("kakao");
          const hasUserInfo = await postHasUserInfo();

          if (!hasUserInfo) {
            router.replace("/(auth)/onboarding");
            return;
          }

          router.replace("/(tabs)/home");
        } catch (error) {
          console.error("카카오 로그인 실패", getKakaoLoginErrorLog(error));
          setHasFailed(true);
          isExchangingRef.current = false;
          setIsCallbackProcessing(false);
        }
      })();

      return false;
    }

    console.error("Kakao login error:", redirectResult.error);
    setHasFailed(true);
    setIsCallbackProcessing(false);
    return false;
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {kakaoAuthorizeUrl ? (
        <WebView
          key={webViewKey}
          source={{ uri: kakaoAuthorizeUrl }}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onLoadStart={() => setIsPageLoading(true)}
          onLoadEnd={() => setIsPageLoading(false)}
        />
      ) : null}

      {(isPageLoading || isCallbackProcessing) && !hasFailed ? (
        <LoadingOverlay message="로그인 준비 중…" />
      ) : null}

      {hasFailed ? (
        <View style={styles.overlay}>
          <View style={styles.errorContent}>
            <Typo allowFontScaling={false} style={styles.errorTitle}>
              카카오 로그인을 하지 못했어요
            </Typo>
            <Typo allowFontScaling={false} style={styles.errorMessage}>
              다시 시도해주세요
            </Typo>
            <View style={styles.errorActions}>
              {kakaoAuthorizeUrl ? (
                <Pressable
                  onPress={handleRetry}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryButtonPressed,
                  ]}
                >
                  <Typo allowFontScaling={false} style={styles.primaryButtonText}>
                    다시 시도
                  </Typo>
                </Pressable>
              ) : null}
              <Pressable
                onPress={handleBackToLogin}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.secondaryButtonPressed,
                ]}
              >
                <Typo allowFontScaling={false} style={styles.secondaryButtonText}>
                  로그인으로 돌아가기
                </Typo>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  errorContent: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },
  errorTitle: {
    color: "#222222",
    textAlign: "center",
  },
  errorMessage: {
    marginTop: 10,
    color: "#666666",
    textAlign: "center",
  },
  errorActions: {
    width: "100%",
    gap: 8,
    marginTop: 24,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: semantic.btn.default,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonPressed: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: semantic.text.accent,
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dddddd",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonPressed: {
    backgroundColor: "#f5f5f5",
  },
  secondaryButtonText: {
    color: "#333333",
  },
});
