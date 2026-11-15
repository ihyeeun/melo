import { BackHandler, Platform, ToastAndroid } from "react-native";

const EXIT_CONFIRM_WINDOW_MS = 2000;

let lastExitRequestedAt = 0;

// 앱 첫 화면·1번째 탭 루트(G-1·G-2)의 Android 뒤로가기. 2초 안에 한 번 더 누르면 앱을 종료한다
// iOS는 앱을 직접 종료하지 않으므로 아무것도 하지 않는다
export function requestAppExit() {
  if (Platform.OS !== "android") return;

  const now = Date.now();
  if (now - lastExitRequestedAt < EXIT_CONFIRM_WINDOW_MS) {
    lastExitRequestedAt = 0;
    BackHandler.exitApp();
    return;
  }

  lastExitRequestedAt = now;
  ToastAndroid.show("한 번 더 누르면 앱이 종료돼요", ToastAndroid.SHORT);
}
