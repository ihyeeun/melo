import { signInAdmin } from "@/features/auth/api/authTokenApi";
import { postHasUserInfo } from "@/features/auth/api/onboardingStatusApi";
import { saveTokens } from "@/features/auth/store/tokenStore";
import { LoadingOverlay, Typo } from "@/src/shared/ui";
import { isAxiosError } from "axios";
import { router } from "expo-router";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { semantic } from "@/src/shared/styles/color";

export default function AdminLoginPage() {
  const [adminId, setAdminId] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = React.useCallback(async () => {
    if (isSubmitting) return;

    const trimmedAdminId = adminId.trim();
    const trimmedEmail = email.trim();

    if (!trimmedAdminId || !trimmedEmail) {
      setErrorMessage("관리자 아이디와 이메일을 모두 입력해주세요.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const loginResult = await signInAdmin({
        adminId: trimmedAdminId,
        email: trimmedEmail,
      });

      if (loginResult.user?.role && loginResult.user.role !== "ADMIN") {
        setErrorMessage("관리자 계정만 로그인할 수 있습니다.");
        return;
      }

      await saveTokens({
        accessToken: loginResult.accessToken,
        refreshToken: loginResult.refreshToken,
      });

      const hasUserInfo = await postHasUserInfo();

      if (!hasUserInfo) {
        router.replace("/(auth)/onboarding");
        return;
      }

      router.replace("/(tabs)/home");
    } catch (error) {
      if (isAxiosError(error)) {
        const serverMessage =
          (error.response?.data as { message?: string } | undefined)?.message ??
          "관리자 로그인에 실패했습니다.";
        setErrorMessage(serverMessage);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("관리자 로그인에 실패했습니다.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [adminId, email, isSubmitting]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Typo allowFontScaling={false} style={styles.title}>
              관리자 계정 로그인
            </Typo>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Typo allowFontScaling={false} style={styles.label}>
                이메일
              </Typo>
              <TextInput
                allowFontScaling={false}
                value={email}
                onChangeText={setEmail}
                placeholder="sample@email.com"
                style={styles.input}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Typo allowFontScaling={false} style={styles.label}>
                비밀번호
              </Typo>
              <TextInput
                allowFontScaling={false}
                value={adminId}
                onChangeText={setAdminId}
                placeholder="password"
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>

            {errorMessage ? (
              <Typo allowFontScaling={false} style={styles.errorMessage}>
                {errorMessage}
              </Typo>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.submitButton,
                (pressed || isSubmitting) && styles.submitButtonPressed,
              ]}
            >
              {isSubmitting ? (
                <LoadingOverlay />
              ) : (
                <Typo allowFontScaling={false} style={styles.submitButtonText}>
                  로그인
                </Typo>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },
  header: {
    gap: 8,
    marginBottom: 100,
  },
  title: {
    color: "#111111",
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    color: "#333333",
  },
  input: {
    width: "100%",
    height: 52,
    borderWidth: 1,
    borderColor: "#dddddd",
    borderRadius: 8,
    paddingHorizontal: 14,
    color: "#111111",
    backgroundColor: "#fafafa",
  },
  errorMessage: {
    color: "#d93025",
  },
  submitButton: {
    marginTop: 4,
    width: "100%",
    height: 52,
    borderRadius: 8,
    backgroundColor: semantic.btn.default,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonPressed: {
    opacity: 0.8,
  },
  submitButtonText: {
    color: semantic.text.accent,
  },
  linkButton: {
    alignSelf: "center",
    paddingVertical: 6,
  },
  linkButtonText: {
    color: "#666666",
    textDecorationLine: "underline",
  },
});
