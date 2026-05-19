import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { typography } from "@/src/shared/styles/tokens";
import AppleLogo from "../../../assets/images/Icon/apple-logo.svg";

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
        <Text allowFontScaling={false} style={styles.label}>
          Apple 로그인
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "center",
    width: 300,
    height: 45,
    borderRadius: 4,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    paddingHorizontal: 14,
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
    color: "#ffffff",
  },
});
