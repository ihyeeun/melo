import { useInfiniteQuery } from "@tanstack/react-query";
import { startOfMonth, subMonths } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { getMenstrualHistory } from "@/features/menstruation/api/menstrual.api";
import { menstrualKeys } from "@/features/menstruation/constants/queryKey";
import { MENSTRUAL_RECORD_CACHE_OPTIONS } from "@/features/menstruation/constants/queryOptions";
import { selectMenstrualCycleContext } from "@/features/menstruation/utils/menstrualCycleContext.util";
import {
  MAX_VALID_CYCLE_INTERVALS,
  normalizeMenstrualHistory,
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
  const { cycles, recordedRanges, irregularBleedingRanges, classificationStableFrom } = useMemo(
    () => normalizeMenstrualHistory(query.data?.pages.flatMap((page) => page.recorded_ranges) ?? []),
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
  const historyContext = useMemo(
    () => historyStartDate < targetDate
      ? selectMenstrualCycleContext({ cycles, targetDate: historyStartDate })
      : context,
    [context, cycles, historyStartDate, targetDate],
  );
  const oldestFromDate = query.data?.pages.at(-1)?.fromDate;
  const hasStableClassification = classificationStableFrom !== null &&
    context?.calculationCycles.every((cycle) => cycle.start_date >= classificationStableFrom) &&
    historyContext?.calculationCycles.every((cycle) => cycle.start_date >= classificationStableFrom);
  const needsMoreHistory = Boolean(
    oldestFromDate &&
    query.hasNextPage &&
    (historyStartDate < oldestFromDate || targetDate < oldestFromDate || !hasStableClassification ||
      !context || context.validIntervals.length < MAX_VALID_CYCLE_INTERVALS ||
      !historyContext || historyContext.validIntervals.length < MAX_VALID_CYCLE_INTERVALS),
  );
  const { fetchNextPage, isFetching, isError } = query;

  useEffect(() => {
    if (!enabled || !needsMoreHistory || isFetching || isError) return;

    // 부정출혈 분류가 오래된 미조회 기록에 영향받지 않고 정상 간격 최대 6개가 확보될 때까지 조회한다.
    void fetchNextPage({ cancelRefetch: false });
  }, [enabled, fetchNextPage, isError, isFetching, needsMoreHistory]);

  const phaseDate = useMemo(
    () => context ? calculateMenstrualPhaseDates(context, targetDate) : null,
    [context, targetDate],
  );
  const isLoading = enabled &&
    (query.isPending || (needsMoreHistory && !isError) || (isError && isFetching));
  const menstrualStatus = isLoading || isError
    ? undefined
    : getMenstrualTypeFromPhase({
        targetDate,
        phaseDate: phaseDate ?? undefined,
      }) ?? undefined;
  const isIrregularBleeding = !isLoading && !isError && irregularBleedingRanges.some(
    (range) => range.start_date <= targetDate && targetDate <= range.end_date,
  );

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
    cycles,
    recordedRanges,
    isIrregularBleeding,
    hasRecords: recordedRanges.length > 0,
    isLoading,
    isError,
    retry,
  };
}

export type MenstrualPhaseResult = ReturnType<typeof useMenstrualPhase>;
