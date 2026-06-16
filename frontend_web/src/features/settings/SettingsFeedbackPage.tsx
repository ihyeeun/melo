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
import type { AppDeviceInfoPayload } from "@/shared/api/bridge/nativeBridge.types";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

import styles from "./styles/SettingsDetail.module.css";

const TALLY_FORM_BASE_URL = "https://tally.so/embed/EkMj9L";

type DeviceInfoQueryParams = {
  appVersion: string | null;
  osName: AppDeviceInfoPayload["osName"] | null;
  osVersion: string | null;
};

function formatOsQueryValue(deviceInfo: DeviceInfoQueryParams) {
  if (!deviceInfo.osName) return null;

  const osVersion = deviceInfo.osVersion?.trim();

  return osVersion ? `${deviceInfo.osName} ${osVersion}` : deviceInfo.osName;
}

function getTallyFormUrl(userId: number, deviceInfo: DeviceInfoQueryParams) {
  const url = new URL(TALLY_FORM_BASE_URL);
  const osQueryValue = formatOsQueryValue(deviceInfo);

  url.searchParams.set("id", String(userId));
  if (deviceInfo.appVersion) {
    url.searchParams.set("version", deviceInfo.appVersion);
  }
  if (osQueryValue) {
    url.searchParams.set("os", osQueryValue);
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
  const [deviceInfoQueryParams, setDeviceInfoQueryParams] = useState<
    DeviceInfoQueryParams | undefined
  >(undefined);
  const [loadedFormUrl, setLoadedFormUrl] = useState<string | null>(null);
  const {
    data: profile,
    isError: isProfileError,
    isPending: isProfilePending,
    isRefetching: isProfileRefetching,
    refetch: refetchProfile,
  } = useGetProfileQuery();
  const isDeviceInfoPending = deviceInfoQueryParams === undefined;
  const tallyFormUrl = useMemo(
    () =>
      profile && !isDeviceInfoPending
        ? getTallyFormUrl(profile.user_id, deviceInfoQueryParams)
        : null,
    [deviceInfoQueryParams, isDeviceInfoPending, profile],
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

        setDeviceInfoQueryParams({
          appVersion: deviceInfo.appVersion ?? null,
          osName: deviceInfo.osName,
          osVersion: deviceInfo.osVersion ?? null,
        });
      })
      .catch(() => {
        if (!isActive) return;

        setDeviceInfoQueryParams({
          appVersion: null,
          osName: null,
          osVersion: null,
        });
      });

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className={styles.page}>
      <PageHeader onBack={handleBack} />

      <main className={styles.formMain}>
        {isProfilePending || isDeviceInfoPending ? (
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
