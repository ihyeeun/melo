import { type Tokens } from "@/features/auth/types";
import { clearTabConfig } from "@/src/shared/navigation/tabConfigStore";
import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

// store에 토큰 저장
export async function saveTokens(tokens: Tokens) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

// store에 있는 토큰 불러오기
export async function loadAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}
export async function loadRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

// store에 있는 토큰 삭제하기. 탭 구성은 계정(유료/무료)마다 달라서 세션이 끝나면 같이 지운다
export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await clearTabConfig();
}
