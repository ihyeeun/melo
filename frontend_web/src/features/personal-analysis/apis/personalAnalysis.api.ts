import { appApiData } from "@/shared/api/apiClient";
import type {
  RecentAnalysisMode,
  RecentAnalysisRequestDto,
} from "@/shared/api/types/api.request.dto";
import type { RecentAnalysisResponseDto } from "@/shared/api/types/api.response.dto";

export function getPersonalAnalysisBymode<M extends RecentAnalysisMode>(
  body: RecentAnalysisRequestDto<M>,
) {
  return appApiData<RecentAnalysisResponseDto[M][]>({
    method: "POST",
    endpoint: "/home/recent30DaysAnalysis",
    body,
  });
}
