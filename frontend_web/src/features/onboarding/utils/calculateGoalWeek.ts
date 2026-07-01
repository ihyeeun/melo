import type { OnboardingData } from "@/features/onboarding/onboarding.types";
import { getAge } from "@/shared/utils/health.utils";

type WeightDirection = "loss" | "gain" | "maintain";

export type GoalWeekInvalidReason =
  | "insufficient_data"
  | "no_daily_delta"
  | "calories_too_high_for_loss"
  | "calories_too_low_for_gain";

export type GoalWeekEstimateResult =
  | {
      status: "ok";
      weeks: number;
      tdee: number;
    }
  | {
      status: "invalid";
      reason: GoalWeekInvalidReason;
      tdee?: number;
    };

function hasRequiredGoalWeekBaseFields(
  data: OnboardingData,
): data is OnboardingData &
  Required<Pick<OnboardingData, "birthYear" | "weight" | "height" | "gender" | "activity">> {
  return (
    data.birthYear !== undefined &&
    data.weight !== undefined &&
    data.height !== undefined &&
    data.gender !== undefined &&
    data.activity !== undefined
  );
}

export function resolveWeightDirection(weight: number, targetWeight: number): WeightDirection {
  if (targetWeight > weight) {
    return "gain";
  }

  if (targetWeight < weight) {
    return "loss";
  }

  return "maintain";
}

export function calculateTDEE(
  birthYear: number,
  weight: number,
  height: number,
  gender: number,
  activity: number,
): number {
  const age = getAge(birthYear);
  let bmr = 10 * weight + 6.25 * height - 5 * age + 5;

  if (gender === 1) {
    bmr -= 166;
  }

  const activityFactor = 1.2 + 0.175 * activity;
  return bmr * activityFactor;
}

export function calculateGoalWeeks(
  weight: number,
  targetWeight: number,
  targetCalories: number,
  tdee: number,
): GoalWeekEstimateResult {
  const weightDirection = resolveWeightDirection(weight, targetWeight);

  if (weightDirection === "maintain") {
    return { status: "ok", weeks: 0, tdee };
  }

  if (weightDirection === "loss" && targetCalories >= tdee) {
    return {
      status: "invalid",
      reason: "calories_too_high_for_loss",
      tdee,
    };
  }

  if (weightDirection === "gain" && targetCalories <= tdee) {
    return {
      status: "invalid",
      reason: "calories_too_low_for_gain",
      tdee,
    };
  }

  const dailyDeltaCalories = Math.abs(targetCalories - tdee);

  if (dailyDeltaCalories === 0) {
    return { status: "invalid", reason: "no_daily_delta", tdee };
  }

  const weightDiff = Math.abs(weight - targetWeight);
  const weeks = Math.ceil(weightDiff / ((dailyDeltaCalories * 7) / 7700));

  return { status: "ok", weeks, tdee };
}

export function getGoalWeekEstimate(
  data: OnboardingData,
  targetCalories: number,
): GoalWeekEstimateResult {
  if (!hasRequiredGoalWeekBaseFields(data)) {
    return { status: "invalid", reason: "insufficient_data" };
  }

  if (data.target_weight === undefined) {
    return { status: "invalid", reason: "insufficient_data" };
  }

  const tdee = calculateTDEE(data.birthYear, data.weight, data.height, data.gender, data.activity);

  return calculateGoalWeeks(data.weight, data.target_weight, targetCalories, tdee);
}

export function calculateGoalWeek(data: OnboardingData, targetCalories: number): number {
  const goalWeekEstimate = getGoalWeekEstimate(data, targetCalories);

  if (goalWeekEstimate.status !== "ok") {
    throw new Error("해당 값으로는 목표 달성이 불가능합니다.");
  }

  return goalWeekEstimate.weeks;
}
