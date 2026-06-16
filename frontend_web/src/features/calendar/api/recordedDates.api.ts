import { appApiData } from "@/shared/api/apiClient";
import type { MealRecordedDatesResponseDto } from "@/shared/api/types/api.response.dto";

const END_POINT = {
  MEAL_RECORDED_DATES: "/home/getMealRecordedDates",
};

interface MealRecordedDatesRequestDto {
  startDate: string;
  endDate: string;
}

export async function getMealRecordedDates(body: MealRecordedDatesRequestDto) {
  const response = await appApiData<MealRecordedDatesResponseDto>({
    endpoint: END_POINT.MEAL_RECORDED_DATES,
    method: "POST",
    body,
  });

  return response["recorded-dates"];
}
