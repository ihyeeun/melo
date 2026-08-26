import { addDays } from "date-fns";

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
    menstrual: DateRange;
    follicular: DateRange | null;
    ovulatory: DateRange | null;
    luteal: DateRange | null;
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
    const calculation = calculateMenstrualPhaseDurations(cyclesForCalculation, cycle.cycle_id);

    if (!calculation) continue;

    const menstrual = calculateDateRange(cycle.start_date, calculation.menstrual);
    if (!menstrual) continue;

    let nextPhaseDate = getNextDate(menstrual.endDate);

    const follicular = calculateDateRange(nextPhaseDate, calculation.follicular);
    if (follicular) nextPhaseDate = getNextDate(follicular.endDate);

    const ovulatory = calculateDateRange(nextPhaseDate, calculation.ovulatory);
    if (ovulatory) nextPhaseDate = getNextDate(ovulatory.endDate);

    const luteal = calculateDateRange(nextPhaseDate, calculation.luteal);

    const predictedNextDate = formatDateKey(
      addDays(parseDateKey(cycle.start_date), calculation.cycle),
    );
    const possibleNextDates = calculatePossibleDateRange(cyclesForCalculation, predictedNextDate);

    result.push({
      cycleId: cycle.cycle_id,
      phase: {
        menstrual,
        follicular,
        ovulatory,
        luteal,
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
