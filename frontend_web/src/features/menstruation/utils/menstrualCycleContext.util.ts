import {
  calculateCycleIntervals,
  isValidCycleInterval,
  MAX_VALID_CYCLE_INTERVALS,
} from "@/features/menstruation/utils/menstrualCycleRecords.util";
import type { MenstrualDateRangeResponseDto } from "@/shared/api/types/api.response.dto";

export interface MenstrualCycleContext {
  ownerCycle: MenstrualDateRangeResponseDto;
  nextCycle: MenstrualDateRangeResponseDto | null;
  calculationCycles: MenstrualDateRangeResponseDto[];
  validIntervals: number[];
}

/** 정규화된 최신순 회차에서 owner를 찾고, 과거의 인접 정상 간격을 최대 6개 확보한다. */
export function selectMenstrualCycleContext({
  cycles,
  targetDate,
}: {
  cycles: readonly MenstrualDateRangeResponseDto[];
  targetDate: string;
}): MenstrualCycleContext | null {
  const ownerIndex = cycles.findIndex((cycle) => cycle.start_date <= targetDate);
  if (ownerIndex === -1) return null;

  const olderCycles = cycles.slice(ownerIndex);
  const intervals = calculateCycleIntervals(olderCycles);
  const validIntervals: number[] = [];
  let calculationCycleCount = 1;
  for (const interval of intervals) {
    calculationCycleCount++;
    if (isValidCycleInterval(interval)) validIntervals.push(interval);
    if (validIntervals.length === MAX_VALID_CYCLE_INTERVALS) break;
  }

  return {
    ownerCycle: cycles[ownerIndex],
    // 다음 실제 회차는 화면 구간의 끝을 보정하는 데만 사용한다.
    nextCycle: cycles[ownerIndex - 1] ?? null,
    calculationCycles: olderCycles.slice(0, calculationCycleCount),
    validIntervals,
  };
}
