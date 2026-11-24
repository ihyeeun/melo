import { getGoalWeekEstimate } from "@/features/profile/utils/goalWeek.util";
import type { ProfileResponseDto } from "@/shared/api/types/api.response.dto";
import { isValidBirthYear } from "@/shared/commons/picker/yearOptions";

// 프로필 목표 수정과 회원가입이 함께 쓰는 목표 규칙·선택지. 두 화면의 기준이 어긋나지 않도록 여기서만 정의한다

export type GoalEditDraft = {
  gender?: number;
  birthYear?: number;
  height?: number;
  weight?: number;
  activity?: number;
  goal?: number;
  target_weight?: number;
  target_calories?: number;
  // 목표 수정 화면은 탄단지를 따로 입력받는다
  carbs?: number;
  protein?: number;
  fat?: number;
};

export const ONBOARDING_HEIGHT_RANGE = {
  min: 1,
  max: 250,
} as const;

export const ONBOARDING_WEIGHT_RANGE = {
  min: 1,
  max: 200,
} as const;

// 범위 밖 값 안내. 문구 형식: "{항목}은 {최소}~{최대}{단위} 사이로 입력해주세요"
export const BODY_RANGE_MESSAGES = {
  height: `키는 ${ONBOARDING_HEIGHT_RANGE.min}~${ONBOARDING_HEIGHT_RANGE.max}cm 사이로 입력해주세요`,
  weight: `몸무게는 ${ONBOARDING_WEIGHT_RANGE.min}~${ONBOARDING_WEIGHT_RANGE.max}kg 사이로 입력해주세요`,
  targetWeight: `목표 몸무게는 ${ONBOARDING_WEIGHT_RANGE.min}~${ONBOARDING_WEIGHT_RANGE.max}kg 사이로 입력해주세요`,
} as const;

// 키 · 몸무게 입력은 정수 3자리 + 소수 1자리까지만 받는다. 범위는 입력 중이 아니라 확인할 때 본다
export const BODY_VALUE_INTEGER_DIGITS = 3;
export const BODY_VALUE_FRACTION_DIGITS = 1;

export function isInRange(value: number | undefined, min: number, max: number) {
  if (value === undefined) return false;
  return value >= min && value <= max;
}

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
          : `${(Math.floor(estimate.tdee) + 1).toLocaleString("ko-KR")}kcal 이상으로 입력해주세요`,
    };
  }

  if (estimate.reason === "calories_too_high_for_loss") {
    return {
      isValid: false,
      message: "목표 체중에 비해 목표 칼로리가 너무 높아요",
      detail:
        estimate.tdee === undefined
          ? undefined
          : `${(Math.ceil(estimate.tdee) - 1).toLocaleString("ko-KR")}kcal 이하로 입력해주세요`,
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

// 체중 유지는 목표 몸무게를 따로 받지 않고 현재 몸무게로 맞춘다.
// 다른 목표는 고른 목표가 아니라 목표 몸무게로 감량·증량을 판단한다(근육 늘리기여도 목표 몸무게가 더 낮을 수 있음)
export function applyMaintainTargetWeight<T extends GoalEditDraft>(draft: T): T {
  if (draft.goal !== GOAL.MAINTAIN_WEIGHT || draft.target_weight === draft.weight) return draft;

  return { ...draft, target_weight: draft.weight };
}

// 목표 칼로리 추천(서버)에 들어가는 값. 이 값이 바뀌었을 때만 새로 추천한다
export function getCaloriesRecommendationKey({
  gender,
  birthYear,
  height,
  weight,
  activity,
  goal,
  target_weight,
}: GoalEditDraft) {
  return JSON.stringify([gender, birthYear, height, weight, activity, goal, target_weight]);
}

// 탄단지 비율 추천(서버)에 들어가는 값
export function getRatioRecommendationKey({
  target_calories,
  weight,
  goal,
  target_weight,
}: GoalEditDraft) {
  return JSON.stringify([target_calories, weight, goal, target_weight]);
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

// 추천 비율은 반올림한 정수로 쓴다. 반올림으로 합이 100에서 어긋나면 탄수화물에서 맞춘다(정책: 차이는 탄수화물에서 보정)
export function roundRecommendedRatio(
  ratio: readonly [number, number, number],
): [number, number, number] {
  const [carbs, protein, fat] = ratio.map(Math.round);
  // 추천값 합이 원래 100이 아니면 보정하지 않는다
  if (Math.abs(ratio[0] + ratio[1] + ratio[2] - 100) >= 1) return [carbs, protein, fat];

  return [100 - protein - fat, protein, fat];
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
