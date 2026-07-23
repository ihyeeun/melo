import { useActivity } from "@stackflow/react";
import { useEffect, useState } from "react";

import { useRegisterWeightMutation } from "@/features/home/hooks/mutations/useBodyLogMutation";
import { useGetBodyLog } from "@/features/home/hooks/queries/useTodayRecordQuery";
import style from "@/features/home/styles/TodayBodyLogSection.module.css";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { PATH } from "@/router/path";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import NumberField from "@/shared/commons/input/NumberField";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { toast } from "@/shared/commons/toast/toast";
import { navigateBack } from "@/shared/navigation/stackflowNavigationController";
import { getTodayFormatDateKey } from "@/shared/utils/dateFormat";
import { toOneDecimalPlace } from "@/shared/utils/numberFormat";

const MAX_WEIGHT = 200;

function isWeightInputAllowed(inputValue: string) {
  const normalized = inputValue.trim();
  if (normalized === "") return true;
  if (!/^\d{0,3}(?:\.\d?)?$/.test(normalized)) return false;

  return Number(normalized) <= MAX_WEIGHT;
}

function resolveWeightSuccessMessage({
  previousWeight,
  nextWeight,
}: {
  previousWeight: number | null;
  nextWeight: number;
}) {
  if (previousWeight === null) {
    return "체중이 기록되었어요";
  }

  const weightDiff = toOneDecimalPlace(nextWeight - previousWeight);

  if (weightDiff < 0) {
    return `${weightDiff.toFixed(1)}kg 감량했어요!`;
  }

  return "체중이 기록되었어요";
}

export default function WeightLogBottomSheetActivity() {
  const activity = useActivity();
  const date = activity.params.date ?? getTodayFormatDateKey();
  const isToday = date === getTodayFormatDateKey();
  const { data: bodyLog } = useGetBodyLog(date);
  const { data: profile } = useGetProfileQuery();
  const initialWeight = bodyLog?.weight ?? (isToday ? profile?.weight : undefined);
  const [draftWeight, setDraftWeight] = useState<number | undefined>(initialWeight);
  const isOpen =
    activity.transitionState === "enter-active" || activity.transitionState === "enter-done";

  const closeSheet = () => {
    if (!activity.isActive) return;
    navigateBack({ fallbackTo: PATH.HOME });
  };

  const { mutate: registerWeight, isPending: isWeightPending } = useRegisterWeightMutation({
    onError: () => {
      toast.error("체중 기록에 실패했어요");
    },
  });

  useEffect(() => {
    setDraftWeight(initialWeight);
  }, [initialWeight]);

  const canDecrease = draftWeight !== undefined && draftWeight > 1;
  const canIncrease = draftWeight === undefined || draftWeight < MAX_WEIGHT;

  const handleSubmit = () => {
    if (draftWeight === undefined) {
      toast.warning("체중을 입력해주세요");
      return;
    }

    const nextWeight = toOneDecimalPlace(draftWeight);
    if (nextWeight < 1 || nextWeight > MAX_WEIGHT) {
      toast.warning("정확한 값인지 다시 확인해주세요");
      return;
    }

    const previousWeight = initialWeight ?? null;
    registerWeight(
      { date, weight: nextWeight },
      {
        onSuccess: () => {
          toast.success(resolveWeightSuccessMessage({ previousWeight, nextWeight }));
          closeSheet();
        },
      },
    );
  };

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={closeSheet}>
        <div className={style.sheetContainer}>
          <h3 className={`${style.sheetTitle} typo-title2`}>오늘의 체중</h3>
          <NumberField
            value={draftWeight}
            onChange={setDraftWeight}
            min={1}
            max={MAX_WEIGHT}
            step={0.1}
            allowOutOfRange
            normalizeValue={toOneDecimalPlace}
            isInputTextAllowed={isWeightInputAllowed}
            classNames={{
              group: style.weightNumberFieldGroup,
              decrement: style.weightAdjustButton,
              increment: style.weightAdjustButton,
              inputWrapper: style.weightValueDisplay,
              input: `typo-h2 ${style.weightNumberInput}`,
              unit: `typo-caption1 ${style.weightUnit}`,
            }}
            decrementAriaLabel="체중 0.1kg 감소"
            incrementAriaLabel="체중 0.1kg 증가"
            decrementDisabled={!canDecrease}
            incrementDisabled={!canIncrease}
            decrementIcon={<SystemIcon name="circle-minus-large" mode="image" size={32} />}
            incrementIcon={<SystemIcon name="circle-plus-large" mode="image" size={32} />}
            unit="kg"
            unstyled
            format={{
              maximumFractionDigits: 1,
              minimumFractionDigits: 0,
              useGrouping: false,
            }}
            inputProps={{
              inputMode: "decimal",
              placeholder: "0",
              "aria-label": "오늘의 체중 입력",
            }}
          />
          <div className={style.sheetActions}>
            <Button
              onClick={handleSubmit}
              fullWidth
              size="large"
              interaction={draftWeight !== undefined && draftWeight !== 0 ? "normal" : "disable"}
              disabled={draftWeight === undefined || draftWeight === 0 || isWeightPending}
            >
              기록하기
            </Button>
          </div>
        </div>
      </BottomSheet>

      {isWeightPending ? <LoadingOverlay label="체중을 기록하는 중입니다." /> : null}
    </>
  );
}
