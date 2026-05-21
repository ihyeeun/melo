import { useState } from "react";

import style from "@/features/home/styles/TodayBodyLogSection.module.css";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import NumberField from "@/shared/commons/input/NumberField";
import { toast } from "@/shared/commons/toast/toast";

interface StepsLogBottomSheetProps {
  initialSteps: number | undefined;
  onClose: () => void;
  onSubmit: (steps: number) => void;
}

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

export default function StepsLogBottomSheet({
  initialSteps,
  onClose,
  onSubmit,
}: StepsLogBottomSheetProps) {
  const [draftSteps, setDraftSteps] = useState<number | undefined>(initialSteps);

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

    onSubmit(nextSteps);
  };

  return (
    <BottomSheet isOpen onClose={onClose}>
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
          <Button onClick={handleSubmit} fullWidth size="large">
            기록하기
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
