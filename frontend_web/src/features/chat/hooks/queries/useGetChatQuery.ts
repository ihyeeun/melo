import { useQueries, useQuery } from "@tanstack/react-query";

import { getChatHistory, searchMenu } from "@/features/chat/api/chat.api";
import { queryKeys } from "@/features/chat/hooks/queries/queryKey";
import { getTodayMealRecordMenus } from "@/features/home/api/todayRecord.api";
import { queryKeys as homeKeys } from "@/features/home/hooks/queries/todayRecord.queryKey.ts";
import { formatDateKey } from "@/shared/utils/dateFormat";

export function useGetChatHistoryQuery() {
  return useQuery({
    queryKey: queryKeys.chatHistory,
    queryFn: getChatHistory,
    staleTime: Infinity,
  });
}

export function useSearchMenuQuery(text: string, options: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["searchMenu", text],
    queryFn: () => searchMenu({ text }),
    enabled: options.enabled && text.length > 0,
    staleTime: 1 * 60 * 1000,
  });
}

export function useRecentDayMealsQuery() {
  const today = new Date();
  const mealDates = Array.from({ length: 8 }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - index);
    return formatDateKey(date);
  });

  const result = useQueries({
    queries: mealDates.map((date) => ({
      queryKey: homeKeys.dayMeals.byDate(date),
      queryFn: () => getTodayMealRecordMenus(date),
      staleTime: Infinity,
    })),
  });

  const isPending = result.some((req) => req.isPending);
  const isError = result.some((req) => req.isError);
  const data = result.map((req, index) => ({
    date: mealDates[index],
    meals: req.data,
  }));

  return { data, isPending, isError };
}
