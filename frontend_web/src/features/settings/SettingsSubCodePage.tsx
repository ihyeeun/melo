import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { queryKeys } from "@/features/profile/hooks/queries/queryKey";
import { registerSubCode } from "@/features/settings/api/subCode";
import { SubCodeInputSection } from "@/features/sub-code/components/SubCodeInputSection";
import { PATH } from "@/router/path";
import { AppApiError } from "@/shared/api/apiClient";
import { API_ERROR_MESSAGE } from "@/shared/api/apiErrorMessage";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { toast } from "@/shared/commons/toast/toast";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

import styles from "./styles/SettingsSubCodePage.module.css";

const MAX_SUB_CODE_LENGTH = 40;
const REGISTER_SUB_CODE_ERROR_MESSAGE = "구독 코드 등록에 실패했어요";

function resolveRegisterSubCodeErrorMessage(error: unknown) {
  if (error instanceof AppApiError) {
    return error.message;
  }

  return REGISTER_SUB_CODE_ERROR_MESSAGE;
}

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
      toast.success("구독 코드가 등록되었어요");
      navigate(PATH.APP_INFO, { replace: true });
    } catch (error) {
      console.error(error);
      toast.warning(resolveRegisterSubCodeErrorMessage(error));
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
          size="large"
          interaction={canSubmit ? "normal" : "disable"}
        >
          {isSubmitting ? "확인 중..." : "확인"}
        </Button>
      </footer>
    </div>
  );
}
