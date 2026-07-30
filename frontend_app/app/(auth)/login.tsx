import React from "react";
import { StyleSheet, View, Image } from "react-native";
import { KakaoLoginButton } from "@/features/auth/components/KakaoLoginButton";
import { AppleLoginButton } from "@/features/auth/components/AppleLoginButton";
import { router } from "expo-router";
import { semantic } from "@/src/shared/styles";
import { Typo } from "@/src/shared/ui";
import { SafeAreaView } from "react-native-safe-area-context";

const MeloLogo = require("@/assets/design-update/melo-logo-black.png");
const LoginImage = require("@/assets/design-update/login-image.png");

export default function LoginPage() {
  const startAppleLogin = React.useCallback(() => {
    router.push("/appleLogin");
  }, []);

  const openTermsPage = React.useCallback(() => {
    router.push("/(auth)/terms");
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Image source={MeloLogo} style={styles.meloIcon} resizeMode="contain" />
        <Typo color="tertiary" size="body-m-medium">
          건강한 식사를 넘어,
          {"\n"}
          여성의 건강을 이해하는 AI 헬스케어
        </Typo>
        <Image source={LoginImage} style={styles.loginImage} resizeMode="contain" />
      </View>
      <View style={styles.bottom}>
        <View style={styles.socialButtonGroup}>
          <KakaoLoginButton onPress={() => router.push("/kakaoLogin")} />
          <AppleLoginButton onPress={startAppleLogin} />
        </View>

        <Typo
          color="tertiary"
          size="caption-m-regular"
          onPress={openTermsPage}
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
  textCenter: {
    textAlign: "center",
  },
});
