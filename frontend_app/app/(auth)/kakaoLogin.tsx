import { exchangeKakaoCodeForToken } from "@/features/auth/api/authTokenApi";
import { postHasUserInfo } from "@/features/auth/api/onboardingStatusApi";
import { parseKakaoRedirectUrl } from "@/features/auth/hooks/parseKakaoCode";
import { typography } from "@/src/shared/styles/tokens";
import { isAxiosError } from "axios";
import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WebView, { WebViewNavigation } from "react-native-webview";

const restApiKey = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY;
const redirectUri = process.env.EXPO_PUBLIC_KAKAO_REDIRECT_URI;

type ApiErrorResponse = {
  message?: string;
  error?: string;
  statusCode?: number;
  data?: {
    message?: string;
    error?: string;
  };
};

const DEFAULT_KAKAO_LOGIN_ERROR_MESSAGE = "카카오 로그인 처리 중 오류가 발생했습니다.";

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

function readServerMessage(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const response = data as ApiErrorResponse;
  return (
    response.message ?? response.error ?? response.data?.message ?? response.data?.error ?? null
  );
}

function getKakaoLoginErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "서버에 연결하지 못했습니다. 네트워크 상태를 확인해주세요.";
    }

    const serverMessage = readServerMessage(error.response.data);
    if (serverMessage?.toLowerCase().includes("authorization code is invalid")) {
      return "카카오 인증 코드가 유효하지 않습니다.\n다시 로그인해주세요.";
    }

    if (serverMessage) {
      return serverMessage;
    }

    if (error.response.status === 400) {
      return "카카오 로그인 요청이 올바르지 않습니다. 다시 시도해주세요.";
    }

    if (error.response.status === 401) {
      return `카카오 인증에 실패했습니다.\n다시 로그인해주세요.`;
    }

    return DEFAULT_KAKAO_LOGIN_ERROR_MESSAGE;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return DEFAULT_KAKAO_LOGIN_ERROR_MESSAGE;
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

export default function KakaoLogin() {
  const isExchangingRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState(
    kakaoAuthorizeUrl ? "" : "카카오 로그인 설정이 없습니다. 앱 설정을 확인해주세요.",
  );
  const [isPageLoading, setIsPageLoading] = useState(Boolean(kakaoAuthorizeUrl));
  const [isCallbackProcessing, setIsCallbackProcessing] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);

  const handleRetry = useCallback(() => {
    isExchangingRef.current = false;
    setErrorMessage("");
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
      setErrorMessage("");
      setIsCallbackProcessing(true);

      (async () => {
        try {
          await exchangeKakaoCodeForToken(redirectResult.code);
          const hasUserInfo = await postHasUserInfo();

          if (!hasUserInfo) {
            router.replace("/(auth)/onboarding");
            return;
          }

          router.replace("/(tabs)/home");
        } catch (error) {
          const nextErrorMessage = getKakaoLoginErrorMessage(error);
          console.error("카카오 로그인 실패", getKakaoLoginErrorLog(error));
          setErrorMessage(nextErrorMessage);
          isExchangingRef.current = false;
          setIsCallbackProcessing(false);
        }
      })();

      return false;
    }

    console.error("Kakao login error:", redirectResult.error);
    setErrorMessage(redirectResult.error);
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

      {(isPageLoading || isCallbackProcessing) && !errorMessage ? (
        <View style={styles.overlay}>
          <ActivityIndicator size="small" color="#444444" />
          <Text allowFontScaling={false} style={styles.loadingText}>
            로그인 처리 중...
          </Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.overlay}>
          <View style={styles.errorContent}>
            <Text allowFontScaling={false} style={styles.errorTitle}>
              카카오 로그인 실패
            </Text>
            <Text allowFontScaling={false} style={styles.errorMessage}>
              {errorMessage}
            </Text>
            <View style={styles.errorActions}>
              {kakaoAuthorizeUrl ? (
                <Pressable
                  onPress={handleRetry}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryButtonPressed,
                  ]}
                >
                  <Text allowFontScaling={false} style={styles.primaryButtonText}>
                    다시 시도
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={handleBackToLogin}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.secondaryButtonPressed,
                ]}
              >
                <Text allowFontScaling={false} style={styles.secondaryButtonText}>
                  로그인으로 돌아가기
                </Text>
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
  loadingText: {
    ...typography["typo-label3"],
    marginTop: 8,
    color: "#666666",
  },
  errorContent: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },
  errorTitle: {
    ...typography["typo-title3"],
    color: "#222222",
    textAlign: "center",
  },
  errorMessage: {
    ...typography["typo-body4"],
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
    backgroundColor: "#222222",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonPressed: {
    opacity: 0.8,
  },
  primaryButtonText: {
    ...typography["typo-label2"],
    color: "#ffffff",
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
    ...typography["typo-label2"],
    color: "#333333",
  },
});
