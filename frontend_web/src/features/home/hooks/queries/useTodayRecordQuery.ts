import { useQuery } from "@tanstack/react-query";

import {
  getTodayMealRecordMenus,
  getTodayRecordBodyStats,
} from "@/features/home/api/todayRecord.api";
import { queryKeys } from "@/features/home/hooks/queries/todayRecord.queryKey";
import { isValidDateKey } from "@/shared/utils/dateFormat";

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
    queryFn: () => getTodayRecordBodyStats(date),
    staleTime: Infinity,
  });
}

