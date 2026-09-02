import { differenceInCalendarDays } from "date-fns";

import type { MenstrualCycleItemResponseDto } from "@/shared/api/types/api.response.dto";
import { parseDateKey } from "@/shared/utils/dateFormat";

/** 월경 계산 공식 */

interface MenstrualPhaseDurations {
  menstrual: number;
  follicular: number;
  ovulatory: number;
  luteal: number;
  cycle: number;
}

/** 월경 주기 기본 값 */
const CYCLE_LEN = 28;
/** 월경기 기본 값 */
const MENSTRUAL = 5;
/** 배란기 기본 값 */
const OVULATORY = 3;
/** 황체기 기본 값 */
const LUTEAL = 13;

/** 개인용 월경 단계 기간 계산 */
export function calculateMenstrualPhaseDurations(
  cycles: readonly MenstrualCycleItemResponseDto[],
): MenstrualPhaseDurations | null {
  if (cycles.length === 0) return null;

  const latestCycles = sortCyclesByLatest(cycles);

  // 개인용 평균 주기 계산 : N
  const cycleIntervals = calculateCycleIntervals(latestCycles);
  const averageCycleLength =
    cycleIntervals.length < 2 ? CYCLE_LEN : calculateCycleAverage(cycleIntervals);

  // 기준 회차의 월경 기간 : M
  const standardCycle = latestCycles[0];
  const standardCycleMenstrual =
    differenceInCalendarDays(
      parseDateKey(standardCycle.end_date),
      parseDateKey(standardCycle.start_date),
    ) + 1;
  const menstrual = standardCycle.is_end
    ? standardCycleMenstrual
    : Math.max(standardCycleMenstrual, MENSTRUAL);

  // 월경기 이후 남는 일수 N-M : R
  const remainingCycleLen = averageCycleLength - menstrual;

  // 난포기, 배란기, 황체기
  let follicular = 0;
  let ovulatory = 0;
  let luteal = 0;

  if (remainingCycleLen >= 16) {
    luteal = LUTEAL;
    ovulatory = Math.min(OVULATORY, remainingCycleLen - luteal);
    follicular = remainingCycleLen - luteal - ovulatory;
  } else if (remainingCycleLen >= 0) {
    luteal = remainingCycleLen;
  } // 음수인 경우에는 난포기, 배란기, 황체기 값 0으로 retrun

  return { menstrual, follicular, ovulatory, luteal, cycle: averageCycleLength };
}

/** 월경 회차 최신순 정렬 */
export function sortCyclesByLatest(
  cycles: readonly MenstrualCycleItemResponseDto[],
): MenstrualCycleItemResponseDto[] {
  return [...cycles].sort((a, b) => b.start_date.localeCompare(a.start_date));
}

/** 월경 회차별 간격 배열 */
export function calculateCycleIntervals(
  cycles: readonly MenstrualCycleItemResponseDto[],
): number[] {
  const cycleLengths: number[] = [];

  for (let idx = 0; idx < cycles.length - 1; ++idx) {
    const currentCycle = cycles[idx];
    const prevCycle = cycles[idx + 1];

    const cycleLength = differenceInCalendarDays(
      parseDateKey(currentCycle.start_date),
      parseDateKey(prevCycle.start_date),
    );

    cycleLengths.push(cycleLength);
  }

  return cycleLengths;
}

/** 월경 주기 평균 값 구하기 + 반올림 */
function calculateCycleAverage(days: readonly number[]): number {
  const vaildDays = days.filter((day) => day >= 21 && day <= 45);
  if (vaildDays.length < 2) return CYCLE_LEN; // 예외 5. 정상 간격 데이터가 2회 미만인 경우 기본값 유지

  const avgCycle = vaildDays.reduce((sum, day) => sum + day, 0) / vaildDays.length;
  return Math.round(avgCycle);
}
