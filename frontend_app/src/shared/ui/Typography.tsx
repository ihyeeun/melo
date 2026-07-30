import React from "react";
import { Text, type StyleProp, type TextProps, type TextStyle } from "react-native";
import { semantic, typography, type TypoName } from "@/src/shared/styles";

type TypographyColor = keyof typeof semantic.text;

type TypographyProps = Omit<TextProps, "style"> & {
  variant: TypoName;
  color?: TypographyColor;
  style?: StyleProp<TextStyle>;
};

export function Typography({
  variant,
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
      style={[typography[variant], { color: semantic.text[color] }, style]}
    >
      {children}
    </Text>
  );
}
