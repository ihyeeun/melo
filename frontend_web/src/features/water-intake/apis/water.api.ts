import { appApiData } from "@/shared/api/apiClient";
import type { UpsertWaterIntakeRequestDto } from "@/shared/api/types/api.request.dto";
import { type WaterIntakeResponseDto } from "@/shared/api/types/api.response.dto";

export async function getWaterIntake(date: string) {
  const response = await appApiData<WaterIntakeResponseDto>({
    method: "POST",
    endpoint: "/home/water",
    body: { date },
  });

  return response;
}

export async function registerWaterIntake(body: UpsertWaterIntakeRequestDto) {
  await appApiData({
    method: "POST",
    endpoint: "/home/water/register",
    body,
  });
}

export async function registerWaterCupSize(cup: number) {
  await appApiData({
    method: "POST",
    endpoint: "/home/water/cup-size",
    body: { cup_size: cup },
  });
}
