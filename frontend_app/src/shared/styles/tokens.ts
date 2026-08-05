import { StyleSheet, type TextStyle } from "react-native";
import { fontFamilies } from "./fonts";

type TypographyWeight = "regular" | "medium" | "semibold" | "bold";

const designFontFamilyByWeight: Record<TypographyWeight, string> = {
  regular: fontFamilies.pretendardRegular,
  medium: fontFamilies.pretendardMedium,
  semibold: fontFamilies.pretendardSemiBold,
  bold: fontFamilies.pretendardBold,
};

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

export const typography = StyleSheet.create({
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

export type TypoName = keyof typeof typography;
