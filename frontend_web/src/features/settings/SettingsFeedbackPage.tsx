import { useStack } from "@stackflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import AppOpenSettingsFeedbackPage from "@/features/app-open/AppOpenSettingsFeedbackPage";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import {
  isNativeApp,
  requestNativeAppDeviceInfo,
  syncAppTab,
} from "@/shared/api/bridge/nativeBridge";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

import styles from "./styles/SettingsDetail.module.css";

const TALLY_FORM_BASE_URL = "https://tally.so/embed/EkMj9L";

function getTallyFormUrl(userId: number, appVersion: string | null) {
  const url = new URL(TALLY_FORM_BASE_URL);

  url.searchParams.set("id", String(userId));
  if (appVersion) {
    url.searchParams.set("version", appVersion);
  }

  return url.toString();
}

export default function SettingsFeedbackPage() {
  if (!isNativeApp()) {
    return <AppOpenSettingsFeedbackPage autoOpen={false} />;
  }

  return <NativeSettingsFeedbackPage />;
}

function NativeSettingsFeedbackPage() {
  const navigate = useNavigate();
  const stack = useStack();
  const [appVersion, setAppVersion] = useState<string | null | undefined>(undefined);
  const [loadedFormUrl, setLoadedFormUrl] = useState<string | null>(null);
  const {
    data: profile,
    isError: isProfileError,
    isPending: isProfilePending,
    isRefetching: isProfileRefetching,
    refetch: refetchProfile,
  } = useGetProfileQuery();
  const isAppVersionPending = appVersion === undefined;
  const tallyFormUrl = useMemo(
    () => (profile && !isAppVersionPending ? getTallyFormUrl(profile.user_id, appVersion) : null),
    [appVersion, isAppVersionPending, profile],
  );
  const isFormLoading = tallyFormUrl !== null && loadedFormUrl !== tallyFormUrl;
  const canGoBack = stack.activities.filter((activity) => !activity.exitedBy).length > 1;
  const handleBack = useCallback(() => {
    if (canGoBack) {
      navigate(-1);
      return;
    }

    syncAppTab("home");
  }, [canGoBack, navigate]);

  useEffect(() => {
    track(EVENT_NAME.CLICK_FEEDBACK_BUTTON);
  }, []);

  useEffect(() => {
    let isActive = true;

    void requestNativeAppDeviceInfo()
      .then((deviceInfo) => {
        if (!isActive) return;

        setAppVersion(deviceInfo.appVersion ?? null);
      })
      .catch(() => {
        if (!isActive) return;

        setAppVersion(null);
      });

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className={styles.page}>
      <PageHeader onBack={handleBack} />

      <main className={styles.formMain}>
        {isProfilePending || isAppVersionPending ? (
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
