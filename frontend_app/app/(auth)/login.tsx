import React from "react";
import { BackHandler, Image, Linking, StyleSheet, View } from "react-native";
import { KakaoLoginButton } from "@/features/auth/components/KakaoLoginButton";
import { AppleLoginButton } from "@/features/auth/components/AppleLoginButton";
import {
  loadLastLoginMethod,
  type LoginMethod,
} from "@/features/auth/store/lastLoginMethodStore";
import { router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import { requestAppExit } from "@/src/shared/navigation/appExit";
import { semantic } from "@/src/shared/styles";
import { Typo } from "@/src/shared/ui";
import { SafeAreaView } from "react-native-safe-area-context";

const MeloLogo = require("@/assets/design-update/melo-logo-black.png");
const LoginImage = require("@/assets/design-update/login-image.png");
const TERMS_AND_PRIVACY_POLICY_URL =
  "https://third-princess-d57.notion.site/termsofuseandprivacypolicy";

// 이 기기에서 마지막으로 쓴 로그인 버튼 위에 띄우는 말풍선
function RecentLoginBubble() {
  return (
    <View style={styles.recentLogin} pointerEvents="none">
      <View style={styles.recentLoginBubble}>
        <Typo size="caption-m-medium" color="white">
          최근 로그인
        </Typo>
      </View>
      <View style={styles.recentLoginTail} />
    </View>
  );
}

// screen: ONB-01-001
export default function LoginPage() {
  const isFocused = useIsFocused();
  const [lastLoginMethod, setLastLoginMethod] = React.useState<LoginMethod | null>(null);

  React.useEffect(() => {
    if (!isFocused) return;

    let cancelled = false;
    void loadLastLoginMethod().then((method) => {
      if (!cancelled) setLastLoginMethod(method);
    });

    return () => {
      cancelled = true;
    };
  }, [isFocused]);

  // 앱 첫 화면(G-1)이라 Android 뒤로가기는 종료 확인 후 종료한다
  React.useEffect(() => {
    if (!isFocused) return;

    const backSubscription = BackHandler.addEventListener("hardwareBackPress", () => {
      requestAppExit();
      return true;
    });

    return () => {
      backSubscription.remove();
    };
  }, [isFocused]);

  const startAppleLogin = React.useCallback(() => {
    router.push("/appleLogin");
  }, []);

  const openTermsAndPrivacyPolicy = React.useCallback(() => {
    void WebBrowser.openBrowserAsync(TERMS_AND_PRIVACY_POLICY_URL).catch(async (error) => {
      try {
        const canOpen = await Linking.canOpenURL(TERMS_AND_PRIVACY_POLICY_URL);
        if (!canOpen) return;

        await Linking.openURL(TERMS_AND_PRIVACY_POLICY_URL);
      } catch (fallbackError) {
        console.warn("Failed to open terms in the external browser", fallbackError);
      }
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Image source={MeloLogo} style={styles.meloIcon} resizeMode="contain" />
        <Image source={LoginImage} style={styles.loginImage} resizeMode="contain" />
      </View>
      <View style={styles.bottom}>
        <View style={styles.socialButtonGroup}>
          <View style={styles.socialButton}>
            <KakaoLoginButton onPress={() => router.push("/kakaoLogin")} />
            {lastLoginMethod === "kakao" ? <RecentLoginBubble /> : null}
          </View>
          <View style={styles.socialButton}>
            <AppleLoginButton onPress={startAppleLogin} />
            {lastLoginMethod === "apple" ? <RecentLoginBubble /> : null}
          </View>
        </View>

        <Typo
          color="tertiary"
          size="caption-m-regular"
          onPress={openTermsAndPrivacyPolicy}
          style={styles.textCenter}
        >
          회원가입함으로써 멜로의
          {"\n"}
          <Typo color="secondary" size="caption-m-regular">
            이용약관 및 개인정보 처리방침
          </Typo>
          에 동의합니다
        </Typo>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semantic.background.default,
    paddingHorizontal: 16,
  },
  hero: {
    flex: 1,
    gap: 15,
    width: "100%",
    paddingTop: 120,
    paddingBottom: 60,
  },
  meloIcon: {
    width: 111,
    height: 37,
  },
  loginImage: {
    width: "100%",
    height: 334,
    marginTop: 30,
  },
  bottom: { alignItems: "center", gap: 24, width: "100%" },
  socialButtonGroup: {
    gap: 8,
    alignItems: "center",
    width: "100%",
  },
  socialButton: {
    width: "100%",
  },
  recentLogin: {
    position: "absolute",
    right: 24,
    bottom: "100%",
    marginBottom: -2,
    alignItems: "flex-end",
  },
  recentLoginBubble: {
    backgroundColor: semantic.text.primary,
    borderRadius: 99,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  recentLoginTail: {
    width: 0,
    height: 0,
    marginRight: 22,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: semantic.text.primary,
  },
  textCenter: {
    textAlign: "center",
  },
});
