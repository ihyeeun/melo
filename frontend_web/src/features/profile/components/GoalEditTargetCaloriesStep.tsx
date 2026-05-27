import { useEffect, useMemo, useState } from "react";

import { useTargetCaloriesMutation } from "@/features/onboarding/hooks/mutations/useRecommendMutation";
import {
  getGoalWeekEstimate,
  type GoalWeekEstimateResult,
} from "@/features/onboarding/utils/calculateGoalWeek";
import type { GoalEditDraft } from "@/features/profile/goalEdit.model";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { EditorInput } from "@/shared/commons/input/EditorInput";
import { toast } from "@/shared/commons/toast/toast";

import styles from "./GoalEditSteps.module.css";

const GOAL_CALORIES_MIN = 1;
const GOAL_CALORIES_MAX = 99999;
const GOAL_CALORIES_STEP = 1;

type Props = {
  data: GoalEditDraft;
  update: (patch: Partial<GoalEditDraft>) => void;
};

function toInteger(value: number) {
  return Math.trunc(value);
}

function formatTargetCalories(value?: number) {
  if (value === undefined) return "--";
  return toInteger(value).toString();
}

function hasRequiredRecommendPayload(data: GoalEditDraft) {
  return (
    data.gender !== undefined &&
    data.birthYear !== undefined &&
    data.weight !== undefined &&
    data.height !== undefined &&
    data.activity !== undefined &&
    data.goal !== undefined
  );
}

function showInvalidGoalCaloriesToast(goalWeekEstimate: GoalWeekEstimateResult) {
  if (goalWeekEstimate.status !== "invalid") {
    return;
  }

  if (goalWeekEstimate.reason === "calories_too_low_for_gain") {
    const minTargetCalories =
      goalWeekEstimate.tdee === undefined ? undefined : Math.ceil(goalWeekEstimate.tdee);
    toast.warning(
      "목표 체중에 비해 목표 칼로리가 너무 낮아요.",
      minTargetCalories === undefined
        ? undefined
        : `${minTargetCalories}kcal 보다 높게 입력해주세요.`,
    );
    return;
  }

  if (goalWeekEstimate.reason === "calories_too_high_for_loss") {
    const maxTargetCalories =
      goalWeekEstimate.tdee === undefined ? undefined : Math.floor(goalWeekEstimate.tdee);
    toast.warning(
      "목표 체중에 비해 목표 칼로리가 너무 높아요.",
      maxTargetCalories === undefined
        ? undefined
        : `${maxTargetCalories}kcal 보다 낮게 입력해주세요.`,
    );
    return;
  }

  if (goalWeekEstimate.reason === "no_daily_delta") {
    const tdee =
      goalWeekEstimate.tdee === undefined ? undefined : Math.round(goalWeekEstimate.tdee);
    toast.warning(
      "해당 칼로리로는 목표 달성이 어려워요.",
      tdee === undefined ? undefined : `${tdee}kcal와 다르게 입력해주세요.`,
    );
    return;
  }

  toast.warning("해당 칼로리로는 목표 달성이 어려워요.");
}

