import AppWebViewScreen from "@/src/screens/AppWebviewScreen";
import { requestAppExit } from "@/src/shared/navigation/appExit";

// screen: ONB-01-003, ONB-01-004, ONB-01-005, ONB-01-006, ONB-01-007, ONB-01-008
// screen: ONB-01-009, ONB-01-010, ONB-01-011, ONB-01-012, ONB-01-013
export default function OnboardingScreen() {
  // 첫 단계(G-1)에서 뒤로가면 로그인 화면이 아니라 종료 확인으로 간다. 그 외 단계는 웹이 이전 단계로 되돌린다
  return <AppWebViewScreen path="/onboarding" onRootBack={requestAppExit} />;
}
