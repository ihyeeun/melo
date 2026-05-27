import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { registerSubCode } from "@/features/profile/api/profile";
import { queryKeys } from "@/features/profile/hooks/queries/queryKey";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { toast } from "@/shared/commons/toast/toast";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

import styles from "./styles/SettingsSubCodePage.module.css";

const MAX_SUB_CODE_LENGTH = 40;

export default function SettingsSubCodePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [subCode, setSubCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedSubCode = subCode.trim();
  const canSubmit = trimmedSubCode.length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.warning("구독 코드를 입력해주세요");
      return;
    }

    try {
      setIsSubmitting(true);
      const updatedProfile = await registerSubCode(trimmedSubCode);
      queryClient.setQueryData(queryKeys.profile, updatedProfile);
      toast.success("구독 코드가 등록되었어요");
      navigate(-1);
    } catch (error) {
      console.error(error);
      toast.warning("구독 코드 등록에 실패했어요");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader onBack={() => navigate(-1)} title="구독 코드 입력" />

      <main className={styles.main}>
        <div className={styles.content}>
          <section className={styles.titleSection}>
            <h1 className={`${styles.title} typo-title1`}>구독 코드를 입력해주세요</h1>
          </section>

          <section className={styles.inputSection}>
            <input
              type="text"
              value={subCode}
              onChange={(event) => setSubCode(event.target.value.slice(0, MAX_SUB_CODE_LENGTH))}
              className={`${styles.input} typo-h1`}
              placeholder="구독 코드"
              aria-label="구독 코드"
            />
          </section>
        </div>
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
