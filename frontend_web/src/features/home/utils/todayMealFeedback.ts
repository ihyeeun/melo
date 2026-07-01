import type { DayMealSummary } from "@/features/home/utils/dayMealSummary";
import type { TargetsNutrients } from "@/shared/stores/targetNutrient.store";
import { calculateDailyNutritionMetrics } from "@/shared/utils/nutrientScore";

const MACRO_IMBALANCE_THRESHOLD = 5;
const CALORIE_ATTENTION_THRESHOLD = 90;

export type MealFeedback = {
  primary: string;
  secondary: string;
};

export type CalorieSummary = {
  roundedCurrentCalories: number;
  roundedTargetCalories: number | null;
  hasTargetCalories: boolean;
  message: string;
};

export type CalorieProgressDash = {
  label: string;
  value: number;
};

export type NutrientStatus = "insufficient" | "adequate" | "excess";

export function resolveTargetCalories(targets: TargetsNutrients | null) {
  if (!targets || !Number.isFinite(targets.target_calories) || targets.target_calories <= 0) {
    return null;
  }

  return targets.target_calories;
}

export function hasValidTargets(targets: TargetsNutrients | null): targets is TargetsNutrients {
  return resolveTargetCalories(targets) !== null;
}

export function getActivityAdjustedTargetCalories(
  targetCalories: number | null,
  activityCalories: number | null | undefined,
) {
  if (targetCalories === null || !Number.isFinite(targetCalories) || targetCalories <= 0) {
    return null;
  }

  const safeActivityCalories =
    typeof activityCalories === "number" && Number.isFinite(activityCalories) && activityCalories > 0
      ? activityCalories
      : 0;

  return Math.round(targetCalories + safeActivityCalories);
}

export function getActivityCalorieProgressDash({
  adjustedTargetCalories,
  targetCalories,
}: {
  adjustedTargetCalories: number | null;
  targetCalories: number | null;
}): CalorieProgressDash | null {
  if (
    targetCalories === null ||
    adjustedTargetCalories === null ||
    !Number.isFinite(targetCalories) ||
    !Number.isFinite(adjustedTargetCalories) ||
    adjustedTargetCalories <= targetCalories
  ) {
    return null;
  }

  return { label: "활동 전", value: Math.round(targetCalories) };
}

export function getCalorieSummary(totalCalories: number, targetCalories: number | null): CalorieSummary {
  const safeCurrentCalories = Number.isFinite(totalCalories) ? totalCalories : 0;
  const safeTargetCalories =
    targetCalories !== null && Number.isFinite(targetCalories) && targetCalories > 0
      ? targetCalories
      : null;

  if (safeTargetCalories === null) {
    return {
      roundedCurrentCalories: Math.round(safeCurrentCalories),
      roundedTargetCalories: null,
      hasTargetCalories: false,
      message: "목표 칼로리 설정이 필요해요",
    };
  }

  const calorieDiff = safeTargetCalories - safeCurrentCalories;
  const roundedDiff = Math.round(Math.abs(calorieDiff));
  const message =
    calorieDiff > 0
      ? `${roundedDiff.toLocaleString("ko-KR")}kcal 더 먹을 수 있어요`
      : calorieDiff < 0
        ? `${roundedDiff.toLocaleString("ko-KR")}kcal 초과했어요`
        : "오늘 목표 칼로리를 달성했어요";

  return {
    roundedCurrentCalories: Math.round(safeCurrentCalories),
    roundedTargetCalories: Math.round(safeTargetCalories),
    hasTargetCalories: true,
    message,
  };
}

export function getHomeMealFeedback(
  dayMealSummary: DayMealSummary | undefined,
  targets: TargetsNutrients | null,
): MealFeedback {
  if (!hasValidTargets(targets)) {
    return {
      primary: "목표가 아직 없어요.",
      secondary: "먼저 목표를 설정해 주세요",
    };
  }

  const totalCalories = dayMealSummary?.totalCalories ?? 0;
  const targetCalories = targets.target_calories;

  if (totalCalories <= 0) {
    return {
      primary: "첫 식사,",
      secondary: "건강하게 골라볼까요?",
    };
  }

  const calorieIntakePercent = (totalCalories / targetCalories) * 100;
  if (calorieIntakePercent > 100) {
    return {
      primary: "배부른 하루네요!",
      secondary: "내일 다시 시작해 봐요",
    };
  }

  const nutritionMetrics = calculateDailyNutritionMetrics({
    actualCalories: totalCalories,
    targetCalories,
    actualMacrosInGram: {
      carbs: dayMealSummary?.totalNutrients.carbs ?? 0,
      protein: dayMealSummary?.totalNutrients.protein ?? 0,
      fat: dayMealSummary?.totalNutrients.fat ?? 0,
    },
    targetMacroRatios: {
      carbs: targets.target_ratio[0],
      protein: targets.target_ratio[1],
      fat: targets.target_ratio[2],
    },
  });

  const carbOverage = nutritionMetrics.actualMacroRatios.carbs - targets.target_ratio[0];
  const fatOverage = nutritionMetrics.actualMacroRatios.fat - targets.target_ratio[2];

  if (carbOverage >= fatOverage && carbOverage > MACRO_IMBALANCE_THRESHOLD) {
    return {
      primary: "탄수화물이 많네요.",
      secondary: "단백질 위주로 먹어볼까요?",
    };
  }

  if (fatOverage > carbOverage && fatOverage > MACRO_IMBALANCE_THRESHOLD) {
    return {
      primary: "지방이 꽤 높아요.",
      secondary: "담백하게 먹어볼까요?",
    };
  }

  if (calorieIntakePercent >= CALORIE_ATTENTION_THRESHOLD) {
    return {
      primary: "여유가 적어요!",
      secondary: "이제 가볍게 골라볼까요?",
    };
  }

  return {
    primary: "완벽한 밸런스!",
    secondary: "그대로 유지해 봐요",
  };
}

export function getNutrientStatus(current: number, target: number): NutrientStatus {
  if (!Number.isFinite(target) || target <= 0) {
    return "insufficient";
  }

  const intakePercent = (current / target) * 100;
  if (intakePercent < 75) {
    return "insufficient";
  }
  if (intakePercent <= 100) {
    return "adequate";
  }
  return "excess";
}

export function getNutrientStatusLabel(status: NutrientStatus) {
  if (status === "insufficient") {
    return "부족";
  }
  if (status === "adequate") {
    return "적정";
  }
  return "초과";
}
