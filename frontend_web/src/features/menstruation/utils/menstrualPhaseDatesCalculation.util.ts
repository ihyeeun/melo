import { addDays, differenceInCalendarDays } from "date-fns";

import type { MenstrualStatus } from "@/features/menstruation/types/menstruation.type";
import {
  calculateAverageCycleLength,
  calculateMenstrualPhaseDurations,
} from "@/features/menstruation/utils/menstrualCycleCalculation.util";
import type { MenstrualCycleContext } from "@/features/menstruation/utils/menstrualCycleContext.util";
import type { MenstrualDateRangeResponseDto } from "@/shared/api/types/api.response.dto";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface MenstrualPhaseDates {
  cycleStartDate: string;
  phase: {
    menstrual: {
      recordedDates: DateRange;
    };
    follicularDates: DateRange | null;
    ovulatoryDates: DateRange | null;
    lutealDates: DateRange | null;
  };
  predictedNextDate: string;
  hasNextMenstrualPredictionOverlap: boolean;
}

/** 과거 회차는 통계 입력으로만 사용하고, owner의 날짜별 phase 모델 하나를 만든다. */
export function calculateMenstrualPhaseDates({
  ownerCycle,
  validIntervals,
}: MenstrualCycleContext): MenstrualPhaseDates | null {
  const cycleLength = calculateAverageCycleLength(validIntervals);
  const calculation = calculateMenstrualPhaseDurations(ownerCycle, cycleLength);
  if (calculation.menstrual <= 0) return null;

  const recordedDates: DateRange = {
    startDate: ownerCycle.start_date,
    endDate: ownerCycle.end_date,
  };
  let nextPhaseDate = getNextDate(recordedDates.endDate);

  const follicularDates = calculateDateRange(nextPhaseDate, calculation.follicular);
  if (follicularDates) nextPhaseDate = getNextDate(follicularDates.endDate);

  const ovulatoryDates = calculateDateRange(nextPhaseDate, calculation.ovulatory);
  if (ovulatoryDates) nextPhaseDate = getNextDate(ovulatoryDates.endDate);

  const lutealDates = calculateDateRange(nextPhaseDate, calculation.luteal);
  const predictedNextDate = formatDateKey(
    addDays(parseDateKey(ownerCycle.start_date), cycleLength),
  );

  return {
    cycleStartDate: ownerCycle.start_date,
    phase: {
      menstrual: { recordedDates },
      follicularDates,
      ovulatoryDates,
      lutealDates,
    },
    predictedNextDate,
    hasNextMenstrualPredictionOverlap: isDateInPhaseRange(predictedNextDate, recordedDates),
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

function getNextDate(date: string): string {
  return formatDateKey(addDays(parseDateKey(date), 1));
}

/**
 * phase Dates 모델을 타입으로 변경하는 resolver.
 * latestCycleStartDate는 owner 기준 부분 이력이 아니라 전체 조회 이력의 최신 시작일이다.
 */
export function getMenstrualTypeFromPhase({
  targetDate,
  phaseDate,
  latestCycleStartDate,
}: {
  targetDate: string;
  phaseDate: MenstrualPhaseDates | undefined;
  latestCycleStartDate: string | null;
}): MenstrualStatus | null {
  if (!phaseDate) return null;

  const { menstrual, follicularDates, ovulatoryDates, lutealDates } = phaseDate.phase;
  const { recordedDates } = menstrual;

  if (isDateInPhaseRange(targetDate, recordedDates)) return "menstrual_recorded";

  if (follicularDates !== null && isDateInPhaseRange(targetDate, follicularDates))
    return "follicular";

  if (ovulatoryDates !== null && isDateInPhaseRange(targetDate, ovulatoryDates)) return "ovulatory";

  if (lutealDates !== null && isDateInPhaseRange(targetDate, lutealDates)) return "luteal";

  // 과거 회차이거나 현재 월경 구간과 겹치는 다음 예측은 노출하지 않는다.
  if (
    phaseDate.cycleStartDate !== latestCycleStartDate ||
    phaseDate.hasNextMenstrualPredictionOverlap
  )
    return null;

  // 다음 기록이 없으면 예정일 이후 ~ 마지막 월경 시작일 + 45일까지 '월경 시작 예상' 상태를 유지한다.
  const cycleDay =
    differenceInCalendarDays(parseDateKey(targetDate), parseDateKey(phaseDate.cycleStartDate)) + 1;

  // 예상일 당일부터 해당 회차의 45일 차까지만 표시
  if (targetDate >= phaseDate.predictedNextDate && cycleDay <= 45) {
    return "next_predicted";
  }

  return null;
}

function isDateInPhaseRange(targetDate: string, range: DateRange): boolean {
  return range.startDate <= targetDate && targetDate <= range.endDate;
}

/** 캘린더에는 모든 실제 기록과 최신 회차의 다음 예상일 하루만 표시한다. */
export function getMenstrualCalendarStatus({
  targetDate,
  cycles,
  latestPhaseDate,
}: {
  targetDate: string;
  cycles: readonly MenstrualDateRangeResponseDto[];
  latestPhaseDate: MenstrualPhaseDates | null;
}): MenstrualStatus | null {
  if (cycles.some((cycle) => cycle.start_date <= targetDate && targetDate <= cycle.end_date)) {
    return "menstrual_recorded";
  }
  if (
    latestPhaseDate &&
    !latestPhaseDate.hasNextMenstrualPredictionOverlap &&
    targetDate === latestPhaseDate.predictedNextDate
  )
    return "next_predicted";
  return null;
}

export function getMenstrualPhaseDayInfo(
  targetDate: string,
  phaseDate: MenstrualPhaseDates | null,
) {
  if (!phaseDate) return { menstrualDay: null, daysUntilNext: null };
  const selectedDate = parseDateKey(targetDate);
  const recordedDates = phaseDate.phase.menstrual.recordedDates;
  return {
    menstrualDay: isDateInPhaseRange(targetDate, recordedDates)
      ? differenceInCalendarDays(selectedDate, parseDateKey(recordedDates.startDate)) + 1
      : null,
    daysUntilNext: differenceInCalendarDays(
      parseDateKey(phaseDate.predictedNextDate),
      selectedDate,
    ),
  };
}
