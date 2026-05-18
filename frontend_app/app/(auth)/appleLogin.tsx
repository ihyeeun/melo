import { postHasUserInfo } from "@/features/auth/api/onboardingStatusApi";
import { saveTokens } from "@/features/auth/store/tokenStore";
import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WebView, { WebViewMessageEvent, WebViewNavigation } from "react-native-webview";

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const APPLE_LOGIN_URL = BASE_URL
  ? `${BASE_URL}/userAuth/apple`
  : "https://melo.ai.kr/userAuth/apple";

type AppleTokenPayload = {
  accessToken?: string;
  refreshToken?: string;
};

type AppleLoginResponse = {
  data?: AppleTokenPayload;
  message?: string;
  error?: string;
} & AppleTokenPayload;

function extractAppleTokens(result: AppleLoginResponse) {
  const source = result.data ?? result;
  if (!source.accessToken || !source.refreshToken) {
    return null;
  }

  return {
    accessToken: source.accessToken,
    refreshToken: source.refreshToken,
  };
}

export default function AppleLogin() {
  const isExchangingRef = useRef(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isCallbackProcessing, setIsCallbackProcessing] = useState(false);

  const onShouldStartLoadWithRequest = useCallback((request: WebViewNavigation) => {
    if (request.url.includes("/userAuth/apple/callback")) {
      setIsCallbackProcessing(true);
    }

    return true;
  }, []);

  const onMessage = useCallback(async (event: WebViewMessageEvent) => {
    if (isExchangingRef.current) return;

    try {
      const result = JSON.parse(event.nativeEvent.data) as AppleLoginResponse;

      if (result.error) {
        console.error("Apple login callback error:", result.error);
        setIsCallbackProcessing(false);
        return;
      }

      if (result.message?.includes("ID_Token is invalid")) {
        console.error("Apple login callback error:", result.message);
        setIsCallbackProcessing(false);
        return;
      }

      const tokens = extractAppleTokens(result);
      if (!tokens) return;

      isExchangingRef.current = true;

      await saveTokens(tokens);
      const hasUserInfo = await postHasUserInfo();

      if (!hasUserInfo) {
        router.replace("/(auth)/onboarding");
        return;
      }

      router.replace("/(tabs)/home");
    } catch (error) {
      console.error("애플 로그인 메시지 처리 실패:", error);
      isExchangingRef.current = false;
      setIsCallbackProcessing(false);
      router.replace("/(auth)/login");
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <WebView
        source={{ uri: APPLE_LOGIN_URL }}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onMessage={onMessage}
        onLoadStart={() => setIsPageLoading(true)}
        onLoadEnd={() => setIsPageLoading(false)}
        injectedJavaScript={`
          (function () {
            const pre = document.querySelector("pre");
            const bodyText = document.body && document.body.innerText ? document.body.innerText.trim() : "";
            const jsonText = pre && pre.innerText ? pre.innerText : bodyText;

            if (!jsonText || (jsonText[0] !== "{" && jsonText[0] !== "[")) {
              return true;
            }

            try {
              const data = JSON.parse(jsonText);
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(data));
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ error: "애플 로그인 JSON 파싱 오류: " + message }));
            }

            return true;
          })();
        `}
      />

      {(isPageLoading || isCallbackProcessing) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#444" />
          <Text allowFontScaling={false} style={styles.loadingText}>
            로그인 준비 중...
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#666666",
  },
});
