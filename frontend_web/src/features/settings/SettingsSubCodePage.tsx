import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { queryKeys } from "@/features/profile/hooks/queries/queryKey";
import { registerSubCode } from "@/features/settings/api/subCode";
import { SubCodeInputSection } from "@/features/sub-code/components/SubCodeInputSection";
import { MAX_SUB_CODE_LENGTH } from "@/features/sub-code/constants/subCode.constant";
import { getSubCodeErrorToast } from "@/features/sub-code/utils/subCodeError.util";
import { PATH } from "@/router/path";
import { resolveApiErrorToast } from "@/shared/api/apiClient";
import { API_ERROR_MESSAGE } from "@/shared/api/apiErrorMessage";
import { isRequestAbortError } from "@/shared/api/requestCancellation";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { toast } from "@/shared/commons/toast/toast";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

import styles from "./styles/SettingsSubCodePage.module.css";

// 코드 문제는 고칠 수 있게 경고로, 서버 · 연결 문제는 오류로 알린다
function showRegisterSubCodeError(error: unknown) {
  const subCodeToast = getSubCodeErrorToast(error);
  if (subCodeToast) {
    toast.warning(subCodeToast.title, subCodeToast.description);
    return;
  }

  const { title, description } = resolveApiErrorToast(error, {
    title: "구독 코드를 등록하지 못했어요",
    description: "잠시 후 다시 시도해주세요",
  });
  toast.error(title, description);
}

// screen: ONB-01-017
export default function SettingsSubCodePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [subCode, setSubCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedSubCode = subCode.trim();
  const canSubmit = trimmedSubCode.length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.warning(API_ERROR_MESSAGE.SUB_CODE_REQUIRED);
      return;
    }

    try {
      setIsSubmitting(true);
      const updatedProfile = await registerSubCode(trimmedSubCode);
      queryClient.setQueryData(queryKeys.profile, updatedProfile);
      toast.success("구독 코드를 등록했어요");
      navigate(PATH.APP_INFO, { replace: true });
    } catch (error) {
      if (isRequestAbortError(error)) return;
      console.error(error);
      showRegisterSubCodeError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader onBack={() => navigate(PATH.KAKAO_WEB_LOGIN, { replace: true })} />

      <main className={styles.main}>
        <SubCodeInputSection
          value={subCode}
          onChange={setSubCode}
          headingLevel="h1"
          maxLength={MAX_SUB_CODE_LENGTH}
        />
      </main>

      <footer className={styles.footer}>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          fullWidth
          size="m"
        >
          {isSubmitting ? "등록 중..." : "등록하기"}
        </Button>
      </footer>
    </div>
  );
}
