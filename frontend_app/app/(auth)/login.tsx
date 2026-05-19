import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { KakaoLoginButton } from "@/features/auth/components/KakaoLoginButton";
import { AppleLoginButton } from "@/features/auth/components/AppleLoginButton";
import { typography } from "@/src/shared/styles/tokens";
import { router } from "expo-router";
import LoginLogo from "@/assets/images/login-logo.svg";
import LoginImage from "@/assets/images/login-image.svg";

export default function LoginPage() {
  const startAppleLogin = React.useCallback(() => {
    router.push("/appleLogin");
  }, []);

  const openTermsPage = React.useCallback(() => {
    router.push("/(auth)/terms");
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <LoginLogo width={"100%"} />
          <LoginImage width={"100%"} />
        </View>
        <View style={styles.bottom}>
          <View style={styles.socialButtonGroup}>
            <KakaoLoginButton onPress={() => router.push("/kakaoLogin")} />
            <AppleLoginButton onPress={startAppleLogin} />
          </View>

          <Text allowFontScaling={false} style={styles.agreementText}>
            가입하면 Melo의{"\n"}
            <Text
              allowFontScaling={false}
              style={styles.linkText}
              onPress={openTermsPage}
              accessible={true}
              accessibilityRole="link"
              accessibilityLabel="이용약관 및 개인정보 처리방침"
            >
              이용약관 및 개인정보 처리방침
            </Text>
            에 동의하게 됩니다.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 56,
    backgroundColor: "#ffffff",
  },
  content: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-evenly",
    gap: 50,
    width: "100%",
    paddingTop: 120,
    paddingBottom: 40,
  },
  bottom: { alignItems: "center", gap: 20, width: "100%" },
  socialButtonGroup: {
    gap: 12,
    alignItems: "center",
    width: "100%",
  },
  agreementText: {
    ...typography["typo-body4"],
    color: "#666666",
    lineHeight: 22,
    textAlign: "center",
  },
  linkText: {
    textDecorationLine: "underline",
  },
});
