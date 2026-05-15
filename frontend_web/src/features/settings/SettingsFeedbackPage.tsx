import { useEffect, useState } from "react";

import { useRegisterInquiryMutation } from "@/features/settings/hooks/mutations/useInquiryMutation";
import { isNativeApp, requestNativeAppDeviceInfo } from "@/shared/api/bridge/nativeBridge";
import type { AppDeviceInfoPayload } from "@/shared/api/bridge/nativeBridge.types";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { Skeleton } from "@/shared/commons/skeleton/Skeleton";
import { toast } from "@/shared/commons/toast/toast";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

import styles from "./styles/SettingsDetail.module.css";

const MAX_FEEDBACK_LENGTH = 1000;

export default function SettingsFeedbackPage() {
  const navigate = useNavigate();
  const isInNativeApp = isNativeApp();
  const [feedback, setFeedback] = useState("");
  const [appDeviceInfo, setAppDeviceInfo] = useState<AppDeviceInfoPayload | null>(null);
  const [isAppInfoLoading, setIsAppInfoLoading] = useState(isInNativeApp);
  const { mutate } = useRegisterInquiryMutation();

  const trimmedFeedback = feedback.trim();
  const canSubmit = trimmedFeedback.length > 0;
  const appInfoLabel = !isInNativeApp
    ? "앱 환경이 아니어서 앱/OS 정보를 표시하지 않습니다."
    : appDeviceInfo === null
      ? "앱/OS 정보를 불러오지 못했어요."
      : `앱 버전 ${appDeviceInfo.appVersion}${appDeviceInfo.appBuild ? ` (${appDeviceInfo.appBuild})` : ""} · ${appDeviceInfo.osName} ${appDeviceInfo.osVersion ?? "-"}`;

  useEffect(() => {
    let isActive = true;

    if (!isInNativeApp) {
      return () => {
        isActive = false;
      };
    }

    void requestNativeAppDeviceInfo()
      .then((deviceInfo) => {
        if (!isActive) return;
        setAppDeviceInfo(deviceInfo);
        setIsAppInfoLoading(false);
      })
      .catch(() => {
        if (!isActive) return;
        setAppDeviceInfo(null);
        setIsAppInfoLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [isInNativeApp]);

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.warning("내용을 입력해주세요");
      return;
    }

    mutate(trimmedFeedback, {
      onSuccess: () => {
        setFeedback("");
        toast.success("의견이 접수되었어요");
        navigate(-1);
      },
      onError: () => {
        toast.warning("문의 등록에 실패했어요");
      },
    });
  };

  return (
    <div className={styles.page}>
      <PageHeader onBack={() => navigate(-1)} title="문의하기" />

      <main className={styles.main}>
        <div className={styles.content}>
          <section className={styles.titleSection}>
            <h1 className={`${styles.title} typo-title1`}>
              서비스 이용 중 불편했던 점이나 <br />
              개선 아이디어를 알려주세요
            </h1>
          </section>

          <section className={styles.inputSection}>
            <div className={styles.textareaWrapper}>
              {feedback.length === 0 && (
                <p className={`${styles.textareaPlaceholder} typo-body3`} aria-hidden="true">
                  예) 검색이 잘 안 돼요
                  <br />
                  이런 기능이 있으면 좋겠어요
                </p>
              )}
              <textarea
                value={feedback}
                onChange={(event) => setFeedback(event.target.value.slice(0, MAX_FEEDBACK_LENGTH))}
                className={`${styles.textarea} typo-body3`}
                aria-label="문의 내용"
              />
            </div>
            <p className={`${styles.lengthText} typo-label4`}>최대 {MAX_FEEDBACK_LENGTH}자 이내</p>
            {isAppInfoLoading ? (
              <Skeleton width="68%" height={14} radius={999} />
            ) : (
              <p className={`${styles.lengthText} typo-caption`}>{appInfoLabel}</p>
            )}
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
          보내기
        </Button>
      </footer>
    </div>
  );
}
