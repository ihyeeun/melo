import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import {
  getMenstrualRecorded,
  getMenstruationCycles,
} from "@/features/menstruation/api/menstruation.api";
import { menstrualKeys } from "@/features/menstruation/constants/queryKey";
import { transformMenstrualCyclesResponse } from "@/features/menstruation/utils/menstrualTransformer.util";

export function useGetMenstruationCyclesQuery({
  date,
  enabled,
}: {
  date: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: menstrualKeys.cycles.history(),
    queryFn: () => getMenstruationCycles({ date, limit: 7 }),
    enabled: enabled,
  });
}

export function useGetMenstrualRecordedQuery(date: string) {
  return useQuery({
    queryKey: menstrualKeys.detail.day(date),
    queryFn: () => getMenstrualRecorded(date),
  });
}

export function useMenstrualHistoryInfiniteQuery(initTargetDate: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: menstrualKeys.cycles.history(),
    initialPageParam: initTargetDate,
    queryFn: async ({ pageParam }) => {
      const response = await getMenstruationCycles({ date: pageParam, limit: 7 });
      return transformMenstrualCyclesResponse(response, 7);
    },
    getNextPageParam: (lastPage) => lastPage.nextTargetDate ?? undefined,
    enabled: enabled,
  });
}
