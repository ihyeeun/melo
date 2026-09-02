import { useActivity } from "@stackflow/react";
import { useState } from "react";

import { useRegisterWeightMutation } from "@/features/home/hooks/mutations/useBodyLogMutation";
import { useGetBodyLog } from "@/features/home/hooks/queries/useTodayRecordQuery";
import styles from "@/features/home/styles/TodayBodyLogSection.module.css";
import { useMenstrualHistoryCoverage } from "@/features/menstruation/hooks/useMenstrualHistoryCoverage";
import { getMenstrualTypeFromPhase } from "@/features/menstruation/utils/menstrualPhaseDatesCalculation.util";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { PATH } from "@/router/path";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
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

type WeightDraft = {
  value: number | undefined;
};

function isWeightInputAllowed(inputValue: string) {
  const normalized = inputValue.trim();
  if (normalized === "") return true;
  if (!/^\d{0,3}(?:\.\d?)?$/.test(normalized)) return false;

  return Number(normalized) <= MAX_WEIGHT;
}

export default function WeightLogBottomSheetActivity() {
  const activity = useActivity();
  const date = activity.params.date ?? getTodayFormatDateKey();
  const isToday = date === getTodayFormatDateKey();
  const { data: bodyLog } = useGetBodyLog(date);
  const { data: profile } = useGetProfileQuery();
  const initialWeight = bodyLog?.weight ?? (isToday ? profile?.weight : undefined);
  const [weightDraft, setWeightDraft] = useState<WeightDraft | null>(null);
  const draftWeight = weightDraft === null ? initialWeight : weightDraft.value;
  const isOpen =
    activity.transitionState === "enter-active" || activity.transitionState === "enter-done";
  const menstrualHistory = useMenstrualHistoryCoverage({
    targetDate: date,
    enabled: profile?.gender === 1,
  });
  const menstrualStatus =
    menstrualHistory.status === "ready"
      ? getMenstrualTypeFromPhase({
          targetDate: date,
          phaseDate: menstrualHistory.phaseDate ?? undefined,
          latestCycleId: menstrualHistory.cycles[0]?.cycle_id ?? null,
        })
      : null;

  const closeSheet = () => {
    if (!activity.isActive) return;
    navigateBack({ fallbackTo: PATH.HOME });
  };

  const { mutate: registerWeight, isPending: isWeightPending } = useRegisterWeightMutation({
    onError: () => {
      toast.error("체중 기록에 실패했어요");
    },
  });

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
          const weightDiff =
            previousWeight === null ? null : toOneDecimalPlace(nextWeight - previousWeight);
          const body_weight_change =
            weightDiff === null
              ? null
              : weightDiff < 0
                ? "decreased"
                : weightDiff > 0
                  ? "increased"
                  : "unchanged";

          if (body_weight_change !== null) {
            track(EVENT_NAME.BODY_WEIGHT_RECORDED, {
              body_weight_change,
              weight_diff: weightDiff,
              ...(menstrualStatus ? { menstrual_phase: menstrualStatus } : {}),
            });
          }

          toast.success(
            weightDiff !== null && weightDiff < 0
              ? `${weightDiff.toFixed(1)}kg 감량했어요!`
              : "체중이 기록되었어요",
          );
          closeSheet();
        },
      },
    );
  };

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={closeSheet}>
        <div className={styles.sheetContainer}>
          <h3 className={`title-s-semi text-primary`}>오늘의 체중</h3>
          <NumberField
            value={draftWeight}
            onChange={(value) => setWeightDraft({ value })}
            min={1}
            max={MAX_WEIGHT}
            step={0.1}
            allowOutOfRange
            normalizeValue={toOneDecimalPlace}
            isInputTextAllowed={isWeightInputAllowed}
            classNames={{
              group: styles.weightNumberFieldGroup,
              decrement: styles.weightAdjustButton,
              increment: styles.weightAdjustButton,
              inputWrapper: styles.weightValueDisplay,
              input: `title-xl-medium text-primary ${styles.weightNumberInput}`,
              unit: `title-s-regular text-tertiary`,
            }}
            decrementAriaLabel="체중 0.1kg 감소"
            incrementAriaLabel="체중 0.1kg 증가"
            decrementDisabled={!canDecrease}
            incrementDisabled={!canIncrease}
            decrementIcon={<SystemIcon name="minus-circle" mode="image" size={28} />}
            incrementIcon={<SystemIcon name="plus-circle" mode="image" size={28} />}
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
          <div className={styles.sheetActions}>
            <Button
              onClick={handleSubmit}
              fullWidth
              size="m"
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
