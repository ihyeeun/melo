import React from "react";
import { Text, type StyleProp, type TextProps, type TextStyle } from "react-native";
import { semantic, typography, type TypoName } from "@/src/shared/styles";

type TypographyColor = keyof typeof semantic.text;

type TypographyProps = Omit<TextProps, "style"> & {
  size?: TypoName;
  color?: TypographyColor;
  style?: StyleProp<TextStyle>;
};

export function Typo({
  size = "body-s-regular",
  color = "primary",
  allowFontScaling = false,
  style,
  children,
  ...props
}: TypographyProps) {
  return (
    <Text
      {...props}
      allowFontScaling={allowFontScaling}
      style={[typography[size], { color: semantic.text[color] }, style]}
    >
      {children}
    </Text>
  );
}
