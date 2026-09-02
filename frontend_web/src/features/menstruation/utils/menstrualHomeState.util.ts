import { differenceInCalendarDays } from "date-fns";

import type { MenstrualPhaseDates } from "@/features/menstruation/utils/menstrualPhaseDatesCalculation.util";
import { parseDateKey } from "@/shared/utils/dateFormat";

const MAX_DELAYED_CYCLE_DAY = 45;

/** Home 전용 정책: 가능일이 지난 뒤 최대 주기 45일차까지 지연 상태다. */
export function isMenstrualCycleDelayed({
  targetDate,
  phaseDate,
}: {
  targetDate: string;
  phaseDate: MenstrualPhaseDates | null | undefined;
}): boolean {
  if (!phaseDate || targetDate <= phaseDate.possibleNextDates.endDate) return false;

  const cycleStartDate = phaseDate.phase.menstrual.recordedDates.startDate;
  const cycleDay =
    differenceInCalendarDays(parseDateKey(targetDate), parseDateKey(cycleStartDate)) + 1;

  return cycleDay > 0 && cycleDay <= MAX_DELAYED_CYCLE_DAY;
}
