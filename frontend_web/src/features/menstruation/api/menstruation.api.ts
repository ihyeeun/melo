import type {
  getCyclesRequest,
  MenstruationCyclesResponse,
} from "@/features/menstruation/types/menstruation.type";
import { webApiData } from "@/shared/api/apiClient";

export async function getMenstruationCycles({ date, limit }: getCyclesRequest) {
  const response = await webApiData<MenstruationCyclesResponse>({
    endpoint: "/menstrual-cycles",
    method: "POST",
    params: { date, limit },
  });

  return response;
}
