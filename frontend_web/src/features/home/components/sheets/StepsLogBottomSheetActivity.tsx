import { useActivity } from "@stackflow/react";
import { useRef, useState } from "react";

import { useRegisterStepsMutation } from "@/features/home/hooks/mutations/useBodyLogMutation";
import { useGetBodyLog } from "@/features/home/hooks/queries/useTodayRecordQuery";
import style from "@/features/home/styles/TodayBodyLogSection.module.css";
import { PATH } from "@/router/path";
import { isNativeApp, openNativeInAppBrowser } from "@/shared/api/bridge/nativeBridge";
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

type StepsDraftState = {
  date: string;
  steps?: number;
};

export default function StepsLogBottomSheetActivity() {
  const activity = useActivity();
  const date = activity.params.date ?? getTodayFormatDateKey();
  const { data: bodyLog } = useGetBodyLog(date);
  const [draftState, setDraftState] = useState<StepsDraftState | null>(null);
  const draftSteps = draftState?.date === date ? draftState.steps : (bodyLog?.steps ?? undefined);
  const stepsInputRef = useRef<HTMLInputElement>(null);
  const isOpen =
    activity.transitionState === "enter-active" || activity.transitionState === "enter-done";
  const canImportNativeSteps = isNativeApp();
  const nativeStepConnectionStatus = canImportNativeSteps
    ? activity.params.nativeStepConnectionStatus
    : "disconnected";
  const canInputSteps = nativeStepConnectionStatus === "disconnected";
  const nativeSyncedSteps = canInputSteps ? null : (bodyLog?.steps ?? null);

  const closeSheet = () => {
    if (!activity.isActive) return;
    navigateBack({ fallbackTo: PATH.HOME });
  };

  const handleOpenHealthAccessGuide = () => {
    if (!canImportNativeSteps) {
      window.open(HEALTH_ACCESS_GUIDE_URL, "_blank", "noopener,noreferrer");
      return;
    }

    void openNativeInAppBrowser(HEALTH_ACCESS_GUIDE_URL).catch(() => {
      window.open(HEALTH_ACCESS_GUIDE_URL, "_blank", "noopener,noreferrer");
    });
  };

  const { mutate: registerManualSteps, isPending: isManualStepsPending } = useRegisterStepsMutation(
    {
      onSuccess: () => {
        toast.success("걸음 수가 기록되었어요");
        closeSheet();
      },
      onError: () => {
        toast.error("걸음 수 기록에 실패했어요");
      },
    },
  );

  const handleSubmit = () => {
    const submittedSteps = draftSteps;

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

  const loadingLabel = isManualStepsPending ? "걸음 수를 기록하는 중입니다." : null;

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={closeSheet}>
        <div className={style.sheetContainer}>
          <div className={style.titleContainer}>
            <p className={`${style.sheetTitle} typo-title2`}>오늘의 걸음 수</p>
          </div>
          <div className={style.stepsFieldRow}>
            {canInputSteps ? (
              <div className={style.stepsInputContainer}>
                <NumberField
                  key={date}
                  value={draftSteps}
                  onChange={(nextValue) => {
                    if (nextValue === undefined) {
                      setDraftState({ date, steps: undefined });
                      return;
                    }

                    const nextSteps = toInteger(nextValue);
                    setDraftState({ date, steps: Math.min(MAX_STEPS, Math.max(0, nextSteps)) });
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

                <Button
                  variant="text"
                  color="normal"
                  className={style.healthAccessNoticeButton}
                  onClick={handleOpenHealthAccessGuide}
                >
                  걸음 수 연동하기
                  <SystemIcon name="chevron-right-normal" size={16} />
                </Button>
              </div>
            ) : (
              <p
                className={`${style.syncedStepsValue} typo-body1`}
                aria-label={
                  nativeSyncedSteps === null
                    ? "연동된 오늘의 걸음 수 데이터 없음"
                    : `연동된 오늘의 걸음 수 ${nativeSyncedSteps.toLocaleString()}보`
                }
              >
                {nativeSyncedSteps === null
                  ? "걸음 수 데이터가 없어요"
                  : `${nativeSyncedSteps.toLocaleString()} 보`}
              </p>
            )}
          </div>
          <div className={style.sheetActions}>
            {canInputSteps && (
              <Button onClick={handleSubmit} fullWidth size="large" disabled={isManualStepsPending}>
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
