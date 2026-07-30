import { StyleSheet, type TextStyle } from "react-native";
import { fontFamilies } from "./fonts";

type TypographyWeight = "regular" | "medium" | "semibold" | "bold";
type LetterSpacingName = "tight" | "label" | "body" | "normal";

export type LegacyTypoName =
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

export type DesignTypoName =
  | "title-xxl-semi"
  | "title-xl-semi"
  | "title-xxl-medium"
  | "title-l-bold"
  | "title-l-semi"
  | "title-m-semi"
  | "title-m-medium"
  | "title-s-semi"
  | "title-s-regular"
  | "body-m-semi"
  | "body-m-medium"
  | "body-m-regular"
  | "body-s-semi"
  | "body-s-medium"
  | "body-s-regular"
  | "body-xs-regular"
  | "caption-m-semi"
  | "caption-m-medium"
  | "caption-m-regular"
  | "caption-s-medium";

export type TypoName = LegacyTypoName | DesignTypoName;

const legacyFontFamilyByWeight: Record<TypographyWeight, string> = {
  regular: fontFamilies.pretendardLight,
  medium: fontFamilies.pretendardRegular,
  semibold: fontFamilies.pretendardMedium,
  bold: fontFamilies.pretendardSemiBold,
};

const designFontFamilyByWeight: Record<TypographyWeight, string> = {
  regular: fontFamilies.pretendardRegular,
  medium: fontFamilies.pretendardMedium,
  semibold: fontFamilies.pretendardSemiBold,
  bold: fontFamilies.pretendardBold,
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
  fontFamilyByWeight: Record<TypographyWeight, string> = legacyFontFamilyByWeight,
): TextStyle {
  return {
    fontFamily: fontFamilyByWeight[fontWeight],
    fontSize,
    letterSpacing: fontSize * letterSpacingRatios[letterSpacingName],
    lineHeight: fontSize * lineHeightRatio,
  };
}

function createDesignTypographyStyle(
  fontSize: number,
  fontWeight: TypographyWeight,
  lineHeightRatio: number | null,
  letterSpacingRatio: number,
): TextStyle {
  const style: TextStyle = {
    fontFamily: designFontFamilyByWeight[fontWeight],
    fontSize,
    letterSpacing: fontSize * letterSpacingRatio,
  };

  if (lineHeightRatio !== null) {
    style.lineHeight = fontSize * lineHeightRatio;
  }

  return style;
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

  "title-xxl-semi": createDesignTypographyStyle(40, "semibold", 1.4, -0.025),
  "title-xl-semi": createDesignTypographyStyle(32, "semibold", 1.4, -0.03),
  "title-xxl-medium": createDesignTypographyStyle(32, "medium", 1.4, -0.03),
  "title-l-bold": createDesignTypographyStyle(24, "bold", 1.5, -0.03),
  "title-l-semi": createDesignTypographyStyle(24, "semibold", 1.5, -0.025),
  "title-m-semi": createDesignTypographyStyle(20, "semibold", 1.4, -0.025),
  "title-m-medium": createDesignTypographyStyle(20, "medium", 1.4, -0.025),
  "title-s-semi": createDesignTypographyStyle(18, "semibold", 1.4, -0.025),
  "title-s-regular": createDesignTypographyStyle(18, "regular", 1.4, -0.025),

  "body-m-semi": createDesignTypographyStyle(16, "semibold", 1.4, -0.025),
  "body-m-medium": createDesignTypographyStyle(16, "medium", 1.4, -0.025),
  "body-m-regular": createDesignTypographyStyle(16, "regular", 1.5, -0.025),
  "body-s-semi": createDesignTypographyStyle(14, "semibold", 1.4, -0.025),
  "body-s-medium": createDesignTypographyStyle(14, "medium", 1.4, -0.025),
  "body-s-regular": createDesignTypographyStyle(14, "regular", 1.4, -0.025),
  "body-xs-regular": createDesignTypographyStyle(13, "regular", 1.5, -0.025),

  "caption-m-semi": createDesignTypographyStyle(12, "semibold", null, -0.025),
  "caption-m-medium": createDesignTypographyStyle(12, "medium", null, -0.025),
  "caption-m-regular": createDesignTypographyStyle(12, "regular", 1.3, -0.025),
  "caption-s-medium": createDesignTypographyStyle(11, "medium", null, -0.025),
});
