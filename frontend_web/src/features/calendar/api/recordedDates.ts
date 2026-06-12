import { appApiData } from "@/shared/api/apiClient";
import type {
  MealRecordedDatesRequestDto,
  MealRecordedDatesResponseDto,
} from "@/shared/api/types/api.dto";

const END_POINT = {
  MEAL_RECORDED_DATES: "/home/getMealRecordedDates",
};

export async function getMealRecordedDates(body: MealRecordedDatesRequestDto) {
  const response = await appApiData<MealRecordedDatesResponseDto>({
    endpoint: END_POINT.MEAL_RECORDED_DATES,
    method: "POST",
    body,
  });

  return response["recorded-dates"];
}
