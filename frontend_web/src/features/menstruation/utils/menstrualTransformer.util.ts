import { subDays } from "date-fns";

import { sortCyclesByLatest } from "@/features/menstruation/utils/menstrualCycleCalculation.util";
import type {
  MenstrualCycleItemResponseDto,
  MenstrualCyclesResponseDto,
} from "@/shared/api/types/api.response.dto";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

interface MenstrualHistoryPage {
  cycles: MenstrualCycleItemResponseDto[];
  nextTargetDate: string | null;
}

export function transformMenstrualCyclesResponse(
  res: MenstrualCyclesResponseDto,
  limit: number,
): MenstrualHistoryPage {
  const sortedCycles = sortCyclesByLatest(res.cycles);

  const oldestCycle = sortedCycles.at(-1);

  const nextTargetDate =
    sortedCycles.length === limit && oldestCycle
      ? formatDateKey(subDays(parseDateKey(oldestCycle.start_date), 1))
      : null;

  return { cycles: sortedCycles, nextTargetDate };
}
