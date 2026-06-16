import { useActivity } from "@stackflow/react";
import { useEffect, useRef, useState } from "react";

import { useRegisterStepsMutation } from "@/features/home/hooks/mutations/useBodyLogMutation";
import { useGetBodyLog } from "@/features/home/hooks/queries/useTodayRecordQuery";
import style from "@/features/home/styles/TodayBodyLogSection.module.css";
import { PATH } from "@/router/path";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import NumberField from "@/shared/commons/input/NumberField";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { toast } from "@/shared/commons/toast/toast";
import { navigateBack } from "@/shared/navigation/stackflowNavigationController";
import { getTodayFormatDateKey } from "@/shared/utils/dateFormat";

const MAX_STEPS = 999999;

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
  const stepsInputRef = useRef<HTMLInputElement>(null);
  const isOpen =
    activity.transitionState === "enter-active" || activity.transitionState === "enter-done";

  const closeSheet = () => {
    if (!activity.isActive) return;
    navigateBack({ fallbackTo: PATH.HOME });
  };

  useEffect(() => {
    if (!isOpen) return;

    stepsInputRef.current?.focus();
  }, [isOpen]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Keep sheet input synced with async body log data.
    setDraftSteps(bodyLog?.steps ?? undefined);
  }, [bodyLog?.steps]);

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

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={closeSheet}>
        <div className={style.sheetContainer}>
          <h3 className={`${style.sheetTitle} typo-title2`}>오늘의 걸음 수</h3>
          <NumberField
            value={draftSteps}
            onChange={(nextValue) => {
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
          <div className={style.sheetActions}>
            <Button onClick={handleSubmit} fullWidth size="large" disabled={isStepsPending}>
              기록하기
            </Button>
          </div>
        </div>
      </BottomSheet>

      {isStepsPending ? <LoadingOverlay label="걸음 수를 기록하는 중입니다." /> : null}
    </>
  );
}
