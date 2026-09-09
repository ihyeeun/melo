import { useInfiniteQuery } from "@tanstack/react-query";
import { startOfMonth, subMonths } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { getMenstrualHistory } from "@/features/menstruation/api/menstrual.api";
import { menstrualKeys } from "@/features/menstruation/constants/queryKey";
import { MENSTRUAL_RECORD_CACHE_OPTIONS } from "@/features/menstruation/constants/queryOptions";
import { selectMenstrualCycleContext } from "@/features/menstruation/utils/menstrualCycleContext.util";
import {
  MAX_VALID_CYCLE_INTERVALS,
  normalizeMenstrualCycles,
} from "@/features/menstruation/utils/menstrualCycleRecords.util";
import {
  getMenstrualYearRange,
  MONTHS_PER_MENSTRUAL_QUERY,
} from "@/features/menstruation/utils/menstrualHistoryRange.util";
import {
  calculateMenstrualPhaseDates,
  getMenstrualTypeFromPhase,
} from "@/features/menstruation/utils/menstrualPhaseDatesCalculation.util";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

type Options = {
  enabled?: boolean;
  historyStartDate?: string;
};

export function useMenstrualPhase(
  targetDate: string,
  { enabled = true, historyStartDate = targetDate }: Options = {},
) {
  const [initialMonthKey] = useState(() => formatDateKey(startOfMonth(new Date())));
  const query = useInfiniteQuery({
    ...MENSTRUAL_RECORD_CACHE_OPTIONS,
    enabled,
    // 선택 날짜는 로컬 계산에만 사용한다. 날짜를 바꿔도 조회한 연간 이력을 재사용한다.
    queryKey: menstrualKeys.records.phaseHistory(getMenstrualYearRange(initialMonthKey)),
    initialPageParam: initialMonthKey,
    queryFn: async ({ pageParam }) => {
      const range = getMenstrualYearRange(pageParam);
      const response = await getMenstrualHistory(range);
      return { ...response, fromDate: range.from_date };
    },
    getNextPageParam: (lastPage, _pages, lastMonthKey) =>
      lastPage.has_older
        ? formatDateKey(subMonths(parseDateKey(lastMonthKey), MONTHS_PER_MENSTRUAL_QUERY))
        : undefined,
  });
  const cycles = useMemo(
    () => normalizeMenstrualCycles(query.data?.pages.flatMap((page) => page.recorded_ranges) ?? []),
    [query.data],
  );
  const latestContext = useMemo(() => {
    const latestCycle = cycles[0];
    return latestCycle
      ? selectMenstrualCycleContext({ cycles, targetDate: latestCycle.start_date })
      : null;
  }, [cycles]);
  const context = useMemo(
    () => latestContext && targetDate >= latestContext.ownerCycle.start_date
      ? latestContext
      : selectMenstrualCycleContext({ cycles, targetDate }),
    [cycles, latestContext, targetDate],
  );
  const oldestFromDate = query.data?.pages.at(-1)?.fromDate;
  const needsMoreHistory = Boolean(
    oldestFromDate &&
    query.hasNextPage &&
    (historyStartDate < oldestFromDate || targetDate < oldestFromDate ||
      !context || context.validIntervals.length < MAX_VALID_CYCLE_INTERVALS),
  );
  const { fetchNextPage, isFetching, isError } = query;

  useEffect(() => {
    if (!enabled || !needsMoreHistory || isFetching || isError) return;

    // owner와 정상 간격 최대 6개를 확보할 때까지만 이전 1년씩 추가한다.
    void fetchNextPage({ cancelRefetch: false });
  }, [enabled, fetchNextPage, isError, isFetching, needsMoreHistory]);

  const latestPhaseDate = useMemo(
    () => latestContext ? calculateMenstrualPhaseDates(latestContext) : null,
    [latestContext],
  );
  const phaseDate = useMemo(
    () => {
      if (!context) return null;
      return context.ownerCycle.start_date === latestPhaseDate?.cycleStartDate
        ? latestPhaseDate
        : calculateMenstrualPhaseDates(context);
    },
    [context, latestPhaseDate],
  );
  const isLoading = enabled &&
    (query.isPending || (needsMoreHistory && !isError) || (isError && isFetching));
  const menstrualStatus = isLoading || isError
    ? undefined
    : getMenstrualTypeFromPhase({
        targetDate,
        phaseDate: phaseDate ?? undefined,
        latestCycleStartDate: cycles[0]?.start_date ?? null,
      }) ?? undefined;

  const retry = () => {
    if (query.isFetchNextPageError) {
      void fetchNextPage({ cancelRefetch: false });
    } else {
      void query.refetch({ cancelRefetch: false });
    }
  };

  return {
    menstrualStatus,
    ownerCycle: context?.ownerCycle ?? null,
    calculationCycles: context?.calculationCycles ?? [],
    phaseDate,
    latestPhaseDate,
    cycles,
    hasRecords: cycles.length > 0,
    isLoading,
    isError,
    retry,
  };
}

export type MenstrualPhaseResult = ReturnType<typeof useMenstrualPhase>;
