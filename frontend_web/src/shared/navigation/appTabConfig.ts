import { PATH } from "@/router/path";
import type {
  AppTabConfigItem,
  AppTabName,
  OptionalTabName,
} from "@/shared/api/bridge/nativeBridge.types";

// 앱이 탭바에 따로 켜고 끄는 탭. 탭 구성(APP_TABS)을 모르는 이전 버전 앱은 이 값만 쓴다
export const APP_OPTIONAL_TABS: readonly OptionalTabName[] = ["restaurant", "analysis"];

// 앱 탭바의 구성과 순서. 앱은 이 순서대로 그리고, 첫 번째 탭(AI 코치 제외)에서 시작한다
export const APP_TABS = {
  paid: [
    { tab: "home", label: "기록" },
    { tab: "restaurant", label: "식당" },
    { tab: "chat", label: "AI 코치" },
    { tab: "analysis", label: "분석" },
    { tab: "profile", label: "프로필" },
  ],
  free: [
    { tab: "restaurant", label: "식당" },
    { tab: "home", label: "기록" },
    { tab: "analysis", label: "분석" },
    { tab: "profile", label: "프로필" },
  ],
} as const satisfies Record<"paid" | "free", readonly AppTabConfigItem[]>;

// 탭을 누르면 처음 보이는 화면. 웹에 화면이 없는 탭(diary)은 없다
export const APP_TAB_PATHS: Partial<Record<AppTabName, string>> = {
  home: PATH.HOME,
  restaurant: PATH.RESTAURANT,
  chat: PATH.CHAT,
  analysis: PATH.PERSONAL_ANALYSIS,
  profile: PATH.PROFILE,
};

// 앱을 열면 보이는 탭. AI 코치는 다른 탭 위에 쌓이는 화면이라 시작 탭이 될 수 없다
export function getAppStartTab(isSubscribed: boolean): AppTabName {
  const tabs: readonly AppTabConfigItem[] = isSubscribed ? APP_TABS.paid : APP_TABS.free;
  return tabs.find(({ tab }) => tab !== "chat")?.tab ?? "home";
}
