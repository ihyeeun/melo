import { addDays, differenceInCalendarDays } from "date-fns";

import {
  type CycleType,
  type DateRange,
  type MenstrualCalculateCalendar,
  type MenstrualDisplayState,
  type MenstrualPhase,
  type MenstrualSaveDecision,
  MENSTRUATION_STATUS,
  type MenstruationDateType,
  type MenstruationStatus,
} from "@/features/menstruation/types/menstruation.type";
import type {
  MenstraulRecordReponseDto,
  MenstrualCycleItemResponseDto,
} from "@/shared/api/types/api.response.dto";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

const DEFAULT_CYCLE = 28; //평균 주기 : 생리 시작 - 다음 생리 시작된 날까지의 간격
const DEFAULT_MENSTRUAL = 5; //기본 월경기
const DEFAULT_OVULATORY = 3; //배란기
const DEFAULT_LUTEAL = 13; //황체기
const MAX_CYCLE_DAY = 45;

export function calculateMenstrual(cycles: MenstrualCycleItemResponseDto[]) {
  if (cycles.length === 0) return null;

  const latestCycles = sortCyclesByLatest(cycles);
  const menstrualCycle = calculateCycleLengthsAvg(latestCycles); // N
  const recentCycle = latestCycles[0];

  let menstrual = calculateMenstrualPeriod(recentCycle); // M
  let follicular = 0;
  let ovulatory = DEFAULT_OVULATORY;
  let luteal = DEFAULT_LUTEAL;

  // 예외 1. 주기가 매우 짧은 경우
  if (menstrualCycle <= 21) {
    menstrual = 3;
    follicular = 2;
    ovulatory = 3;
    luteal = menstrualCycle - 8;

    return { menstrual, follicular, ovulatory, luteal };
  } else if (menstrualCycle <= 23) {
    menstrual = 4;
    follicular = menstrualCycle - 20;
    ovulatory = 3;
    luteal = 13;

    return { menstrual, follicular, ovulatory, luteal };
  }

  // 예외 4. 월경 기간이 한 주기를 초과하는 경우
  if (menstrual >= menstrualCycle) {
    follicular = 0;
    ovulatory = 0;
    luteal = 0;

    return { menstrual, follicular, ovulatory, luteal };
  }

  // 예외 2. 월경 기간이 길어진 경우
  if (menstrual >= menstrualCycle - 13) {
    // 2. 월경 기간이 배란기 종료일까지 이어지는 경우
    // 배란기 구간을 건너뛰고 월경기 종료 즉시 황체기 단계로 진입
    ovulatory = 0;
    return { menstrual, follicular, ovulatory, luteal };
  }

  if (menstrual >= menstrualCycle - 16) {
    // 1. 월경 기간이 난포기 종료일까지 이어지는 경우
    // 난포기 구간을 건너뛰고 월경기 종료 즉시 배란기 단계로 진입
    return { menstrual, follicular, ovulatory, luteal };
  }

  follicular = menstrualCycle - 16 - menstrual;

  return { menstrual, follicular, ovulatory, luteal };
}

function sortCyclesByLatest(
  cycles: MenstrualCycleItemResponseDto[],
): MenstrualCycleItemResponseDto[] {
  return [...cycles].sort((a, b) => b.start_date.localeCompare(a.start_date));
}

export function findCandidateCycle(
  cycles: MenstrualCycleItemResponseDto[],
  targetDate: string,
): MenstrualCycleItemResponseDto | null {
  const cyclesStartedByTargetDate = cycles.filter((cycle) => cycle.start_date <= targetDate);

  return sortCyclesByLatest(cyclesStartedByTargetDate)[0] ?? null;
}