export default function GoalEditTargetCaloriesStep({ data, update }: Props) {
  const [open, setOpen] = useState(false);
  const [draftTargetCalories, setDraftTargetCalories] = useState<number | undefined>(undefined);

  const {
    mutate,
    isPending,
    data: responseData,
  } = useTargetCaloriesMutation({
    onError: (error) => {
      console.error(error);
    },
  });

  const requestPayload = useMemo(
    () => ({
      gender: data.gender,
      birthYear: data.birthYear,
      weight: data.weight,
      height: data.height,
      activity: data.activity,
      goal: data.goal,
      target_weight: data.target_weight,
    }),
    [
      data.gender,
      data.birthYear,
      data.weight,
      data.height,
      data.activity,
      data.goal,
      data.target_weight,
    ],
  );

  useEffect(() => {
    if (!hasRequiredRecommendPayload(requestPayload)) {
      return;
    }

    mutate(requestPayload);
  }, [mutate, requestPayload]);

  useEffect(() => {
    if (responseData === undefined) {
      return;
    }

    update({ target_calories: toInteger(responseData) });
  }, [responseData, update]);

  const displayRecommendedCalories =
    responseData === undefined ? undefined : toInteger(responseData);
  const visibleTargetCalories = data.target_calories ?? displayRecommendedCalories;
  const normalizedVisibleTargetCalories =
    visibleTargetCalories === undefined ? undefined : toInteger(visibleTargetCalories);

  const goalWeekEstimate =
    normalizedVisibleTargetCalories === undefined
      ? undefined
      : getGoalWeekEstimate(data, normalizedVisibleTargetCalories);

  const goalWeekMessage = (() => {
    if (goalWeekEstimate === undefined) {
      return "목표 달성 기간을 계산하고 있어요";
    }

    if (goalWeekEstimate.status === "invalid" && goalWeekEstimate.reason === "insufficient_data") {
      return "목표 달성 기간을 계산하고 있어요";
    }

    if (goalWeekEstimate.status === "invalid") {
      return "해당 칼로리로는 목표 달성이 어려워요";
    }

    return `목표 달성까지 약 ${goalWeekEstimate.weeks}주 걸려요`;
  })();

  const openEditor = () => {
    setDraftTargetCalories(normalizedVisibleTargetCalories);
    setOpen(true);
  };

  const handleConfirmTargetCalories = () => {
    if (draftTargetCalories === undefined || draftTargetCalories === 0) {
      toast.warning("목표 칼로리는 1 이상 입력해주세요");
      return;
    }

    const nextTargetCalories = toInteger(draftTargetCalories);

    if (nextTargetCalories < GOAL_CALORIES_MIN || nextTargetCalories > GOAL_CALORIES_MAX) {
      toast.warning("목표 칼로리는 1~99999 사이로 입력해주세요");
      return;
    }

    const nextGoalWeekEstimate = getGoalWeekEstimate(data, nextTargetCalories);

    if (nextGoalWeekEstimate.status === "invalid") {
      showInvalidGoalCaloriesToast(nextGoalWeekEstimate);
      return;
    }

    update({ target_calories: nextTargetCalories });
    setOpen(false);
    toast.success("수정되었어요.");
  };

  return (
    <section className={styles.content}>
      <div className={`${styles.title} ${styles.titleGroup}`}>
        <h2 className="typo-title1">목표 칼로리를 선택해주세요</h2>
        {isPending ? (
          <div className={styles.loadingRow}>
            <p className={`${styles.subtitle} typo-body2`}>추천 목표 칼로리를 계산하고 있어요</p>
          </div>
        ) : (
          <p className={`${styles.subtitle} typo-body2`}>
            추천하는 목표 칼로리는{" "}
            <span className="textNoWrap">
              {formatTargetCalories(displayRecommendedCalories)}kcal
            </span>
            예요
          </p>
        )}
      </div>

      <div className={styles.goalCalorieContainer}>
        <button className={styles.goalKcalTrigger} type="button" onClick={openEditor}>
          <p className={`${styles.goalKcalValue} textNoWrap typo-h1`}>
            {formatTargetCalories(visibleTargetCalories)} kcal
          </p>
          <SystemIcon name="pencil-fill" size={24} />
        </button>

        <p className={`${styles.goalKcalHelper} typo-body1`}>{goalWeekMessage}</p>
      </div>
      <BottomSheet isOpen={open} onClose={() => setOpen(false)}>
        <div className={styles.goalKcalSheet}>
          <h3 className="typo-title2">목표 칼로리</h3>
          <EditorInput
            type="number"
            inputMode="numeric"
            value={draftTargetCalories}
            max={GOAL_CALORIES_MAX}
            min={GOAL_CALORIES_MIN}
            step={GOAL_CALORIES_STEP}
            blockOutOfRangeInput
            placeholder="목표 칼로리 입력"
            unit="kcal"
            clampOnChange={true}
            normalizeOnBlur={false}
            onChange={(value) => {
              setDraftTargetCalories(value === undefined ? undefined : toInteger(value));
            }}
          />
          <div className={styles.goalKcalActions}>
            <Button
              onClick={handleConfirmTargetCalories}
              fullWidth
              interaction={draftTargetCalories ? "normal" : "disable"}
              disabled={draftTargetCalories === undefined || draftTargetCalories === 0}
              size="large"
            >
              수정하기
            </Button>
          </div>
        </div>
      </BottomSheet>
    </section>
  );
}
