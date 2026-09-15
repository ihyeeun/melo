import { useQueries } from "@tanstack/react-query";
import { differenceInCalendarMonths, subMonths } from "date-fns";

import { getMenstrualHistory } from "@/features/menstruation/api/menstrual.api";
import { menstrualKeys } from "@/features/menstruation/constants/queryKey";
import { MENSTRUAL_RECORD_CACHE_OPTIONS } from "@/features/menstruation/constants/queryOptions";
import {
  getMenstrualYearRange,
  MONTHS_PER_MENSTRUAL_QUERY,
} from "@/features/menstruation/utils/menstrualHistoryRange.util";
import { formatDateKey, getTodayFormatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

// monthKeys는 오래된 월부터 현재 월까지의 순서다. 달력은 월별로, 조회는 12개월씩 늘린다.
export function useMenstrualYearQueries(monthKeys: string[]) {
  const latestMonth = parseDateKey(monthKeys.at(-1) ?? getTodayFormatDateKey());
  const getYearIndex = (monthKey: string) =>
    Math.floor(
      differenceInCalendarMonths(latestMonth, parseDateKey(monthKey)) / MONTHS_PER_MENSTRUAL_QUERY,
    );
  const yearCount = monthKeys.length > 0 ? getYearIndex(monthKeys[0]) + 1 : 0;

  const yearQueries = useQueries({
    queries: Array.from({ length: yearCount }, (_, yearIndex) => {
      const lastMonth = subMonths(latestMonth, yearIndex * MONTHS_PER_MENSTRUAL_QUERY);
      const range = getMenstrualYearRange(formatDateKey(lastMonth));

      return {
        ...MENSTRUAL_RECORD_CACHE_OPTIONS,
        queryKey: menstrualKeys.records.year(range),
        queryFn: () => getMenstrualHistory(range),
      };
    }),
  });

  // has_older가 false여도 빈 과거 달에 새 기록을 입력할 수 있어야 한다.
  // 각 월은 자신이 속한 연간 조회 결과를 공유하고, 직접 요청을 만들지 않는다.
  const monthQueries = monthKeys.map((monthKey) => ({
    monthKey,
    query: yearQueries[getYearIndex(monthKey)],
  }));
  const ranges = yearQueries.flatMap((query) => query.data?.recorded_ranges ?? []);
  // 범위를 걸쳐 중복 반환된 원본은 제거한다. 저장과 phase 계산에서 누적 기록을 사용할 수 있다.
  const uniqueRanges = new Map(
    ranges.map((range) => [`${range.start_date}/${range.end_date}`, range]),
  );
  const recordedRanges = [...uniqueRanges.values()].sort(
    (left, right) =>
      left.start_date.localeCompare(right.start_date) ||
      left.end_date.localeCompare(right.end_date),
  );

  return { yearQueries, monthQueries, recordedRanges };
}
