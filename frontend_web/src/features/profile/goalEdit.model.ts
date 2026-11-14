import {
  isInRange,
  ONBOARDING_HEIGHT_RANGE,
  ONBOARDING_WEIGHT_RANGE,
} from "@/features/onboarding/constants/inputRanges";
import type { OnboardingData } from "@/features/onboarding/onboarding.types";
import { getGoalWeekEstimate } from "@/features/onboarding/utils/calculateGoalWeek";
import type { ProfileResponseDto } from "@/shared/api/types/api.response.dto";
import { isValidBirthYear } from "@/shared/commons/picker/yearOptions";

// 프로필 목표 수정과 회원가입이 함께 쓰는 목표 규칙·선택지. 두 화면의 기준이 어긋나지 않도록 여기서만 정의한다

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

export const GENDER = {
  MALE: 0,
  FEMALE: 1,
} as const;

export const ACTIVITY = {
  S: 0,
  M: 1,
  L: 2,
  XL: 3,
} as const;

export const GOAL = {
  LOSE_WEIGHT: 0,
  MAINTAIN_WEIGHT: 1,
  GAIN_WEIGHT: 2,
} as const;

export const GENDER_OPTIONS = [
  { value: GENDER.MALE, label: "남성" },
  { value: GENDER.FEMALE, label: "여성" },
] as const;

export const ACTIVITY_OPTIONS = [
  {
    value: ACTIVITY.S,
    title: "대부분 앉아서 생활해요",
    description: "하루에 4,000보 이하로 걸어요",
  },
  {
    value: ACTIVITY.M,
    title: "가벼운 이동이 있어요",
    description: "하루에 4,000 ~ 7,500보 사이로 걸어요",
  },
  {
    value: ACTIVITY.L,
    title: "움직이는 시간이 꽤 많아요",
    description: "하루에 7,500 ~ 12,000보 사이로 걸어요",
  },
  {
    value: ACTIVITY.XL,
    title: "가만히 있는 시간은 거의 없어요",
    description: "하루에 12,000보 이상 걸어요",
  },
] as const;

export const GOAL_OPTIONS = [
  { value: GOAL.LOSE_WEIGHT, title: "다이어트", description: "체지방을 줄이고 싶어요" },
  { value: GOAL.MAINTAIN_WEIGHT, title: "체중 유지", description: "지금의 몸무게를 유지하고 싶어요" },
  { value: GOAL.GAIN_WEIGHT, title: "근육 늘리기", description: "근육량을 늘리고 싶어요" },
] as const;

export const GOAL_CALORIES_MIN = 1;
export const GOAL_CALORIES_MAX = 99999;
const RATIO_TOLERANCE = 0.001;

type TargetCaloriesFeedback = {
  isValid: boolean;
  message: string;
  detail?: string;
};

// 목표 칼로리로 목표 몸무게까지 갈 수 있는지 판단하고, 화면에 보여줄 안내 문구를 만든다
export function getTargetCaloriesFeedback(
  draft: GoalEditDraft,
  targetCalories: number | undefined,
): TargetCaloriesFeedback {
  if (targetCalories === undefined) {
    return { isValid: false, message: "목표 칼로리를 입력해주세요" };
  }

  if (
    !Number.isInteger(targetCalories) ||
    targetCalories < GOAL_CALORIES_MIN ||
    targetCalories > GOAL_CALORIES_MAX
  ) {
    return { isValid: false, message: "목표 칼로리는 1~99999 사이로 입력해주세요" };
  }

  const estimate = getGoalWeekEstimate(draft, targetCalories);

  if (estimate.status === "ok") {
    return { isValid: true, message: `목표 달성까지 약 ${estimate.weeks}주 걸려요` };
  }

  if (estimate.reason === "insufficient_data") {
    return {
      isValid: false,
      message: "목표 달성 기간을 계산할 정보가 부족해요",
      detail: "이전 단계에서 신체 정보와 목표 몸무게를 확인해주세요",
    };
  }

  if (estimate.reason === "calories_too_low_for_gain") {
    return {
      isValid: false,
      message: "목표 체중에 비해 목표 칼로리가 너무 낮아요",
      detail:
        estimate.tdee === undefined
          ? undefined
          : `${Math.floor(estimate.tdee) + 1}kcal 이상 입력해주세요`,
    };
  }

  if (estimate.reason === "calories_too_high_for_loss") {
    return {
      isValid: false,
      message: "목표 체중에 비해 목표 칼로리가 너무 높아요",
      detail:
        estimate.tdee === undefined
          ? undefined
          : `${Math.ceil(estimate.tdee) - 1}kcal 이하로 입력해주세요`,
    };
  }

  return { isValid: false, message: "해당 칼로리로는 목표 달성이 어려워요" };
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

// 탄단지 비율 [탄수화물, 단백질, 지방]의 합이 100%인지
export function hasNutrientTotal(ratio: readonly [number, number, number] | undefined) {
  if (!ratio) return false;

  return Math.abs(ratio[0] + ratio[1] + ratio[2] - 100) < RATIO_TOLERANCE;
}

// 목표 수정 화면은 탄단지를 따로 입력받으므로 비율 배열로 모은다. 하나라도 비어 있으면 undefined
export function toTargetRatio(draft: GoalEditDraft): [number, number, number] | undefined {
  if (draft.carbs === undefined || draft.protein === undefined || draft.fat === undefined) {
    return undefined;
  }

  return [draft.carbs, draft.protein, draft.fat];
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
