import { addDays, differenceInCalendarDays } from "date-fns";

import {
  calculateCycleIntervals,
  calculateMenstrualPhaseDurations,
} from "@/features/menstruation/utils/menstrualCycleCalculation.util";
import type { MenstrualCycleItemResponseDto } from "@/shared/api/types/api.response.dto";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

interface DateRange {
  startDate: string;
  endDate: string;
}

interface MenstrualPhaseDates {
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
  const sortedCycles = cycles.sort((a, b) => b.start_date.localeCompare(a.start_date));

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

    // 마지막 기록일 이후 남아 있는 예상 월경 구간
    const predictedDates: DateRange | null = !cycle.is_end
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
