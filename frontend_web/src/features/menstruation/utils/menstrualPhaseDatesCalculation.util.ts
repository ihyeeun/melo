import { addDays, differenceInCalendarDays } from "date-fns";

import type { MenstrualStatus } from "@/features/menstruation/types/menstruation.type";
import {
  calculateAverageCycleLength,
  calculateMenstrualPhaseDurations,
} from "@/features/menstruation/utils/menstrualCycleCalculation.util";
import {
  type MenstrualCycleContext,
  selectMenstrualCycleContext,
} from "@/features/menstruation/utils/menstrualCycleContext.util";
import type { MenstrualDateRangeResponseDto } from "@/shared/api/types/api.response.dto";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

const PREDICTED_MENSTRUAL_DAYS = 5;
const PREDICTION_MATCH_TOLERANCE_DAYS = 5;

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface MenstrualPhaseDates {
  cycleStartDate: string;
  phase: {
    menstrual: {
      dates: DateRange;
      source: "recorded" | "predicted";
    };
    follicularDates: DateRange | null;
    ovulatoryDates: DateRange | null;
    lutealDates: DateRange | null;
  };
  nextCycleStartDate: string;
}

/**
 * 두 실제 기록 사이 또는 최신 기록 이후에서 선택 날짜가 속한 회차를 계산한다.
 * 미기록 회차는 예상 상태 5일 뒤 다음 단계로 이어지며, 실제 기록·통계에 추가하지 않는다.
 */
export function calculateMenstrualPhaseDates(
  { ownerCycle, nextCycle, validIntervals }: MenstrualCycleContext,
  targetDate = ownerCycle.start_date,
): MenstrualPhaseDates | null {
  if (
    targetDate < ownerCycle.start_date ||
    (nextCycle && targetDate >= nextCycle.start_date)
  ) return null;

  const averageCycleLength = calculateAverageCycleLength(validIntervals);
  const ownerStart = parseDateKey(ownerCycle.start_date);
  const recordedMenstrualDays = differenceInCalendarDays(
    parseDateKey(ownerCycle.end_date),
    ownerStart,
  ) + 1;
  if (recordedMenstrualDays <= 0) return null;

  // 실제 기록이 다음 예상일까지 이어지는 경우에는 겹치는 예상 회차를 만들지 않는다.
  const canProject = recordedMenstrualDays <= averageCycleLength;
  // 실제 시작일의 ±5일에 해당하는 예상 회차는 실제 회차로 대체한다.
  // 그보다 앞선 미기록 회차들은 5일 표시를 유지하고 마지막 회차의 끝만 보정한다.
  const lastProjectedIndex = !canProject
    ? 0
    : nextCycle
      ? Math.max(0, Math.ceil((differenceInCalendarDays(
          parseDateKey(nextCycle.start_date),
          ownerStart,
        ) - PREDICTION_MATCH_TOLERANCE_DAYS) / averageCycleLength) - 1)
      : Infinity;
  const cycleIndex = Math.min(
    Math.floor(differenceInCalendarDays(parseDateKey(targetDate), ownerStart) / averageCycleLength),
    lastProjectedIndex,
  );
  const cycleStartDate = formatDateKey(addDays(ownerStart, cycleIndex * averageCycleLength));
  const nextCycleStartDate = nextCycle && cycleIndex === lastProjectedIndex
    ? nextCycle.start_date
    : formatDateKey(addDays(ownerStart, (cycleIndex + 1) * averageCycleLength));
  const isPredicted = cycleIndex > 0;
  const menstrualDates: DateRange = {
    startDate: cycleStartDate,
    endDate: isPredicted
      ? formatDateKey(addDays(parseDateKey(cycleStartDate), PREDICTED_MENSTRUAL_DAYS - 1))
      : ownerCycle.end_date,
  };
  const calculation = calculateMenstrualPhaseDurations(
    isPredicted ? PREDICTED_MENSTRUAL_DAYS : recordedMenstrualDays,
    differenceInCalendarDays(parseDateKey(nextCycleStartDate), parseDateKey(cycleStartDate)),
  );
  let nextPhaseDate = getNextDate(menstrualDates.endDate);

  const follicularDates = calculateDateRange(nextPhaseDate, calculation.follicular);
  if (follicularDates) nextPhaseDate = getNextDate(follicularDates.endDate);

  const ovulatoryDates = calculateDateRange(nextPhaseDate, calculation.ovulatory);
  if (ovulatoryDates) nextPhaseDate = getNextDate(ovulatoryDates.endDate);

  const lutealDates = calculateDateRange(nextPhaseDate, calculation.luteal);
  return {
    cycleStartDate,
    phase: {
      menstrual: { dates: menstrualDates, source: isPredicted ? "predicted" : "recorded" },
      follicularDates,
      ovulatoryDates,
      lutealDates,
    },
    nextCycleStartDate,
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

/** 선택 날짜의 실제·예상 회차 모델을 기존 홈 화면 상태로 변환한다. */
export function getMenstrualTypeFromPhase({
  targetDate,
  phaseDate,
}: {
  targetDate: string;
  phaseDate: MenstrualPhaseDates | undefined;
}): MenstrualStatus | null {
  if (!phaseDate) return null;

  const { menstrual, follicularDates, ovulatoryDates, lutealDates } = phaseDate.phase;
  if (isDateInPhaseRange(targetDate, menstrual.dates)) {
    return menstrual.source === "recorded" ? "menstrual_recorded" : "next_predicted";
  }

  if (follicularDates !== null && isDateInPhaseRange(targetDate, follicularDates))
    return "follicular";

  if (ovulatoryDates !== null && isDateInPhaseRange(targetDate, ovulatoryDates)) return "ovulatory";

  if (lutealDates !== null && isDateInPhaseRange(targetDate, lutealDates)) return "luteal";

  return null;
}

function isDateInPhaseRange(targetDate: string, range: DateRange): boolean {
  return range.startDate <= targetDate && targetDate <= range.endDate;
}

/** 실제 기록과 각 미기록 회차의 예상 시작일만 표시한다. 예상 5일은 기록으로 칠하지 않는다. */
export function getMenstrualCalendarStatus({
  targetDate,
  cycles,
  showPredictions = true,
}: {
  targetDate: string;
  cycles: readonly MenstrualDateRangeResponseDto[];
  showPredictions?: boolean;
}): MenstrualStatus | null {
  if (cycles.some((cycle) => cycle.start_date <= targetDate && targetDate <= cycle.end_date)) {
    return "menstrual_recorded";
  }
  if (!showPredictions) return null;
  const context = selectMenstrualCycleContext({ cycles, targetDate });
  const phaseDate = context ? calculateMenstrualPhaseDates(context, targetDate) : null;
  return phaseDate?.phase.menstrual.source === "predicted" &&
    targetDate === phaseDate.cycleStartDate
    ? "next_predicted"
    : null;
}

export function getMenstrualPhaseDayInfo(
  targetDate: string,
  phaseDate: MenstrualPhaseDates | null,
) {
  if (!phaseDate) return { menstrualDay: null, daysUntilNext: null };
  const selectedDate = parseDateKey(targetDate);
  const menstrual = phaseDate.phase.menstrual;
  return {
    menstrualDay: menstrual.source === "recorded" && isDateInPhaseRange(targetDate, menstrual.dates)
      ? differenceInCalendarDays(selectedDate, parseDateKey(menstrual.dates.startDate)) + 1
      : null,
    daysUntilNext: differenceInCalendarDays(
      parseDateKey(phaseDate.nextCycleStartDate),
      selectedDate,
    ),
  };
}
