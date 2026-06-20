import type { ExpoConfig } from "expo/config";

const APP_LINK_HOST = "melo-diet.vercel.app";

const config: ExpoConfig = {
  name: "melo",
  slug: "melo",
  extra: {
    eas: {
      projectId: "507c0e33-8576-4aba-84f4-00d6b74a7338",
    },
  },
  version: "1.1.0",
  orientation: "portrait",
  icon: "./assets/logo/melo-logo.png",
  scheme: "melo",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.melo.ai.kr.melo.app",
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      CFBundleAllowMixedLocalizations: true,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#ff8e00",
      foregroundImage: "./assets/logo/android-icon-foreground.png",
      backgroundImage: "./assets/logo/android-icon-background.png",
      monochromeImage: "./assets/logo/android-icon-foreground.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: "com.melo.frontend",
    permissions: ["CAMERA", "android.permission.health.READ_STEPS"],
    blockedPermissions: ["android.permission.RECORD_AUDIO"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "https",
            host: APP_LINK_HOST,
            pathPrefix: "/settings/feedback",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    output: "static",
    favicon: "./assets/logo/melo-logo.svg",
  },
  locales: {
    en: "./locales/en.json",
    ko: "./locales/ko.json",
  },
  plugins: [
    "expo-router",
    [
      "react-native-vision-camera",
      {
        cameraPermissionText:
          "Melo uses your camera for diet management. For example, you can scan nutrition labels to analyze data, or take photos of food and menus to check calories and log your meals.",
        enableMicrophonePermission: false,
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Melo uses your photo library for diet management. You can select photos of food, menus, or nutrition labels to analyze nutrition data, check calories, and log your meals.",
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash.png",
        backgroundColor: "#FF8E00",
        resizeMode: "contain",
        imageWidth: 190,
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          minSdkVersion: 26,
        },
      },
    ],
    "./plugins/with-health-connect-android",
    [
      "@kingstinct/react-native-healthkit",
      {
        NSHealthShareUsageDescription: "걸음 수를 체크할 수 있도록 접근을 허용합니다",
        NSHealthUpdateUsageDescription: "건강 데이터를 직접 수정하거나 추가하지 않습니다",
        background: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
