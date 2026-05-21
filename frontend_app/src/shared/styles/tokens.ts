import { StyleSheet, type TextStyle } from "react-native";
import { fontFamilies } from "./fonts";

type TypographyWeight = "regular" | "medium" | "semibold" | "bold";
type LetterSpacingName = "tight" | "label" | "body" | "normal";

export type TypoName =
  | "typo-h1"
  | "typo-h2"
  | "typo-title1"
  | "typo-title2"
  | "typo-title3"
  | "typo-title4"
  | "typo-body1"
  | "typo-body2"
  | "typo-body3"
  | "typo-label1"
  | "typo-label2"
  | "typo-label3"
  | "typo-label4"
  | "typo-label5"
  | "typo-label6"
  | "typo-caption1"
  | "typo-caption2"
  | "typo-caption3"
  | "typo-caption4";

const fontFamilyByWeight: Record<TypographyWeight, string> = {
  regular: fontFamilies.pretendardLight,
  medium: fontFamilies.pretendardRegular,
  semibold: fontFamilies.pretendardMedium,
  bold: fontFamilies.pretendardSemiBold,
};

const letterSpacingRatios: Record<LetterSpacingName, number> = {
  tight: -0.04,
  label: -0.02,
  body: -0.015,
  normal: 0,
};

function createTypographyStyle(
  fontSize: number,
  fontWeight: TypographyWeight,
  letterSpacingName: LetterSpacingName,
  lineHeightRatio: number,
): TextStyle {
  return {
    fontFamily: fontFamilyByWeight[fontWeight],
    fontSize,
    letterSpacing: fontSize * letterSpacingRatios[letterSpacingName],
    lineHeight: fontSize * lineHeightRatio,
  };
}

export const typography = StyleSheet.create<Record<TypoName, TextStyle>>({
  "typo-h1": createTypographyStyle(40, "medium", "tight", 1.2),
  "typo-h2": createTypographyStyle(26, "semibold", "tight", 1.2),
  "typo-title1": createTypographyStyle(24, "semibold", "tight", 1.45),
  "typo-title2": createTypographyStyle(20, "semibold", "tight", 1.45),
  "typo-title3": createTypographyStyle(18, "semibold", "tight", 1.45),
  "typo-title4": createTypographyStyle(16, "semibold", "tight", 1.45),
  "typo-body1": createTypographyStyle(20, "semibold", "tight", 1.3),
  "typo-body2": createTypographyStyle(16, "medium", "body", 1.45),
  "typo-body3": createTypographyStyle(14, "medium", "body", 1.45),
  "typo-label1": createTypographyStyle(16, "bold", "label", 1.4),
  "typo-label2": createTypographyStyle(16, "semibold", "normal", 1.4),
  "typo-label3": createTypographyStyle(15, "medium", "label", 1.4),
  "typo-label4": createTypographyStyle(14, "medium", "tight", 1.4),
  "typo-label5": createTypographyStyle(13, "bold", "body", 1.4),
  "typo-label6": createTypographyStyle(13, "medium", "body", 1.4),
  "typo-caption1": createTypographyStyle(20, "semibold", "tight", 1.45),
  "typo-caption2": createTypographyStyle(18, "medium", "label", 1.4),
  "typo-caption3": createTypographyStyle(15, "medium", "label", 1.4),
  "typo-caption4": createTypographyStyle(12, "medium", "normal", 1.3),
});
