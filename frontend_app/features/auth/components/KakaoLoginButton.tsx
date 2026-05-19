import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { typography } from "@/src/shared/styles/tokens";

import KakaoLogo from "../../../assets/images/Icon/kakao-logo.svg";

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
        <Text allowFontScaling={false} style={styles.label}>
          카카오 로그인
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 300,
    height: 45,
    borderRadius: 4,
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
    gap: 8,
  },
  label: {
    ...typography["typo-label3"],
    color: "#0a0a0a",
  },
});
