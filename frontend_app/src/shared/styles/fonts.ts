export const fontFamilies = {
  pretendard: "Pretendard-Regular",
  pretendardLight: "Pretendard-Light",
  pretendardRegular: "Pretendard-Regular",
  pretendardMedium: "Pretendard-Medium",
  pretendardSemiBold: "Pretendard-SemiBold",
} as const;

export const pretendardFonts = {
  [fontFamilies.pretendardLight]: require("pretendard/dist/public/static/Pretendard-Light.otf"),
  [fontFamilies.pretendardRegular]: require("pretendard/dist/public/static/Pretendard-Regular.otf"),
  [fontFamilies.pretendardMedium]: require("pretendard/dist/public/static/Pretendard-Medium.otf"),
  [fontFamilies.pretendardSemiBold]: require("pretendard/dist/public/static/Pretendard-SemiBold.otf"),
};
