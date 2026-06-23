import { useActivity } from "@stackflow/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useRegisterStepsMutation } from "@/features/home/hooks/mutations/useBodyLogMutation";
import { useGetBodyLog } from "@/features/home/hooks/queries/useTodayRecordQuery";
import style from "@/features/home/styles/TodayBodyLogSection.module.css";
import { PATH } from "@/router/path";
import {
  isNativeApp,
  openNativeInAppBrowser,
  readNativeStepCountRecords,
  requestNativeHealthPermissionStatus,
  requestNativeHealthReadPermission,
} from "@/shared/api/bridge/nativeBridge";
import type { HealthPermissionStatus } from "@/shared/api/bridge/nativeBridge.types";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import NumberField from "@/shared/commons/input/NumberField";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { toast } from "@/shared/commons/toast/toast";
import { navigateBack } from "@/shared/navigation/stackflowNavigationController";
import { getTodayFormatDateKey } from "@/shared/utils/dateFormat";

const MAX_STEPS = 999999;
const HEALTH_ACCESS_GUIDE_URL = "https://third-princess-d57.notion.site/health-connect";
const NATIVE_STEPS_CONNECTED_PERMISSION_STATUSES = new Set<HealthPermissionStatus>([
  "granted",
  "denied",
  "not_determined",
  "restricted",
]);

function toInteger(value: number) {
  return Math.trunc(value);
}

function isStepsInputAllowed(inputValue: string) {
  const normalized = inputValue.replaceAll(",", "");
  if (normalized === "") return true;
  if (!/^\d+$/.test(normalized)) return false;
  if (normalized.length > 6) return false;

  return Number(normalized) <= MAX_STEPS;
}

function isNativeStepsConnectedPermissionStatus(permissionStatus: HealthPermissionStatus) {
  return NATIVE_STEPS_CONNECTED_PERMISSION_STATUSES.has(permissionStatus);
}

