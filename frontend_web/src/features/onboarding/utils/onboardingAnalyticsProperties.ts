import type { UserInfoResponse } from "@/features/onboarding/onboarding.types";

const DIET_MANAGEMENT_STATUS_VALUES = [
  "tracking_app",
  "pro_guidance",
  "conscious_choosing",
  "none",
  "other",
] as const;

const PERSONA_TYPE_VALUES = ["data_driven", "safety_seeker", "efficiency_seeker"] as const;

const EATING_OUT_FREQ_WEEKLY_VALUES = ["0_2_times", "3_4_times", "5_plus_times"] as const;

const JOB_TYPE_VALUES = ["office_worker", "freelancer", "student", "other"] as const;

const LUNCH_LOCATION_VALUES = [
  "restaurant",
  "cafeteria",
  "packed_lunch",
  "home",
  "other",
] as const;

type OnboardingAnalyticsValue<T extends readonly string[]> = T[number] | null;

type OnboardingAnalyticsProperties = {
  diet_management_status: OnboardingAnalyticsValue<typeof DIET_MANAGEMENT_STATUS_VALUES>[];
  persona_type: OnboardingAnalyticsValue<typeof PERSONA_TYPE_VALUES>;
  eating_out_freq_weekly: OnboardingAnalyticsValue<typeof EATING_OUT_FREQ_WEEKLY_VALUES>;
  job_type: OnboardingAnalyticsValue<typeof JOB_TYPE_VALUES>;
  lunch_location: OnboardingAnalyticsValue<typeof LUNCH_LOCATION_VALUES>;
};

type OnboardingAnalyticsSource = Pick<
  UserInfoResponse,
  | "diet_management_status"
  | "persona_type"
  | "eating_out_freq_weekly"
  | "job_type"
  | "lunch_location"
>;

function getOptionValue<T extends readonly string[]>(
  values: T,
  selectedIndex?: number | null,
): OnboardingAnalyticsValue<T> {
  if (selectedIndex === undefined || selectedIndex === null) {
    return null;
  }

  return values[selectedIndex] ?? null;
}

function getOptionValues<T extends readonly string[]>(
  values: T,
  selectedIndexes?: readonly number[] | null,
): OnboardingAnalyticsValue<T>[] {
  if (!selectedIndexes) {
    return [];
  }

  return selectedIndexes.map((selectedIndex) => values[selectedIndex] ?? null);
}

export function getOnboardingAnalyticsProperties(
  data: OnboardingAnalyticsSource,
): OnboardingAnalyticsProperties {
  const jobType = getOptionValue(JOB_TYPE_VALUES, data.job_type);

  return {
    diet_management_status: getOptionValues(
      DIET_MANAGEMENT_STATUS_VALUES,
      data.diet_management_status,
    ),
    persona_type: getOptionValue(PERSONA_TYPE_VALUES, data.persona_type),
    eating_out_freq_weekly: getOptionValue(
      EATING_OUT_FREQ_WEEKLY_VALUES,
      data.eating_out_freq_weekly,
    ),
    job_type: jobType,
    lunch_location:
      jobType === "office_worker"
        ? getOptionValue(LUNCH_LOCATION_VALUES, data.lunch_location)
        : null,
  };
}
