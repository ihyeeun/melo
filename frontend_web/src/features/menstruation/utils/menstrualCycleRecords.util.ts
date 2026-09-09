import { addDays, differenceInCalendarDays } from "date-fns";

import type { MenstrualDateRangeResponseDto } from "@/shared/api/types/api.response.dto";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

export const MAX_VALID_CYCLE_INTERVALS = 6;
export const MIN_CYCLE_INTERVAL_DAYS = 14;
export const MAX_CYCLE_INTERVAL_DAYS = 45;

/** 원본을 변경하지 않고 겹치거나 연속된 구간을 병합해 오래된 시작일 순서로 반환한다. */
export function mergeMenstrualRanges(
  records: readonly MenstrualDateRangeResponseDto[],
): MenstrualDateRangeResponseDto[] {
  const sorted = records.map((record) => ({ ...record })).sort((left, right) =>
    left.start_date.localeCompare(right.start_date) || left.end_date.localeCompare(right.end_date),
  );
  const cycles: MenstrualDateRangeResponseDto[] = [];

  for (const record of sorted) {
    const previous = cycles.at(-1);
    const nextDate = previous
      ? formatDateKey(addDays(parseDateKey(previous.end_date), 1))
      : null;

    if (previous && nextDate && record.start_date <= nextDate) {
      if (record.end_date > previous.end_date) previous.end_date = record.end_date;
    } else {
      cycles.push(record);
    }
  }

  return cycles;
}

/** 조회 페이지를 모두 합친 뒤 한 번 정규화한다. 내부 계산용 회차는 최신순이다. */
export function normalizeMenstrualCycles(
  records: readonly MenstrualDateRangeResponseDto[],
): MenstrualDateRangeResponseDto[] {
  return mergeMenstrualRanges(records).reverse();
}

/** 정규화된 최신순 회차의 인접 시작일 간격. 이상치 회차를 건너뛰어 새 간격을 만들지 않는다. */
export function calculateCycleIntervals(
  sortedCycles: readonly MenstrualDateRangeResponseDto[],
): number[] {
  return sortedCycles.slice(0, -1).map((cycle, index) =>
    differenceInCalendarDays(
      parseDateKey(cycle.start_date),
      parseDateKey(sortedCycles[index + 1].start_date),
    ),
  );
}

export function isValidCycleInterval(days: number): boolean {
  return days >= MIN_CYCLE_INTERVAL_DAYS && days <= MAX_CYCLE_INTERVAL_DAYS;
}
