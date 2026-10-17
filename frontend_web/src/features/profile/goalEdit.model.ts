import {
  isInRange,
  ONBOARDING_HEIGHT_RANGE,
  ONBOARDING_WEIGHT_RANGE,
} from "@/features/onboarding/constants/inputRanges";
import type { OnboardingData } from "@/features/onboarding/onboarding.types";
import { getGoalWeekEstimate } from "@/features/onboarding/utils/calculateGoalWeek";
import type { ProfileResponseDto } from "@/shared/api/types/api.response.dto";
import { isValidBirthYear } from "@/shared/commons/picker/yearOptions";

export type GoalEditDraft = Pick<
  OnboardingData,
  | "gender"
  | "birthYear"
  | "height"
  | "weight"
  | "activity"
  | "goal"
  | "target_weight"
  | "target_calories"
  | "carbs"
  | "protein"
  | "fat"
>;

export const GOAL_CALORIES_MIN = 1;
export const GOAL_CALORIES_MAX = 99999;
const RATIO_TOLERANCE = 0.001;

export function validateGoalCalories(
  draft: GoalEditDraft,
): { title: string; description?: string } | null {
  const targetCalories = draft.target_calories;

  if (targetCalories === undefined) {
    return { title: "목표 칼로리를 입력해주세요" };
  }

  if (targetCalories === 0) {
    return { title: "목표 칼로리는 1 이상 입력해주세요" };
  }

  if (
    !Number.isInteger(targetCalories) ||
    targetCalories < GOAL_CALORIES_MIN ||
    targetCalories > GOAL_CALORIES_MAX
  ) {
    return { title: "목표 칼로리는 1~99999 사이로 입력해주세요" };
  }

  const estimate = getGoalWeekEstimate(draft, targetCalories);
  if (estimate.status === "ok") return null;

  if (estimate.reason === "insufficient_data") {
    return {
      title: "목표 달성 기간을 계산할 정보가 부족해요",
      description: "이전 단계에서 신체 정보와 목표 몸무게를 확인해주세요.",
    };
  }

  if (estimate.reason === "calories_too_low_for_gain") {
    return {
      title: "목표 체중에 비해 목표 칼로리가 너무 낮아요.",
      description:
        estimate.tdee === undefined
          ? undefined
          : `${Math.floor(estimate.tdee) + 1}kcal 이상 입력해주세요.`,
    };
  }

  if (estimate.reason === "calories_too_high_for_loss") {
    return {
      title: "목표 체중에 비해 목표 칼로리가 너무 높아요.",
      description:
        estimate.tdee === undefined
          ? undefined
          : `${Math.ceil(estimate.tdee) - 1}kcal 이하로 입력해주세요.`,
    };
  }

  return { title: "해당 칼로리로는 목표 달성이 어려워요." };
}

export function toGoalEditDraft(profile: ProfileResponseDto): GoalEditDraft {
  return {
    gender: profile.gender,
    birthYear: profile.birthYear,
    height: profile.height,
    weight: profile.weight,
    activity: profile.activity,
    goal: profile.goal,
    target_weight: profile.target_weight,
    target_calories: profile.target_calories,
    carbs: profile.target_ratio[0],
    protein: profile.target_ratio[1],
    fat: profile.target_ratio[2],
  };
}

export function isGoalWeightRangeValid(data: GoalEditDraft) {
  return isInRange(data.target_weight, ONBOARDING_WEIGHT_RANGE.min, ONBOARDING_WEIGHT_RANGE.max);
}

export function validateStartPlan(draft: GoalEditDraft) {
  if (draft.gender === undefined) return "성별을 선택해주세요";
  if (!isValidBirthYear(draft.birthYear)) return "출생 연도를 다시 확인해주세요";

  if (!isInRange(draft.height, ONBOARDING_HEIGHT_RANGE.min, ONBOARDING_HEIGHT_RANGE.max)) {
    return "키를 다시 확인해주세요";
  }

  if (!isInRange(draft.weight, ONBOARDING_WEIGHT_RANGE.min, ONBOARDING_WEIGHT_RANGE.max)) {
    return "현재 몸무게를 다시 확인해주세요";
  }

  if (draft.activity === undefined) return "활동량을 선택해주세요";
  if (draft.goal === undefined) return "목표를 선택해주세요";

  if (!isGoalWeightRangeValid(draft)) {
    return "목표 몸무게를 다시 확인해주세요";
  }

  return null;
}

export function hasNutrientTotal(draft: GoalEditDraft) {
  if (draft.carbs === undefined || draft.protein === undefined || draft.fat === undefined) {
    return false;
  }

  const nutrientTotal = draft.carbs + draft.protein + draft.fat;
  return Math.abs(nutrientTotal - 100) < RATIO_TOLERANCE;
}

export function isRatioChanged(initial: GoalEditDraft, draft: GoalEditDraft) {
  if (
    draft.carbs === undefined ||
    draft.protein === undefined ||
    draft.fat === undefined ||
    initial.carbs === undefined ||
    initial.protein === undefined ||
    initial.fat === undefined
  ) {
    return false;
  }

  return (
    Math.abs(draft.carbs - initial.carbs) >= RATIO_TOLERANCE ||
    Math.abs(draft.protein - initial.protein) >= RATIO_TOLERANCE ||
    Math.abs(draft.fat - initial.fat) >= RATIO_TOLERANCE
  );
}
