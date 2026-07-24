import { useQuery } from "@tanstack/react-query";

import {
  getTodayMealRecordMenus,
  getTodayRecordBodyStats,
  registerWeight,
} from "@/features/home/api/todayRecord.api";
import { queryKeys } from "@/features/home/hooks/queries/todayRecord.queryKey";
import { getProfile } from "@/features/profile/api/profile";
import { queryKeys as profileQueryKeys } from "@/features/profile/hooks/queries/queryKey";
import { queryClient } from "@/shared/api/queryClient";
import { getTodayFormatDateKey, isValidDateKey } from "@/shared/utils/dateFormat";

export function useDayMealsQuery(date: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.dayMeals.byDate(date),
    queryFn: () => getTodayMealRecordMenus(date),
    enabled: enabled && isValidDateKey(date),
    staleTime: Infinity,
  });
}

export function useGetBodyLog(date: string) {
  return useQuery({
    queryKey: queryKeys.bodyStats(date),
    queryFn: () =>
      date === getTodayFormatDateKey()
        ? initializeTodayWeight(date)
        : getTodayRecordBodyStats(date),
    staleTime: Infinity,
  });
}

async function initializeTodayWeight(date: string) {
  const bodyStats = await getTodayRecordBodyStats(date);

  if (bodyStats.weight !== null) {
    return bodyStats;
  }

  const profile = await queryClient.fetchQuery({
    queryKey: profileQueryKeys.profile,
    queryFn: getProfile,
    staleTime: Infinity,
  });

  await registerWeight({ date, weight: profile.weight });

  return {
    ...bodyStats,
    weight: profile.weight,
  };
}