export default function StepsLogBottomSheetActivity() {
  const activity = useActivity();
  const date = activity.params.date ?? getTodayFormatDateKey();
  const { data: bodyLog } = useGetBodyLog(date);
  const [draftSteps, setDraftSteps] = useState<number | undefined>(bodyLog?.steps ?? undefined);
  const [nativeSyncedSteps, setNativeSyncedSteps] = useState<number | null>(null);
  const [isNativeStepsConnected, setIsNativeStepsConnected] = useState(false);
  const [shouldShowHealthAccessNotice, setShouldShowHealthAccessNotice] = useState(false);
  const [stepsFieldRevision, setStepsFieldRevision] = useState(0);
  const isDraftTouchedRef = useRef(false);
  const isNativeStepSyncingRef = useRef(false);
  const previousDateRef = useRef(date);
  const stepsInputRef = useRef<HTMLInputElement>(null);
  const isOpen =
    activity.transitionState === "enter-active" || activity.transitionState === "enter-done";
  const canImportNativeSteps = isNativeApp();

  const closeSheet = () => {
    if (!activity.isActive) return;
    navigateBack({ fallbackTo: PATH.HOME });
  };

  useEffect(() => {
    if (!isOpen) return;
    if (canImportNativeSteps) return;

    stepsInputRef.current?.focus();
  }, [canImportNativeSteps, isOpen]);

  const { mutate: registerManualSteps, isPending: isManualStepsPending } = useRegisterStepsMutation({
    onSuccess: () => {
      toast.success("걸음 수가 기록되었어요");
      closeSheet();
    },
    onError: () => {
      toast.error("걸음 수 기록에 실패했어요");
    },
  });
  const { mutate: registerNativeStepsSilently } = useRegisterStepsMutation();

  useEffect(() => {
    if (previousDateRef.current !== date) {
      previousDateRef.current = date;
      isDraftTouchedRef.current = false;
      setNativeSyncedSteps(null);
      setIsNativeStepsConnected(false);
      setShouldShowHealthAccessNotice(false);
      setStepsFieldRevision((revision) => revision + 1);
    }

    if (isDraftTouchedRef.current) return;

    setDraftSteps(bodyLog?.steps ?? undefined);
  }, [bodyLog?.steps, date]);

  const handleSubmit = () => {
    const submittedSteps = isNativeStepsConnected ? (nativeSyncedSteps ?? 0) : draftSteps;

    if (submittedSteps === undefined) {
      toast.warning("걸음 수를 입력해주세요");
      return;
    }

    const nextSteps = toInteger(submittedSteps);
    if (nextSteps < 0 || nextSteps > MAX_STEPS) {
      toast.warning("걸음 수는 0 ~ 999,999 사이로 입력해주세요");
      return;
    }

    registerManualSteps({ date, steps: nextSteps });
  };

  const syncNativeSteps = useCallback(async () => {
    if (!canImportNativeSteps) {
      return;
    }
    if (isNativeStepSyncingRef.current) return;

    isNativeStepSyncingRef.current = true;
    setNativeSyncedSteps(null);
    setIsNativeStepsConnected(false);
    setShouldShowHealthAccessNotice(false);

    try {
      const permission = await requestNativeHealthPermissionStatus();
      let permissionStatus = permission.permissionStatus;

      if (permissionStatus !== "granted") {
        const requestedPermission = await requestNativeHealthReadPermission();
        permissionStatus = requestedPermission.permissionStatus;
      }

      const isConnected = isNativeStepsConnectedPermissionStatus(permissionStatus);
      setIsNativeStepsConnected(isConnected);

      if (permissionStatus !== "granted") {
        setShouldShowHealthAccessNotice(false);
        return;
      }

      const result = await readNativeStepCountRecords({
        startDate: date,
        endDate: date,
      });

      const record = result.records.find((item) => item.date === date);
      if (!record) {
        setNativeSyncedSteps(null);
        setIsNativeStepsConnected(false);
        setShouldShowHealthAccessNotice(false);
        return;
      }

      const nextSteps = Math.min(MAX_STEPS, Math.max(0, toInteger(record.steps)));

      isDraftTouchedRef.current = true;
      setNativeSyncedSteps(nextSteps);
      setShouldShowHealthAccessNotice(false);
      setDraftSteps(nextSteps);
      setStepsFieldRevision((revision) => revision + 1);
      registerNativeStepsSilently({ date, steps: nextSteps });
    } catch {
      setNativeSyncedSteps(null);
      setIsNativeStepsConnected(false);
      setShouldShowHealthAccessNotice(false);
    } finally {
      isNativeStepSyncingRef.current = false;
    }
  }, [canImportNativeSteps, date, registerNativeStepsSilently]);

  useEffect(() => {
    if (!isOpen) return;
    if (!canImportNativeSteps) return;

    void syncNativeSteps();
  }, [canImportNativeSteps, isOpen, syncNativeSteps]);

  const handleOpenHealthAccessGuide = useCallback(() => {
    if (!canImportNativeSteps) {
      window.open(HEALTH_ACCESS_GUIDE_URL, "_blank", "noopener,noreferrer");
      return;
    }

    void openNativeInAppBrowser(HEALTH_ACCESS_GUIDE_URL).catch(() => {
      window.open(HEALTH_ACCESS_GUIDE_URL, "_blank", "noopener,noreferrer");
    });
  }, [canImportNativeSteps]);

  const loadingLabel = isManualStepsPending ? "걸음 수를 기록하는 중입니다." : null;
  const connectedStepsDisplayValue = nativeSyncedSteps ?? 0;

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={closeSheet}>
        <div className={style.sheetContainer}>
          <div className={style.titleContainer}>
            <p className={`${style.sheetTitle} typo-title2`}>오늘의 걸음 수</p>
            {shouldShowHealthAccessNotice ? (
              <button
                type="button"
                className={style.healthAccessNoticeButton}
                aria-label="건강 접근 안내 보기"
                onClick={handleOpenHealthAccessGuide}
              >
                <SystemIcon name="backup" mode="image" />
              </button>
            ) : null}
          </div>
          <div className={style.stepsFieldRow}>
            {isNativeStepsConnected ? (
              <p
                className={`${style.syncedStepsValue} typo-body1`}
                aria-label={`연동된 오늘의 걸음 수 ${connectedStepsDisplayValue.toLocaleString()}보`}
              >
                {connectedStepsDisplayValue.toLocaleString()} 보
              </p>
            ) : (
              <NumberField
                key={stepsFieldRevision}
                value={draftSteps}
                onChange={(nextValue) => {
                  isDraftTouchedRef.current = true;

                  if (nextValue === undefined) {
                    setDraftSteps(undefined);
                    return;
                  }

                  const nextSteps = toInteger(nextValue);
                  setDraftSteps(Math.min(MAX_STEPS, Math.max(0, nextSteps)));
                }}
                min={0}
                max={MAX_STEPS}
                step={1}
                allowOutOfRange={false}
                normalizeValue={toInteger}
                isInputTextAllowed={isStepsInputAllowed}
                inputRef={stepsInputRef}
                showControls={false}
                unstyled
                classNames={{
                  root: style.stepsNumberFieldRoot,
                  group: style.stepsNumberFieldGroup,
                  inputWrapper: style.stepsInputWrapper,
                  input: `typo-body3 ${style.stepsNumberInput}`,
                }}
                format={{ maximumFractionDigits: 0, useGrouping: true }}
                inputProps={{
                  inputMode: "numeric",
                  placeholder: "걸음 수 입력",
                  "aria-label": "오늘의 걸음 수 입력",
                }}
                suffix={<span className={`typo-caption1 ${style.stepsUnit}`}>보</span>}
              />
            )}
          </div>
          <div className={style.sheetActions}>
            {!isNativeStepsConnected && (
              <Button
                onClick={handleSubmit}
                fullWidth
                size="large"
                disabled={isManualStepsPending}
              >
                기록하기
              </Button>
            )}
          </div>
        </div>
      </BottomSheet>

      {loadingLabel ? <LoadingOverlay label={loadingLabel} /> : null}
    </>
  );
}
