import { useEffect, useMemo } from "react";

import { useMenstrualHistoryInfiniteQuery } from "@/features/menstruation/hooks/queries/menstruation.query";
import {
  calculateMenstrualPhaseDateForContext,
  MAX_CALCULATION_CYCLES,
  selectMenstrualCycleContext,
} from "@/features/menstruation/utils/menstrualCycleContext.util";
import type { MenstrualCycleItemResponseDto } from "@/shared/api/types/api.response.dto";

const EMPTY_CYCLES: MenstrualCycleItemResponseDto[] = [];

type MenstrualHistoryCoverageStatus = "pending" | "ready" | "no-history" | "error";

/** targetDate의 owner 회차와 계산 이력이 준비될 때까지 공통 history cache를 확장한다. */
export function useMenstrualHistoryCoverage({
  targetDate,
  enabled = true,
}: {
  targetDate: string;
  enabled?: boolean;
}) {
  const historyQuery = useMenstrualHistoryInfiniteQuery({ enabled });
  const { fetchNextPage, isFetchNextPageError, isFetchingNextPage } = historyQuery;
  const cycles = historyQuery.data?.cycles ?? EMPTY_CYCLES;

  const context = useMemo(
    () => selectMenstrualCycleContext({ rawCycles: cycles, targetDate }),
    [cycles, targetDate],
  );

  const needsMoreHistory =
    historyQuery.hasNextPage === true &&
    (context === null || context.calculationCycles.length < MAX_CALCULATION_CYCLES);

  useEffect(() => {
    if (!enabled || !needsMoreHistory) return;
    if (isFetchingNextPage || isFetchNextPageError) return;

    void fetchNextPage({ cancelRefetch: false });
  }, [
    enabled,
    fetchNextPage,
    isFetchNextPageError,
    isFetchingNextPage,
    needsMoreHistory,
  ]);

  const phaseDate = useMemo(() => {
    if (!historyQuery.isSuccess || needsMoreHistory || context === null) return null;
    return calculateMenstrualPhaseDateForContext(context);
  }, [context, historyQuery.isSuccess, needsMoreHistory]);

  const hasContextError =
    historyQuery.isError || (needsMoreHistory && historyQuery.isFetchNextPageError);

  const status: MenstrualHistoryCoverageStatus = hasContextError
    ? "error"
    : !enabled || historyQuery.isPending || needsMoreHistory
      ? "pending"
      : context === null
        ? "no-history"
        : phaseDate === null
          ? "error"
          : "ready";

  return {
    status,
    cycles,
    ownerCycle: status === "ready" ? (context?.ownerCycle ?? null) : null,
    phaseDate: status === "ready" ? phaseDate : null,
    isContextPending: status === "pending",
    isContextReady: status === "ready" || status === "no-history",
  };
}
