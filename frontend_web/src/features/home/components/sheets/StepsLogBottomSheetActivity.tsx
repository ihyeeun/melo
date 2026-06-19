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

export default function StepsLogBottomSheetActivity() {
  const activity = useActivity();
  const date = activity.params.date ?? getTodayFormatDateKey();
  const { data: bodyLog } = useGetBodyLog(date);
  const [draftSteps, setDraftSteps] = useState<number | undefined>(bodyLog?.steps ?? undefined);
  const [isImportingSteps, setIsImportingSteps] = useState(false);
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

  const { mutate: registerSteps, isPending: isStepsPending } = useRegisterStepsMutation({
    onSuccess: () => {
      toast.success("걸음 수가 기록되었어요");
      closeSheet();
    },
    onError: () => {
      toast.error("걸음 수 기록에 실패했어요");
    },
  });

  useEffect(() => {
    if (previousDateRef.current !== date) {
      previousDateRef.current = date;
      isDraftTouchedRef.current = false;
      setShouldShowHealthAccessNotice(false);
      setStepsFieldRevision((revision) => revision + 1);
    }

    if (isDraftTouchedRef.current) return;

    setDraftSteps(bodyLog?.steps ?? undefined);
  }, [bodyLog?.steps, date]);

  const handleSubmit = () => {
    if (draftSteps === undefined) {
      toast.warning("걸음 수를 입력해주세요");
      return;
    }

    const nextSteps = toInteger(draftSteps);
    if (nextSteps < 0 || nextSteps > MAX_STEPS) {
      toast.warning("걸음 수는 0 ~ 999,999 사이로 입력해주세요");
      return;
    }

    registerSteps({ date, steps: nextSteps });
  };

  const syncNativeSteps = useCallback(async () => {
    if (!canImportNativeSteps) {
      return;
    }
    if (isNativeStepSyncingRef.current) return;

    isNativeStepSyncingRef.current = true;
    setIsImportingSteps(true);
    setShouldShowHealthAccessNotice(false);

    try {
      console.log("[HealthBridge] auto sync steps start", { date });

      const permission = await requestNativeHealthPermissionStatus();
      console.log("[HealthBridge] permission response", permission);

      if (permission.permissionStatus !== "granted") {
        const requestedPermission = await requestNativeHealthReadPermission();
        console.log("[HealthBridge] requested permission response", requestedPermission);
      }

      const result = await readNativeStepCountRecords({
        startDate: date,
        endDate: date,
      });
      console.log("[HealthBridge] read steps response", result);

      const record = result.records.find((item) => item.date === date);
      if (!record) {
        console.log("[HealthBridge] no record for date", {
          date,
          records: result.records,
        });
        setShouldShowHealthAccessNotice(true);
        return;
      }

      const nextSteps = Math.min(MAX_STEPS, Math.max(0, toInteger(record.steps)));

      isDraftTouchedRef.current = true;
      setShouldShowHealthAccessNotice(false);
      setDraftSteps(nextSteps);
      setStepsFieldRevision((revision) => revision + 1);
    } catch (error) {
      console.error("[HealthBridge] auto sync steps failed", error);
      setShouldShowHealthAccessNotice(true);
      toast.error("걸음 수를 가져오지 못했어요");
    } finally {
      isNativeStepSyncingRef.current = false;
      setIsImportingSteps(false);
    }
  }, [canImportNativeSteps, date]);

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

    void openNativeInAppBrowser(HEALTH_ACCESS_GUIDE_URL).catch((error) => {
      console.error("[HealthBridge] open guide failed", error);
      window.open(HEALTH_ACCESS_GUIDE_URL, "_blank", "noopener,noreferrer");
    });
  }, [canImportNativeSteps]);

  const loadingLabel = isImportingSteps
    ? "건강 앱 걸음 수를 가져오는 중입니다."
    : isStepsPending
      ? "걸음 수를 기록하는 중입니다."
      : null;

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
          </div>
          <div className={style.sheetActions}>
            <Button
              onClick={handleSubmit}
              fullWidth
              size="large"
              disabled={isImportingSteps || isStepsPending}
            >
              기록하기
            </Button>
          </div>
        </div>
      </BottomSheet>

      {loadingLabel ? <LoadingOverlay label={loadingLabel} /> : null}
    </>
  );
}
