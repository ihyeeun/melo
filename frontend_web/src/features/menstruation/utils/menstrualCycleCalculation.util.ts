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
  cycles: MenstrualCycleItemResponseDto[],
  cycleId: number,
): MenstrualPhaseDurations | null {
  if (cycles.length === 0) return null;

  const latestCycles = sortCyclesByLatest(cycles, cycleId);
  if (!latestCycles) return null;

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
  let menstrual = standardCycle.is_end
    ? standardCycleMenstrual
    : Math.max(standardCycleMenstrual, MENSTRUAL);

  // 난포기, 배란기, 황체기
  let follicular = averageCycleLength - 16 - menstrual;
  let ovulatory = OVULATORY;
  let luteal = LUTEAL;

  // 예외 1. 주기가 매우 짧은 경우
  if (averageCycleLength <= 21) {
    menstrual = 3;
    follicular = 2;
    ovulatory = 3;
    luteal = averageCycleLength - 8;

    return { menstrual, follicular, ovulatory, luteal, cycle: averageCycleLength };
  } else if (averageCycleLength <= 23) {
    menstrual = 4;
    follicular = averageCycleLength - 20;
    ovulatory = 3;
    luteal = 13;

    return { menstrual, follicular, ovulatory, luteal, cycle: averageCycleLength };
  }
  // 예외 4. 월경 기간이 한 주기를 초과하는 경우
  if (menstrual >= averageCycleLength) {
    follicular = 0;
    ovulatory = 0;
    luteal = 0;

    return { menstrual, follicular, ovulatory, luteal, cycle: averageCycleLength };
  }

  // 예외 2. 월경 기간이 길어진 경우
  if (menstrual >= averageCycleLength - 13) {
    // 2. 월경 기간이 배란기 종료일까지 이어지는 경우
    // 배란기 구간을 건너뛰고 월경기 종료 즉시 황체기 단계로 진입
    follicular = 0;
    ovulatory = 0;
    return { menstrual, follicular, ovulatory, luteal, cycle: averageCycleLength };
  }

  if (menstrual >= averageCycleLength - 16) {
    // 1. 월경 기간이 난포기 종료일까지 이어지는 경우
    // 난포기 구간을 건너뛰고 월경기 종료 즉시 배란기 단계로 진입
    follicular = 0;
    return { menstrual, follicular, ovulatory, luteal, cycle: averageCycleLength };
  }

  return { menstrual, follicular, ovulatory, luteal, cycle: averageCycleLength };
}

/** 월경 회차 최신순 정렬 */
function sortCyclesByLatest(
  cycles: MenstrualCycleItemResponseDto[],
  cycleId: number,
): MenstrualCycleItemResponseDto[] | null {
  const standardCycle = cycles.find(({ cycle_id }) => cycle_id === cycleId);

  if (!standardCycle) return null;

  return cycles
    .filter((cycle) => cycle.start_date <= standardCycle.start_date)
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
}

/** 월경 회차별 간격 배열 */
export function calculateCycleIntervals(cycles: MenstrualCycleItemResponseDto[]): number[] {
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
function calculateCycleAverage(days: number[]): number {
  const vaildDays = days.filter((day) => day >= 21 && day <= 45);
  if (vaildDays.length < 2) return CYCLE_LEN; // 예외 5. 정상 간격 데이터가 2회 미만인 경우 기본값 유지

  const avgCycle = vaildDays.reduce((sum, day) => sum + day, 0) / vaildDays.length;
  return Math.round(avgCycle);
}
