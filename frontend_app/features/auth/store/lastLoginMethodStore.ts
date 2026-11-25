import * as SecureStore from "expo-secure-store";

export type LoginMethod = "kakao" | "apple";

const LAST_LOGIN_METHOD_KEY = "lastLoginMethod";

// 이 기기에서 마지막으로 로그인한 방식. 로그인 화면의 "최근 로그인" 말풍선에 쓰고,
// 로그아웃해도 남기며 탈퇴하면 지운다
export async function saveLastLoginMethod(method: LoginMethod) {
  try {
    await SecureStore.setItemAsync(LAST_LOGIN_METHOD_KEY, method);
  } catch (error) {
    console.warn("최근 로그인 방식 저장 실패", error);
  }
}

export async function loadLastLoginMethod(): Promise<LoginMethod | null> {
  try {
    const stored = await SecureStore.getItemAsync(LAST_LOGIN_METHOD_KEY);
    return stored === "kakao" || stored === "apple" ? stored : null;
  } catch (error) {
    console.warn("최근 로그인 방식 불러오기 실패", error);
    return null;
  }
}

export async function clearLastLoginMethod() {
  try {
    await SecureStore.deleteItemAsync(LAST_LOGIN_METHOD_KEY);
  } catch (error) {
    console.warn("최근 로그인 방식 삭제 실패", error);
  }
}
