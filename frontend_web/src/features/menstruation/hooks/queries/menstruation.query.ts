import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { endOfMonth } from "date-fns";

import {
  getMenstrualRecorded,
  getMenstruationCycles,
} from "@/features/menstruation/api/menstruation.api";
import { menstrualKeys } from "@/features/menstruation/constants/queryKey";
import {
  MAX_CALCULATION_CYCLES,
  normalizeMenstrualCycles,
} from "@/features/menstruation/utils/menstrualCycleContext.util";
import { transformMenstrualCyclesResponse } from "@/features/menstruation/utils/menstrualTransformer.util";
import { formatDateKey } from "@/shared/utils/dateFormat";

const MENSTRUAL_HISTORY_GC_TIME = 30 * 60 * 1000;

type MenstrualHistoryQueryOptions = {
  enabled?: boolean;
};

export function useGetMenstrualRecordedQuery(date: string) {
  return useQuery({
    queryKey: menstrualKeys.detail.day(date),
    queryFn: () => getMenstrualRecorded(date),
  });
}

export function useMenstrualHistoryInfiniteQuery({
  enabled = true,
}: MenstrualHistoryQueryOptions = {}) {
  const headAnchor = getMenstrualHistoryHeadAnchor();
  const limit = MAX_CALCULATION_CYCLES;

  return useInfiniteQuery({
    queryKey: menstrualKeys.cycles.history(headAnchor),
    initialPageParam: headAnchor,
    queryFn: async ({ pageParam }) => {
      const response = await getMenstruationCycles({ date: pageParam, limit });
      return transformMenstrualCyclesResponse(response, limit);
    },
    getNextPageParam: (lastPage, _allPages, lastPageParam, allPageParams) => {
      const nextTargetDate = lastPage.nextTargetDate;

      if (!nextTargetDate) return undefined;
      if (nextTargetDate >= lastPageParam) return undefined;
      if (allPageParams.includes(nextTargetDate)) return undefined;

      return nextTargetDate;
    },
    enabled,
    staleTime: Infinity,
    gcTime: MENSTRUAL_HISTORY_GC_TIME,
    select: (data) => ({
      ...data,
      cycles: normalizeMenstrualCycles(data.pages.flatMap((page) => page.cycles)),
    }),
  });
}

/** 모든 consumer가 같은 최신 history cache를 공유하기 위한 기준일이다. */
function getMenstrualHistoryHeadAnchor(): string {
  return formatDateKey(endOfMonth(new Date()));
}
