import type { ProfileResponseDto } from "@/shared/api/types/api.response.dto";

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
  "diet_management_status",
  "persona_type",
  "eating_out_freq_weekly",
  "job_type",
  "lunch_location",
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
  diet_management_status: DietManagementStatusValue[];
  persona_type: PersonaTypeValue;
  eating_out_freq_weekly: EatingOutFrequencyValue;
  job_type: JobTypeValue;
  lunch_location: LunchLocationValue;
}>;

type AnalyticsUserPropertiesSource = Partial<ProfileResponseDto>;

const GENDER_VALUES = ["male", "female"] as const;
const ACTIVITY_LEVEL_VALUES = [
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
] as const;
const HEALTH_GOAL_VALUES = ["weight_loss", "maintain", "muscle_gain"] as const;
const DIET_MANAGEMENT_STATUS_VALUES = [
  "tracking_app",
  "pro_guidance",
  "conscious_choosing",
  "none",
  "other",
] as const;
const PERSONA_TYPE_VALUES = ["data_driven", "safety_seeker", "efficiency_seeker"] as const;
const EATING_OUT_FREQUENCY_VALUES = ["0_2_times", "3_4_times", "5_plus_times"] as const;
const JOB_TYPE_VALUES = ["office_worker", "freelancer", "student", "other"] as const;
const LUNCH_LOCATION_VALUES = ["restaurant", "cafeteria", "packed_lunch", "home", "other"] as const;

type DietManagementStatusValue = (typeof DIET_MANAGEMENT_STATUS_VALUES)[number];
type PersonaTypeValue = (typeof PERSONA_TYPE_VALUES)[number];
type EatingOutFrequencyValue = (typeof EATING_OUT_FREQUENCY_VALUES)[number];
type JobTypeValue = (typeof JOB_TYPE_VALUES)[number];
type LunchLocationValue = (typeof LUNCH_LOCATION_VALUES)[number] | "null";

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

function getIndexedValues<T extends readonly string[]>(
  values: T,
  indexes: readonly number[] | null | undefined,
): T[number][] | undefined {
  if (!indexes) return undefined;

  return indexes.reduce<T[number][]>((selectedValues, index) => {
    const selectedValue = getIndexedValue(values, index);
    if (selectedValue) {
      selectedValues.push(selectedValue);
    }

    return selectedValues;
  }, []);
}

export function buildAnalyticsUserProperties(
  source: AnalyticsUserPropertiesSource,
): AnalyticsUserProperties {
  const nickname = source.nickname?.trim();
  const targetRatio = source.target_ratio;
  const isTestUser = typeof source.role === "string" ? source.role === "ADMIN" : undefined;
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
  const dietManagementStatus = getIndexedValues(
    DIET_MANAGEMENT_STATUS_VALUES,
    source.diet_management_status,
  );
  const personaType = getIndexedValue(PERSONA_TYPE_VALUES, source.persona_type);
  const eatingOutFrequency = getIndexedValue(
    EATING_OUT_FREQUENCY_VALUES,
    source.eating_out_freq_weekly,
  );
  const jobType = getIndexedValue(JOB_TYPE_VALUES, source.job_type);
  const lunchLocation =
    jobType === "office_worker"
      ? (getIndexedValue(LUNCH_LOCATION_VALUES, source.lunch_location) ?? "null")
      : "null";

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
    ...(dietManagementStatus !== undefined ? { diet_management_status: dietManagementStatus } : {}),
    ...(personaType ? { persona_type: personaType } : {}),
    ...(eatingOutFrequency ? { eating_out_freq_weekly: eatingOutFrequency } : {}),
    ...(jobType ? { job_type: jobType } : {}),
    ...(lunchLocation !== undefined ? { lunch_location: lunchLocation } : {}),
  };
}