function calculateCycleLengthsAvg(cycles: MenstrualCycleItemResponseDto[]): number {
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

function calculateMenstrualPeriod(cycle: MenstrualCycleItemResponseDto): number {
  const menstrualPeriod =
    differenceInCalendarDays(parseDateKey(cycle.end_date), parseDateKey(cycle.start_date)) + 1;

  // 사용자가 종료를 확정한 경우(기본 월경기보다 작은 경우도 포함)
  if (cycle.is_end) {
    return menstrualPeriod;
  }

  return Math.max(menstrualPeriod, DEFAULT_MENSTRUAL);
}

/**
 * 새 회차, 연장, 기존 회차 판단
 */
export function resolveCycleType({
  cycle,
  targetDate,
}: {
  cycle: MenstrualCycleItemResponseDto | null;
  targetDate: string;
}): CycleType {
  const CYCLE_MAX_DAY = 14;

  if (cycle === null) return { type: "CREATE_CYCLE" };

  const diffDay =
    differenceInCalendarDays(parseDateKey(targetDate), parseDateKey(cycle.start_date)) + 1;

  if (diffDay > 0 && diffDay <= CYCLE_MAX_DAY) {
    return {
      type: "EXTEND_CYCLE",
      cycle_id: cycle.cycle_id,
    };
  }

  // 연속해서 기록한 경우에 EXTEND 처리해야 예외 4 처리 가능
  const continueDay = differenceInCalendarDays(
    parseDateKey(targetDate),
    parseDateKey(cycle.end_date),
  );

  if (!cycle.is_end && continueDay === 1) {
    return {
      type: "EXTEND_CYCLE",
      cycle_id: cycle.cycle_id,
    };
  }

  return {
    type: "CREATE_CYCLE",
  };
}

export function resolveMenstrualSaveDecision({
  existingRecord,
  cycle,
  targetDate,
  menstruationStatus,
}: {
  existingRecord: MenstraulRecordReponseDto["record"];
  cycle: MenstrualCycleItemResponseDto | null;
  targetDate: string;
  menstruationStatus: MenstruationStatus;
}): MenstrualSaveDecision {
  // 1. 해당 날짜에 기록이 이미 있으면 수정
  if (existingRecord !== null) {
    return {
      type: "UPDATE_DAILY_RECORD",
    };
  }

  const cycleType = resolveCycleType({
    cycle,
    targetDate,
  });

  // 2. 생리 없음 기록
  if (menstruationStatus === MENSTRUATION_STATUS.NOT_BLEEDING) {
    // 없음 기록은 새로운 회차를 생성할 수 없음
    if (cycle === null || cycle.is_end || cycleType.type === "CREATE_CYCLE") {
      return {
        type: "BLOCKED",
        reason: "ACTIVE_CYCLE_REQUIRED",
      };
    }

    return {
      type: "CREATE_DAILY_RECORD",
      cycleId: cycleType.cycle_id,
    };
  }

  // 3. 생리 있음 + 연결 가능한 회차 없음
  if (cycleType.type === "CREATE_CYCLE") {
    return {
      type: "CREATE_CYCLE",
    };
  }

  // 4. 생리 있음 + 연결 가능한 기존 회차 있음
  return {
    type: "CREATE_DAILY_RECORD",
    cycleId: cycleType.cycle_id,
  };
}

export function calculateMenstrualCalendar(
  cycles: MenstrualCycleItemResponseDto[],
): MenstrualCalculateCalendar | null {
  if (cycles.length === 0) return null;

  const latestCycles = sortCyclesByLatest(cycles);
  const latestCycle = latestCycles[0];

  const calculateMenstrualValue = calculateMenstrual(latestCycles);
  if (!calculateMenstrualValue) return null;

  const cyclePeriod = calculateCycleLengthsAvg(latestCycles);

  // 생리 예상일
  const predictedDate = formatDateKey(addDays(parseDateKey(latestCycle.start_date), cyclePeriod));

  // 생리 가능일
  const rangeDay = latestCycles.length > 2 ? calculatePossibleDateRange(latestCycles) : 2;
  const possibleDate = {
    startDate: formatDateKey(addDays(parseDateKey(predictedDate), -rangeDay)),

    endDate: formatDateKey(addDays(parseDateKey(predictedDate), rangeDay)),
  };

  const menstrualDates = latestCycles.map((cycle, idx) => {
    const isLatestCycle = idx === 0;

    if (isLatestCycle && !cycle.is_end) {
      return (
        calculateDateRange(cycle.start_date, calculateMenstrualValue.menstrual) ?? {
          startDate: cycle.start_date,
          endDate: cycle.end_date,
        }
      );
    }

    return {
      startDate: cycle.start_date,
      endDate: cycle.end_date,
    };
  });

  return {
    cyclePeriod,
    calendar: {
      possibleDate,
      predictedDate,
      menstrualDates,
    },
  };
}

function calculateDateRange(startDate: string, duration: number): DateRange | null {
  if (duration <= 0) return null;
  const endDate = addDays(parseDateKey(startDate), duration - 1);

  return {
    startDate,
    endDate: formatDateKey(endDate),
  };
}

function calculateCycleLengths(cycles: MenstrualCycleItemResponseDto[]): number[] {
  const cycleLengths: number[] = [];

  for (let idx = 0; idx < cycles.length - 1; ++idx) {
    const currentCycle = cycles[idx];
    const previousCycle = cycles[idx + 1];

    const cycleLength = differenceInCalendarDays(
      parseDateKey(currentCycle.start_date),
      parseDateKey(previousCycle.start_date),
    );

    if (cycleLength >= 21 && cycleLength <= 45) {
      cycleLengths.push(cycleLength);
    }
  }

  return cycleLengths;
}

function calculatePossibleDateRange(cycles: MenstrualCycleItemResponseDto[]): number {
  const cycleLengths = calculateCycleLengths(cycles);
  const average =
    cycleLengths.reduce((sum, cycleLength) => sum + cycleLength, 0) / cycleLengths.length;

  const variance =
    cycleLengths.reduce((sum, cycleLength) => sum + (cycleLength - average) ** 2, 0) /
    cycleLengths.length;

  const standardDeviation = Math.sqrt(variance);

  return Math.min(5, Math.max(1, Math.round(standardDeviation)));
}

export function isDateInRange(targetDate: string, range: DateRange): boolean {
  const isAfterStart = range.startDate <= targetDate;

  const isBeforeEnd = targetDate <= range.endDate;

  return isAfterStart && isBeforeEnd;
}

export function getMenstruationDateType(
  targetDate: string,
  calendar: MenstrualCalculateCalendar["calendar"] | undefined,
): MenstruationDateType {
  if (!calendar) return undefined;

  for (const date of calendar.menstrualDates) {
    if (isDateInRange(targetDate, date)) return "menstrual";
  }

  if (calendar.possibleDate && isDateInRange(targetDate, calendar.possibleDate)) {
    return "possible";
  }

  if (calendar.predictedDate === targetDate) return "predicted";

  return undefined;
}

export function getMenstrualPhaseByDate(
  cycles: MenstrualCycleItemResponseDto[],
  targetDate: string,
): MenstrualPhase | null {
  const periods = calculateMenstrual(cycles);

  if (!periods) return null;

  const latestCycle = sortCyclesByLatest(cycles)[0];

  const cycleDay =
    differenceInCalendarDays(parseDateKey(targetDate), parseDateKey(latestCycle.start_date)) + 1;

  if (cycleDay < 1) return null;

  const menstrualEnd = periods.menstrual;

  const follicularEnd = menstrualEnd + periods.follicular;

  const ovulatoryEnd = follicularEnd + periods.ovulatory;

  const lutealEnd = ovulatoryEnd + periods.luteal;

  if (cycleDay <= menstrualEnd) {
    return "MENSTRUAL";
  }

  if (cycleDay <= follicularEnd) {
    return "FOLLICULAR";
  }

  if (cycleDay <= ovulatoryEnd) {
    return "OVULATORY";
  }

  if (cycleDay <= lutealEnd) {
    return "LUTEAL";
  }

  return null;
}

/**
 * 홈 카드에서 사용하는 표시 상태를 계산한다.
 * 생리 단계 계산과 분리해 DELAYED가 menstrual_phase 분석값에 포함되지 않도록 한다.
 */
export function getMenstrualDisplayStateByDate(
  cycles: MenstrualCycleItemResponseDto[],
  targetDate: string,
): MenstrualDisplayState | null {
  const phase = getMenstrualPhaseByDate(cycles, targetDate);

  if (phase) return phase;
  if (cycles.length === 0) return null;

  const latestCycle = sortCyclesByLatest(cycles)[0];
  const cycleDay =
    differenceInCalendarDays(parseDateKey(targetDate), parseDateKey(latestCycle.start_date)) + 1;

  if (cycleDay < 1) return null;

  const possibleEndDate = calculateMenstrualCalendar(cycles)?.calendar.possibleDate?.endDate;

  // 기존 황체기 계산이 끝나도 생리 가능일 마지막 날까지는 황체기로 표시한다.
  if (possibleEndDate && targetDate <= possibleEndDate) {
    return "LUTEAL";
  }

  // 생리 가능일이 끝난 다음 날부터 최대 주기인 45일차까지 지연 상태로 표시한다.
  if (possibleEndDate && targetDate > possibleEndDate && cycleDay <= MAX_CYCLE_DAY) {
    return "DELAYED";
  }

  return null;
}
