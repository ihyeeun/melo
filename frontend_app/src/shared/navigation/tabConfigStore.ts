import * as SecureStore from "expo-secure-store";

import { type AppTabConfig, normalizeTabConfig } from "@/src/shared/navigation/appTabNavigation";

const TAB_CONFIG_KEY = "tabConfig";

// 탭 화면이 처음 그릴 때 바로 읽을 수 있도록 메모리에도 들고 있는다
let cachedTabConfig: AppTabConfig | null = null;

export function getCachedTabConfig() {
  return cachedTabConfig;
}

// 앱을 시작할 때 마지막으로 받은 탭 구성을 불러온다. 웹이 로드되기 전에도 그 구성으로 그리기 위해서다
export async function loadTabConfig() {
  try {
    const stored = await SecureStore.getItemAsync(TAB_CONFIG_KEY);
    cachedTabConfig = stored ? normalizeTabConfig(JSON.parse(stored)) : null;
  } catch (error) {
    console.warn("탭 구성 불러오기 실패", error);
    cachedTabConfig = null;
  }

  return cachedTabConfig;
}

export async function saveTabConfig(config: AppTabConfig) {
  cachedTabConfig = config;

  try {
    await SecureStore.setItemAsync(TAB_CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn("탭 구성 저장 실패", error);
  }
}

export async function clearTabConfig() {
  cachedTabConfig = null;
  await SecureStore.deleteItemAsync(TAB_CONFIG_KEY);
}
