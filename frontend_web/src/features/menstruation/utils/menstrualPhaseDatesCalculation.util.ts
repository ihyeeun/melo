import { addDays, differenceInCalendarDays } from "date-fns";

import type { MenstrualStatus } from "@/features/menstruation/types/menstruation.type";
import {
  calculateCycleIntervals,
  calculateMenstrualPhaseDurations,
} from "@/features/menstruation/utils/menstrualCycleCalculation.util";
import type { MenstrualCycleItemResponseDto } from "@/shared/api/types/api.response.dto";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface MenstrualPhaseDates {
  cycleId: number;
  phase: {
    menstrual: {
      recordedDates: DateRange;
      predictedDates: DateRange | null;
    };
    follicularDates: DateRange | null;
    ovulatoryDates: DateRange | null;
    lutealDates: DateRange | null;
  };
  predictedNextDate: string;
  possibleNextDates: DateRange;
}

/** 각 회차별 날짜 모델 배열 */
export function calculateMenstrualPhaseDates(
  cycles: MenstrualCycleItemResponseDto[],
): MenstrualPhaseDates[] | null {
  if (cycles.length === 0) return null;
  const sortedCycles = [...cycles].sort((a, b) => b.start_date.localeCompare(a.start_date));

  const result: MenstrualPhaseDates[] = [];

  for (let idx = 0; idx < sortedCycles.length; ++idx) {
    const cycle = sortedCycles[idx];
    const cyclesForCalculation = sortedCycles.slice(idx, idx + 7);
    const calculation = calculateMenstrualPhaseDurations(cyclesForCalculation);

    if (!calculation) continue;

    const menstrual = calculateDateRange(cycle.start_date, calculation.menstrual);
    if (!menstrual) continue;

    // 실제 기록된 지속 월경 구간
    const recordedDates: DateRange = {
      startDate: cycle.start_date,
      endDate: cycle.end_date,
    };

    // 새 회차의 첫 기록일에만 이후 예상 월경 구간을 보여준다.
    const shouldShowPredictedDates =
      !cycle.is_end && recordedDates.startDate === recordedDates.endDate;
    const predictedDates: DateRange | null = shouldShowPredictedDates
      ? calculateDateRange(
          getNextDate(recordedDates.endDate),
          differenceInCalendarDays(
            parseDateKey(menstrual.endDate),
            parseDateKey(recordedDates.endDate),
          ),
        )
      : null;

    let nextPhaseDate = getNextDate(menstrual.endDate);

    const follicularDates = calculateDateRange(nextPhaseDate, calculation.follicular);
    if (follicularDates) nextPhaseDate = getNextDate(follicularDates.endDate);

    const ovulatoryDates = calculateDateRange(nextPhaseDate, calculation.ovulatory);
    if (ovulatoryDates) nextPhaseDate = getNextDate(ovulatoryDates.endDate);

    const lutealDates = calculateDateRange(nextPhaseDate, calculation.luteal);

    const predictedNextDate = formatDateKey(
      addDays(parseDateKey(cycle.start_date), calculation.cycle),
    );
    const possibleNextDates = calculatePossibleDateRange(cyclesForCalculation, predictedNextDate);

    result.push({
      cycleId: cycle.cycle_id,
      phase: {
        menstrual: {
          recordedDates,
          predictedDates,
        },
        follicularDates,
        ovulatoryDates,
        lutealDates,
      },
      predictedNextDate,
      possibleNextDates,
    });
  }

  return result.length > 0 ? result : null;
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

function calculatePossibleDateRange(
  cycles: MenstrualCycleItemResponseDto[],
  predictedDate: string,
): DateRange {
  const cycleLengths = calculateCycleIntervals(cycles).filter((day) => day >= 21 && day <= 45);

  if (cycleLengths.length < 2) {
    const len = 2;
    return {
      startDate: formatDateKey(addDays(parseDateKey(predictedDate), -len)),
      endDate: formatDateKey(addDays(parseDateKey(predictedDate), len)),
    };
  }

  const average =
    cycleLengths.reduce((sum, cycleLength) => sum + cycleLength, 0) / cycleLengths.length;

  const variance =
    cycleLengths.reduce((sum, cycleLength) => sum + (cycleLength - average) ** 2, 0) /
    cycleLengths.length;

  const standardDeviation = Math.sqrt(variance);

  const len = Math.min(5, Math.max(1, Math.round(standardDeviation)));

  return {
    startDate: formatDateKey(addDays(parseDateKey(predictedDate), -len)),
    endDate: formatDateKey(addDays(parseDateKey(predictedDate), len)),
  };
}

/**
 * phase Dates 모델을 타입으로 변경하는 resolver.
 * latestCycleId는 owner 기준 부분 이력이 아니라 전체 조회 이력의 최신 회차 ID여야 한다.
 */
export function getMenstrualTypeFromPhase({
  targetDate,
  phaseDate,
  latestCycleId,
}: {
  targetDate: string;
  phaseDate: MenstrualPhaseDates | undefined;
  latestCycleId: number | null;
}): MenstrualStatus | null {
  if (!phaseDate) return null;

  const { menstrual, follicularDates, ovulatoryDates, lutealDates } = phaseDate.phase;
  const { recordedDates, predictedDates } = menstrual;

  if (isDateInPhaseRange(targetDate, recordedDates)) return "menstrual_recorded";

  if (predictedDates !== null && isDateInPhaseRange(targetDate, predictedDates))
    return "menstrual_predicted";

  if (follicularDates !== null && isDateInPhaseRange(targetDate, follicularDates))
    return "follicular";

  if (ovulatoryDates !== null && isDateInPhaseRange(targetDate, ovulatoryDates)) return "ovulatory";

  if (lutealDates !== null && isDateInPhaseRange(targetDate, lutealDates)) return "luteal";

  // 다음 월경 예측은 이미 다음 실제 회차가 존재하는 과거 회차에는 노출하지 않는다.
  if (phaseDate.cycleId !== latestCycleId) return null;

  if (targetDate === phaseDate.predictedNextDate) return "next_predicted";

  if (isDateInPhaseRange(targetDate, phaseDate.possibleNextDates)) return "next_possible";

  return null;
}

function isDateInPhaseRange(
  targetDate: string,
  range: {
    startDate: string;
    endDate: string;
  },
) {
  return range.startDate <= targetDate && targetDate <= range.endDate;
}
