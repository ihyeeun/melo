import type { RecentAnalysisRequestDto } from "@/shared/api/types/api.request.dto";

export const personalAnalysisKeys = {
  all: ["recent-analysis"],
  mode: ({ date, mode }: RecentAnalysisRequestDto) =>
    [...personalAnalysisKeys.all, mode, date] as const,
};
