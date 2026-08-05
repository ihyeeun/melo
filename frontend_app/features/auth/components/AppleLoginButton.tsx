import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import AppleLogo from "../../../assets/design-update/social-icons/apple-logo.svg";
import { Typo } from "@/src/shared/ui";

type AppleLoginButtonProps = {
  onPress: () => void;
};

export function AppleLoginButton({ onPress }: AppleLoginButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="애플 로그인"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <AppleLogo width={20} height={20} />
        <Typo size="body-s-regular" color="primary" style={styles.label}>
          Apple{"\u00A0"}로그인
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
    backgroundColor: "#0a0a0a",
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
    color: "#fff",
    includeFontPadding: false,
    flexShrink: 0,
  },
});
