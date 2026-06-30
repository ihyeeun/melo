import { useMemo } from "react";

import { calculateActivityCalories } from "@/features/health/utils/activityCalories";
import { useGetBodyLog } from "@/features/home/hooks/queries/useTodayRecordQuery";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { isValidDateKey } from "@/shared/utils/dateFormat";

export type ActivityCaloriesSummary = {
  calories: number;
  steps: number;
};

function getPositiveFiniteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function getServerSteps(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.trunc(value);
}

function getAgeFromBirthYear(birthYear: number) {
  return new Date().getFullYear() - birthYear - 1;
}

export function useActivityCalories(date: string) {
  const canResolveActivityCalories = isValidDateKey(date);
  const bodyLogQuery = useGetBodyLog(date);
  const profileQuery = useGetProfileQuery({ enabled: canResolveActivityCalories });

  const bodyLog = bodyLogQuery.data;
  const profile = profileQuery.data;
  const serverSteps = getServerSteps(bodyLog?.steps);

  const summary = useMemo<ActivityCaloriesSummary | null>(() => {
    if (!profile || serverSteps <= 0) {
      return null;
    }

    const weightKg =
      getPositiveFiniteNumber(bodyLog?.weight) ?? getPositiveFiniteNumber(profile.weight);
    const heightCm = getPositiveFiniteNumber(profile.height);
    const age = getAgeFromBirthYear(profile.birthYear);

    if (weightKg === null || heightCm === null || !Number.isFinite(age) || age < 0) {
      return null;
    }

    const calories = calculateActivityCalories({
      weightKg,
      heightCm,
      stepCount: serverSteps,
      age,
    });

    if (!Number.isFinite(calories) || calories <= 0) {
      return null;
    }

    return {
      calories,
      steps: serverSteps,
    };
  }, [bodyLog?.weight, profile, serverSteps]);

  return {
    bodyLog,
    isBodyLogPending: bodyLogQuery.isPending,
    isProfilePending: profileQuery.isPending,
    profile,
    summary,
  };
}
