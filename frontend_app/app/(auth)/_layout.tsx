import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="admin-login" options={{ headerShown: false }} />
      <Stack.Screen name="kakaoLogin" options={{ title: "Kakao Login", headerShown: false }} />
      <Stack.Screen name="appleLogin" options={{ title: "Apple Login", headerShown: false }} />
      {/* iOS 스와이프가 로그인 화면으로 빠지지 않게 끈다. 단계 사이 스와이프는 웹이 처리한다 */}
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}
