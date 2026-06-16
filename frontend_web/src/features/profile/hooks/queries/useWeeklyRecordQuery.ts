import { useQueries } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { useMemo } from "react";

import {
  getTodayMealRecordMenus,
  getTodayRecordBodyStats,
} from "@/features/home/api/todayRecord.api";
import { queryKeys as homeQueryKeys } from "@/features/home/hooks/queries/todayRecord.queryKey";
import { getUserGoalSnapshot } from "@/features/profile/api/profile";
import { queryKeys as profileQueryKeys } from "@/features/profile/hooks/queries/queryKey";

type UseWeeklyRecordQueryProps = {
  enabled?: boolean;
  metric: WeeklyMetricType;
  today: string;
  targetCalories: number;
  targetWeight: number;
};

export type WeeklyMetricType = "weight" | "calories" | "steps";

export type WeeklyRecordPoint = {
  calories: number;
  dateKey: string;
  label: string;
  steps: number | null;
  targetCalories: number;
  targetWeight: number;
  weight: number | null;
};

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatChartLabel(dateKey: string, today: string) {
  const date = parseDateKey(dateKey);
  const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;

  return dateKey === today ? `${dateLabel}\n오늘` : dateLabel;
}

function getRecentWeekDateKeys(today: string) {
  const baseDate = parseDateKey(today);

  return Array.from({ length: 7 }, (_, index) => {
    const date = subDays(baseDate, 6 - index);
    return formatDateKey(date);
  });
}

export function useWeeklyRecordQuery({
  enabled = true,
  metric,
  today,
  targetCalories,
  targetWeight,
}: UseWeeklyRecordQueryProps) {
  const dateKeys = useMemo(() => getRecentWeekDateKeys(today), [today]);
  const shouldFetchWeight = enabled && metric === "weight";
  const shouldFetchCalories = enabled && metric === "calories";
  const shouldFetchSteps = enabled && metric === "steps";

  const dayMealQueries = useQueries({
    queries: dateKeys.map((dateKey) => ({
      queryKey: homeQueryKeys.dayMeals.byDate(dateKey),
      queryFn: () => getTodayMealRecordMenus(dateKey),
      enabled: shouldFetchCalories,
      staleTime: Infinity,
    })),
  });

  const bodyLogQueries = useQueries({
    queries: dateKeys.map((dateKey) => ({
      queryKey: homeQueryKeys.bodyStats(dateKey),
      queryFn: () => getTodayRecordBodyStats(dateKey),
      enabled: shouldFetchWeight || shouldFetchSteps,
      staleTime: Infinity,
    })),
  });

  const goalSnapshotQueries = useQueries({
    queries: dateKeys.map((dateKey) => ({
      queryKey: profileQueryKeys.userGoalSnapshot(dateKey),
      queryFn: () => getUserGoalSnapshot(dateKey),
      enabled: shouldFetchWeight || shouldFetchCalories,
      staleTime: Infinity,
    })),
  });

  const isPending =
    metric === "weight"
      ? bodyLogQueries.some((query) => query.isPending || query.isFetching) ||
        goalSnapshotQueries.some((query) => query.isPending || query.isFetching)
      : metric === "calories"
        ? dayMealQueries.some((query) => query.isPending || query.isFetching) ||
          goalSnapshotQueries.some((query) => query.isPending || query.isFetching)
        : bodyLogQueries.some((query) => query.isPending || query.isFetching);
  const hasError =
    metric === "weight"
      ? bodyLogQueries.some((query) => query.isError) ||
        goalSnapshotQueries.some((query) => query.isError)
      : metric === "calories"
        ? dayMealQueries.some((query) => query.isError) ||
          goalSnapshotQueries.some((query) => query.isError)
        : bodyLogQueries.some((query) => query.isError);

  const records = dateKeys.map<WeeklyRecordPoint>((dateKey, index) => {
    const dayMeal = dayMealQueries[index]?.data;
    const bodyLog = bodyLogQueries[index]?.data;
    const goalSnapshot = goalSnapshotQueries[index]?.data;
    const rawWeight = bodyLog?.weight;
    const rawSteps = bodyLog?.steps;

    return {
      dateKey,
      label: formatChartLabel(dateKey, today),
      weight: typeof rawWeight === "number" && rawWeight > 0 ? rawWeight : null,
      calories: dayMeal?.totalCalories ?? 0,
      steps: typeof rawSteps === "number" && rawSteps >= 0 ? rawSteps : null,
      targetWeight: goalSnapshot?.target_weight ?? targetWeight,
      targetCalories: goalSnapshot?.target_calories ?? targetCalories,
    };
  });

  return {
    records,
    isPending,
    hasError,
  };
}
