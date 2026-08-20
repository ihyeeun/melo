import { differenceInCalendarDays } from "date-fns";

import type { CycleItem } from "@/features/menstruation/types/menstruation.type";
import { parseDateKey } from "@/shared/utils/dateFormat";

const DEFAULT_CYCLE = 28; //평균 주기 : 생리 시작 - 다음 생리 시작된 날까지의 간격
const DEFAULT_MENSTRUAL = 5; //기본 월경기
const DEFAULT_OVULATORY = 3; //배란기
const DEFAULT_LUTEAL = 13; //황체기

export function calculateMenstrual(cycles: CycleItem[]) {
  if (cycles.length === 0) return null;

  const latestCycles = sortCyclesByLatest(cycles);
  const menstrualCycle = calculateCycleLengthsAvg(latestCycles); // N
  const recentCycle = latestCycles[0];

  let menstrual = calculateMenstrualPeriod(recentCycle); // M
  let follicular = 0;
  let ovulatory = DEFAULT_OVULATORY;
  let luteal = DEFAULT_LUTEAL;

  // 예외 1. 주기가 매우 짧은 경우
  if (menstrualCycle <= 23) {
    menstrual = 4;
    follicular = menstrualCycle - 20;
    ovulatory = 3;
    luteal = 13;
    return { menstrual, follicular, ovulatory, luteal };
  } else if (menstrualCycle <= 21) {
    menstrual = 3;
    follicular = 2;
    ovulatory = 3;
    luteal = menstrualCycle - 8;
    return { menstrual, follicular, ovulatory, luteal };
  }

  // 예외 2. 월경 기간이 길어진 경우
  if (menstrual >= menstrualCycle - 16) {
    // 1. 월경 기간이 난포기 종료일까지 이어지는 경우
    // 난포기 구간을 건너뛰고 월경기 종료 즉시 배란기 단계로 진입
    return { menstrual, follicular, ovulatory, luteal };
  } else if (menstrual >= menstrualCycle - 13) {
    // 2. 월경 기간이 배란기 종료일까지 이어지는 경우
    // 배란기 구간을 건너뛰고 월경기 종료 즉시 황체기 단계로 진입
    ovulatory = 0;
    return { menstrual, follicular, ovulatory, luteal };
  }

  // 예외 4. 월경 기간이 한 주기를 초과하는 경우
  if (menstrual >= menstrualCycle) {
    follicular = 0;
    ovulatory = 0;
    luteal = 0;

    return { menstrual, follicular, ovulatory, luteal };
  }

  return { menstrual, follicular, ovulatory, luteal };
}

function sortCyclesByLatest(cycles: CycleItem[]): CycleItem[] {
  return [...cycles].sort((a, b) => b.start_date.localeCompare(a.start_date));
}

function calculateCycleLengthsAvg(cycles: CycleItem[]): number {
  if (cycles.length < 2) return DEFAULT_CYCLE;

  // 기본 원칙 : 입력 데이터가 2회 이상 쌓이면 개인 평균 주기로 전환.
  const cycleLengths: number[] = [];

  for (let idx = 0; idx < cycles.length - 1; ++idx) {
    const currentCycle = cycles[idx];
    const prevCycle = cycles[idx + 1];

    const cycleLength = differenceInCalendarDays(
      parseDateKey(currentCycle.start_date),
      parseDateKey(prevCycle.start_date),
    );

    if (cycleLength >= 21 && cycleLength <= 45) {
      cycleLengths.push(cycleLength);
    }
  }

  // 예외 5. 정상 간격 데이터가 2회 미만인 경우 기본값 유지
  if (cycleLengths.length < 2) return DEFAULT_CYCLE;

  const cycleAvg = cycleLengths.reduce((sum, cycleDay) => sum + cycleDay, 0) / cycleLengths.length;

  return Math.round(cycleAvg);
}

function calculateMenstrualPeriod(cycle: CycleItem): number {
  const menstrualPeriod =
    differenceInCalendarDays(parseDateKey(cycle.end_date), parseDateKey(cycle.start_date)) + 1;

  // 사용자가 종료를 확정한 경우(기본 월경기보다 작은 경우도 포함)
  if (cycle.is_end) {
    return menstrualPeriod;
  }

  return Math.max(menstrualPeriod, DEFAULT_MENSTRUAL);
}
