import { useMemo } from "react";

import { calculateActivityCalories } from "@/features/health/utils/activityCalories";
import { useGetBodyLog } from "@/features/home/hooks/queries/useTodayRecordQuery";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { useSelectedDateKey } from "@/shared/stores/selectedDate.store";
import { getAge } from "@/shared/utils/health.utils";

export type ActivityCaloriesSummary = {
  calories: number;
  stepCount: number;
};

function getPositiveFiniteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function useActivityCalories(date?: string) {
  const selectedDateKey = useSelectedDateKey();
  const dateKey = date ?? selectedDateKey;

  const bodyLogQuery = useGetBodyLog(dateKey);
  const profileQuery = useGetProfileQuery();

  const bodyLog = bodyLogQuery.data;
  const profile = profileQuery.data;
  const stepCount = bodyLog?.steps ?? 0;

  const summary = useMemo<ActivityCaloriesSummary | null>(() => {
    if (!profile || stepCount <= 0) {
      return null;
    }

    const weightKg =
      getPositiveFiniteNumber(bodyLog?.weight) ?? getPositiveFiniteNumber(profile.weight);
    const heightCm = getPositiveFiniteNumber(profile.height);
    const age = getAge(profile.birthYear);

    if (weightKg === null || heightCm === null || !Number.isFinite(age) || age < 0) {
      return null;
    }

    const calories = calculateActivityCalories({
      weightKg,
      heightCm,
      stepCount,
      age,
    });

    if (!Number.isFinite(calories) || calories <= 0) {
      return null;
    }

    return {
      calories,
      stepCount,
    };
  }, [bodyLog?.weight, profile, stepCount]);

  return {
    bodyLog,
    isBodyLogPending: bodyLogQuery.isPending,
    isProfilePending: profileQuery.isPending,
    profile,
    summary,
  };
}
