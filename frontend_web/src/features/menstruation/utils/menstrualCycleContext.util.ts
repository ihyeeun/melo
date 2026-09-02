import {
  calculateMenstrualPhaseDates,
  type MenstrualPhaseDates,
} from "@/features/menstruation/utils/menstrualPhaseDatesCalculation.util";
import type { MenstrualCycleItemResponseDto } from "@/shared/api/types/api.response.dto";

export const MAX_CALCULATION_CYCLES = 7;

export interface MenstrualCycleContext {
  ownerCycle: MenstrualCycleItemResponseDto;
  calculationCycles: MenstrualCycleItemResponseDto[];
}

/** 여러 페이지에서 조회한 회차를 ID 기준으로 합치고 최신순으로 정렬한다. */
export function normalizeMenstrualCycles(
  rawCycles: readonly MenstrualCycleItemResponseDto[],
): MenstrualCycleItemResponseDto[] {
  const cycleById = new Map<number, MenstrualCycleItemResponseDto>();

  for (const cycle of rawCycles) {
    // 무한 조회 페이지가 겹치면 같은 회차가 들어올 수 있어 먼저 받은 값만 유지한다.
    if (cycleById.has(cycle.cycle_id)) continue;

    cycleById.set(cycle.cycle_id, cycle);
  }

  return [...cycleById.values()].sort((a, b) => b.start_date.localeCompare(a.start_date));
}

/** ownerCycle 찾기, owner부터 과거 최대 7회 선택 */
export function selectMenstrualCycleContext({
  rawCycles,
  targetDate,
}: {
  rawCycles: readonly MenstrualCycleItemResponseDto[];
  targetDate: string;
}): MenstrualCycleContext | null {
  const cycles = normalizeMenstrualCycles(rawCycles);

  const ownerCycle = findMenstrualOwnerCycle(cycles, targetDate);
  if (!ownerCycle) return null;

  const ownerIndex = cycles.indexOf(ownerCycle);

  return {
    ownerCycle,
    calculationCycles: cycles.slice(ownerIndex, ownerIndex + MAX_CALCULATION_CYCLES),
  };
}

/** 최신순으로 정렬된 history에서 targetDate 직전의 가장 가까운 회차를 찾는다. */
export function findMenstrualOwnerCycle(
  sortedCycles: readonly MenstrualCycleItemResponseDto[],
  targetDate: string,
): MenstrualCycleItemResponseDto | null {
  return sortedCycles.find((cycle) => cycle.start_date <= targetDate) ?? null;
}

/** 이미 선택한 owner context에서 해당 회차의 날짜별 phase 모델을 찾는다. */
export function calculateMenstrualPhaseDateForContext(
  context: MenstrualCycleContext,
): MenstrualPhaseDates | null {
  const phaseDates = calculateMenstrualPhaseDates(context.calculationCycles) ?? [];
  const phaseDate = phaseDates.find(
    (candidate) => candidate.cycleId === context.ownerCycle.cycle_id,
  );

  return phaseDate ?? null;
}
