import { useMemo } from "react";

import { useGetWorkoutRecordQuery } from "@/features/health/hooks/queries/workout.query";
import type { WorkoutRecordItemResponseDto } from "@/shared/api/types/api.response.dto";
import { useSelectedDateKey } from "@/shared/stores/selectedDate.store";

const EMPTY_WORKOUT_RECORDS: WorkoutRecordItemResponseDto[] = [];

export type ActivityCaloriesSummary = {
  calories: number;
  workoutCalories: number;
  workoutCount: number;
};

function getPositiveFiniteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function useActivityCalories(date?: string) {
  const selectedDateKey = useSelectedDateKey();
  const dateKey = date ?? selectedDateKey;

  const workoutRecordQuery = useGetWorkoutRecordQuery(dateKey);

  const workoutRecords = workoutRecordQuery.data?.workout_list ?? EMPTY_WORKOUT_RECORDS;

  const workoutCalories = useMemo(
    () =>
      workoutRecords.reduce((totalCalories, workout) => {
        return totalCalories + (getPositiveFiniteNumber(workout.burned_calories) ?? 0);
      }, 0),
    [workoutRecords],
  );

  const summary = useMemo<ActivityCaloriesSummary | null>(() => {
    const calories = Math.round(workoutCalories);

    if (!Number.isFinite(calories) || calories <= 0) {
      return null;
    }

    return {
      calories,
      workoutCalories: calories,
      workoutCount: workoutRecords.length,
    };
  }, [workoutCalories, workoutRecords.length]);

  return {
    isWorkoutRecordPending: workoutRecordQuery.isPending,
    summary,
    workoutRecords,
  };
}
