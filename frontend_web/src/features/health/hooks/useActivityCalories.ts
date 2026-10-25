import { useMemo } from "react";

import { useGetWorkoutRecordQuery } from "@/features/health/hooks/queries/workout.query";
import { calculateActivityCalories } from "@/features/health/utils/activityCalories";
import { useGetBodyLog } from "@/features/home/hooks/queries/useTodayRecordQuery";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import type { WorkoutRecordItemResponseDto } from "@/shared/api/types/api.response.dto";
import { useSelectedDateKey } from "@/shared/stores/selectedDate.store";
import { getAge } from "@/shared/utils/health.utils";

const EMPTY_WORKOUT_RECORDS: WorkoutRecordItemResponseDto[] = [];

export type ActivityCaloriesSummary = {
  /** 목표 칼로리에 반영하는 운동 소모 칼로리 */
  calories: number;
  stepCalories: number;
  stepCount: number;
  totalCalories: number;
  workoutCalories: number;
  workoutCount: number;
};

function getPositiveFiniteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function useActivityCalories(date?: string) {
  const selectedDateKey = useSelectedDateKey();
  const dateKey = date ?? selectedDateKey;

  const bodyLogQuery = useGetBodyLog(dateKey);
  const profileQuery = useGetProfileQuery();
  const workoutRecordQuery = useGetWorkoutRecordQuery(dateKey);

  const bodyLog = bodyLogQuery.data;
  const profile = profileQuery.data;
  const stepCount = bodyLog?.steps ?? 0;
  const workoutRecords = workoutRecordQuery.data?.workout_list ?? EMPTY_WORKOUT_RECORDS;

  const workoutCalories = useMemo(
    () =>
      workoutRecords.reduce((totalCalories, workout) => {
        return totalCalories + (getPositiveFiniteNumber(workout.burned_calories) ?? 0);
      }, 0),
    [workoutRecords],
  );

  const summary = useMemo<ActivityCaloriesSummary | null>(() => {
    let stepCalories = 0;

    if (profile && stepCount > 0) {
      const weightKg =
        getPositiveFiniteNumber(bodyLog?.weight) ?? getPositiveFiniteNumber(profile.weight);
      const heightCm = getPositiveFiniteNumber(profile.height);
      const age = getAge(profile.birthYear);

      if (weightKg !== null && heightCm !== null && Number.isFinite(age) && age >= 0) {
        stepCalories = calculateActivityCalories({
          weightKg,
          heightCm,
          stepCount,
          age,
        });
      }
    }

    const roundedWorkoutCalories = Math.round(workoutCalories);
    const totalCalories = stepCalories + roundedWorkoutCalories;

    if (!Number.isFinite(totalCalories) || totalCalories <= 0) {
      return null;
    }

    return {
      // 목표 칼로리는 기존 정책대로 운동 소모량만큼만 증가시킨다.
      calories: roundedWorkoutCalories,
      stepCalories,
      stepCount,
      totalCalories,
      workoutCalories: roundedWorkoutCalories,
      workoutCount: workoutRecords.length,
    };
  }, [bodyLog?.weight, profile, stepCount, workoutCalories, workoutRecords.length]);

  return {
    isStepCaloriesPending: bodyLogQuery.isPending || profileQuery.isPending,
    isWorkoutRecordPending: workoutRecordQuery.isPending,
    summary,
    workoutRecords,
  };
}
