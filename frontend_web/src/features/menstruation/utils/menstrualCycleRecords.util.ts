import { addDays, differenceInCalendarDays } from "date-fns";

import type { MenstrualDateRangeResponseDto } from "@/shared/api/types/api.response.dto";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

export const MAX_VALID_CYCLE_INTERVALS = 6;
export const MIN_CYCLE_INTERVAL_DAYS = 14;
export const MAX_CYCLE_INTERVAL_DAYS = 45;
export const MAX_MENSTRUAL_BLOCK_GAP_DAYS = 2;

/** 원본을 변경하지 않고 겹치거나 연속된 구간을 병합해 오래된 시작일 순서로 반환한다. */
export function mergeMenstrualRanges(
  records: readonly MenstrualDateRangeResponseDto[],
): MenstrualDateRangeResponseDto[] {
  return mergeRangesWithinGap(records, 0);
}

/** 계산용 블록은 최대 2일의 미기록 공백까지 포함한다. 저장할 실제 기록에는 사용하지 않는다. */
export function mergeMenstrualRecordBlocks(
  records: readonly MenstrualDateRangeResponseDto[],
): MenstrualDateRangeResponseDto[] {
  return mergeRangesWithinGap(records, MAX_MENSTRUAL_BLOCK_GAP_DAYS);
}

function mergeRangesWithinGap(
  records: readonly MenstrualDateRangeResponseDto[],
  maxUnrecordedDays: number,
): MenstrualDateRangeResponseDto[] {
  const sorted = records.map((record) => ({ ...record })).sort((left, right) =>
    left.start_date.localeCompare(right.start_date) || left.end_date.localeCompare(right.end_date),
  );
  const cycles: MenstrualDateRangeResponseDto[] = [];

  for (const record of sorted) {
    const previous = cycles.at(-1);
    const latestConnectedDate = previous
      ? formatDateKey(addDays(parseDateKey(previous.end_date), maxUnrecordedDays + 1))
      : null;

    if (previous && latestConnectedDate && record.start_date <= latestConnectedDate) {
      if (record.end_date > previous.end_date) previous.end_date = record.end_date;
    } else {
      cycles.push(record);
    }
  }

  return cycles;
}

export interface MenstrualRecordHistory {
  recordedRanges: MenstrualDateRangeResponseDto[];
  cycles: MenstrualDateRangeResponseDto[];
  irregularBleedingRanges: MenstrualDateRangeResponseDto[];
  classificationStableFrom: string | null;
}

/** 실제 기록은 보존하고, 공백을 포함한 월경 블록과 부정출혈 기록을 분리한다. */
export function normalizeMenstrualHistory(
  records: readonly MenstrualDateRangeResponseDto[],
): MenstrualRecordHistory {
  const recordedRanges = mergeMenstrualRanges(records);
  const blocks = mergeMenstrualRecordBlocks(recordedRanges);
  const cycles: MenstrualDateRangeResponseDto[] = [];
  const irregularBlocks: MenstrualDateRangeResponseDto[] = [];
  let classificationStableFrom: string | null = null;

  for (const [index, block] of blocks.entries()) {
    const previousBlock = blocks[index - 1];
    // 직전 블록과도 14일 이상 떨어지면 더 오래된 기록의 분류와 무관하게 새 월경이다.
    // 그 이전 이력이 미조회 상태라면 이 날짜보다 앞선 분류는 추가 조회가 필요하다.
    if (
      classificationStableFrom === null && previousBlock &&
      differenceInCalendarDays(parseDateKey(block.start_date), parseDateKey(previousBlock.start_date)) >=
        MIN_CYCLE_INTERVAL_DAYS
    ) classificationStableFrom = block.start_date;

    const previousCycle = cycles.at(-1);
    if (
      previousCycle &&
      differenceInCalendarDays(parseDateKey(block.start_date), parseDateKey(previousCycle.start_date)) <
        MIN_CYCLE_INTERVAL_DAYS
    ) {
      irregularBlocks.push(block);
    } else {
      cycles.push(block);
    }
  }

  return {
    recordedRanges,
    cycles: cycles.reverse(),
    // 부정출혈 문구는 사용자가 직접 기록한 날짜에만 표시한다.
    irregularBleedingRanges: recordedRanges.filter((range) =>
      irregularBlocks.some((block) => block.start_date <= range.start_date && range.end_date <= block.end_date),
    ),
    classificationStableFrom,
  };
}

/** 최신순 월경 블록의 인접 시작일 간격. 부정출혈은 월경 블록 구성 단계에서 제외한다. */
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
