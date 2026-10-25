import { useQuery } from "@tanstack/react-query";

import { getPersonalAnalysisBymode } from "@/features/personal-analysis/apis/personalAnalysis.api";
import { personalAnalysisKeys } from "@/features/personal-analysis/constants/personalAnalysis.constant";
import type {
  RecentAnalysisMode,
  RecentAnalysisRequestDto,
} from "@/shared/api/types/api.request.dto";

export function usePersonalAnalysisByModeQuery<M extends RecentAnalysisMode>(
  body: RecentAnalysisRequestDto<M>,
  enabled?: boolean,
) {
  return useQuery({
    queryKey: personalAnalysisKeys.mode(body),
    queryFn: () => getPersonalAnalysisBymode(body),
    enabled,
  });
}
