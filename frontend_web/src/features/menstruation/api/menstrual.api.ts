import { appApiData } from "@/shared/api/apiClient";
import type {
  GetMenstrualRecordsRequestDto,
  SaveMenstrualRecordsRequestDto,
} from "@/shared/api/types/api.request.dto";
import type { MenstrualRecordsResponseDto } from "@/shared/api/types/api.response.dto";

export async function getMenstrualHistory(body: GetMenstrualRecordsRequestDto) {
  const response = await appApiData<MenstrualRecordsResponseDto>({
    method: "POST",
    endpoint: "/menstrual/records",
    body,
  });

  return response;
}

export async function updateMenstrualRecords(body: SaveMenstrualRecordsRequestDto) {
  await appApiData({
    method: "POST",
    endpoint: "/menstrual/records/save",
    body,
  });
}
