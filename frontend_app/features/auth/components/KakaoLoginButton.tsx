import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import KakaoLogo from "../../../assets/design-update/social-icons/kakao-logo.svg";
import { Typo } from "@/src/shared/ui/Typography";

type KakaoLoginButtonProps = {
  onPress: () => void;
};

export function KakaoLoginButton({ onPress }: KakaoLoginButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="카카오 로그인"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <KakaoLogo width={20} height={20} />
        <Typo size="body-s-regular" color="primary" style={styles.label}>
          카카오{"\u00A0"}로그인
        </Typo>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    height: 45,
    borderRadius: 12,
    backgroundColor: "#FEE500",
    justifyContent: "center",
    alignSelf: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  label: {
    color: "#000",
    includeFontPadding: false,
    flexShrink: 0,
  },
});
