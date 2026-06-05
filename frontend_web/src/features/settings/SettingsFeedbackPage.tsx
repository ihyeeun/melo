import { useMemo, useState } from "react";

import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

import styles from "./styles/SettingsDetail.module.css";

const TALLY_FORM_BASE_URL = "https://tally.so/embed/EkMj9L";

function getTallyFormUrl(userId: number) {
  const url = new URL(TALLY_FORM_BASE_URL);

  url.searchParams.set("id", String(userId));

  return url.toString();
}

export default function SettingsFeedbackPage() {
  const navigate = useNavigate();
  const [loadedFormUrl, setLoadedFormUrl] = useState<string | null>(null);
  const {
    data: profile,
    isError: isProfileError,
    isPending: isProfilePending,
    isRefetching: isProfileRefetching,
    refetch: refetchProfile,
  } = useGetProfileQuery();
  const tallyFormUrl = useMemo(
    () => (profile ? getTallyFormUrl(profile.user_id) : null),
    [profile],
  );
  const isFormLoading = tallyFormUrl !== null && loadedFormUrl !== tallyFormUrl;

  return (
    <div className={styles.page}>
      <PageHeader onBack={() => navigate(-1)} />

      <main className={styles.formMain}>
        {isProfilePending ? (
          <div className={styles.formState}>
            <LoadingIndicator label="문의 화면을 불러오는 중입니다." />
          </div>
        ) : isProfileError || !tallyFormUrl ? (
          <div className={styles.formState}>
            <p className={`${styles.formStateText} typo-body3`}>사용자 정보를 불러오지 못했어요</p>
            <Button
              onClick={() => void refetchProfile()}
              disabled={isProfileRefetching}
              interaction={isProfileRefetching ? "disable" : "normal"}
              size="small"
            >
              다시 시도
            </Button>
          </div>
        ) : (
          <div className={styles.formFrameWrapper}>
            <iframe
              className={styles.formFrame}
              onLoad={() => setLoadedFormUrl(tallyFormUrl)}
              src={tallyFormUrl}
              title="문의하기"
            />
            {isFormLoading ? (
              <div className={styles.formFrameLoading}>
                <LoadingIndicator label="문의 화면을 불러오는 중입니다." />
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
