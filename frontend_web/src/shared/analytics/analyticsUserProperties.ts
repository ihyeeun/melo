import type { TargetRatio } from "@/shared/api/types/api.dto";

export const ANALYTICS_USER_PROPERTY_KEYS = [
  "is_test_user",
  "is_subscribed",
  "nickname",
  "gender",
  "birth_year",
  "height_cm",
  "weight_kg",
  "activity_level",
  "health_goal",
  "goal_weight_kg",
  "daily_calorie_target",
  "goal_carb_pct",
  "goal_protein_pct",
  "goal_fat_pct",
] as const;

export type AnalyticsUserPropertyKey = (typeof ANALYTICS_USER_PROPERTY_KEYS)[number];

export type AnalyticsUserProperties = Partial<{
  is_test_user: boolean;
  is_subscribed: boolean;
  nickname: string;
  gender: "male" | "female";
  birth_year: number;
  height_cm: number;
  weight_kg: number;
  activity_level: "sedentary" | "lightly_active" | "moderately_active" | "very_active";
  health_goal: "weight_loss" | "muscle_gain" | "maintain";
  goal_weight_kg: number;
  daily_calorie_target: number;
  goal_carb_pct: number;
  goal_protein_pct: number;
  goal_fat_pct: number;
}>;

type AnalyticsUserPropertiesSource = Partial<{
  is_test_user: boolean | null;
  isTestUser: boolean | null;
  is_subscribed: boolean | null;
  nickname: string | null;
  role: string | null;
  gender: number | null;
  birthYear: number | null;
  height: number | null;
  weight: number | null;
  activity: number | null;
  goal: number | null;
  target_weight: number | null;
  target_calories: number | null;
  target_ratio: TargetRatio | null;
}>;

const GENDER_VALUES = ["male", "female"] as const;
const ACTIVITY_LEVEL_VALUES = [
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
] as const;
const HEALTH_GOAL_VALUES = ["weight_loss", "maintain", "muscle_gain"] as const;

function getFiniteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getIndexedValue<T extends readonly string[]>(
  values: T,
  index: number | null | undefined,
): T[number] | undefined {
  if (index === undefined || index === null) return undefined;
  return values[index];
}

function getIsTestUser(source: AnalyticsUserPropertiesSource) {
  if (typeof source.is_test_user === "boolean") return source.is_test_user;
  if (typeof source.isTestUser === "boolean") return source.isTestUser;
  if (typeof source.role === "string") return source.role === "ADMIN";
  return undefined;
}

export function buildAnalyticsUserProperties(
  source: AnalyticsUserPropertiesSource,
): AnalyticsUserProperties {
  const nickname = source.nickname?.trim();
  const targetRatio = source.target_ratio;
  const isTestUser = getIsTestUser(source);
  const isSubscribed = source.is_subscribed;
  const gender = getIndexedValue(GENDER_VALUES, source.gender);
  const birthYear = getFiniteNumber(source.birthYear);
  const height = getFiniteNumber(source.height);
  const weight = getFiniteNumber(source.weight);
  const activityLevel = getIndexedValue(ACTIVITY_LEVEL_VALUES, source.activity);
  const healthGoal = getIndexedValue(HEALTH_GOAL_VALUES, source.goal);
  const targetWeight = getFiniteNumber(source.target_weight);
  const targetCalories = getFiniteNumber(source.target_calories);
  const targetCarbRatio = getFiniteNumber(targetRatio?.[0]);
  const targetProteinRatio = getFiniteNumber(targetRatio?.[1]);
  const targetFatRatio = getFiniteNumber(targetRatio?.[2]);

  return {
    ...(isTestUser !== undefined ? { is_test_user: isTestUser } : {}),
    ...(typeof isSubscribed === "boolean" ? { is_subscribed: isSubscribed } : {}),
    ...(nickname ? { nickname } : {}),
    ...(gender ? { gender } : {}),
    ...(birthYear !== undefined ? { birth_year: birthYear } : {}),
    ...(height !== undefined ? { height_cm: height } : {}),
    ...(weight !== undefined ? { weight_kg: weight } : {}),
    ...(activityLevel ? { activity_level: activityLevel } : {}),
    ...(healthGoal ? { health_goal: healthGoal } : {}),
    ...(targetWeight !== undefined ? { goal_weight_kg: targetWeight } : {}),
    ...(targetCalories !== undefined ? { daily_calorie_target: targetCalories } : {}),
    ...(targetCarbRatio !== undefined ? { goal_carb_pct: targetCarbRatio } : {}),
    ...(targetProteinRatio !== undefined ? { goal_protein_pct: targetProteinRatio } : {}),
    ...(targetFatRatio !== undefined ? { goal_fat_pct: targetFatRatio } : {}),
  };
}
