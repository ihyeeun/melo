import { dayMealSummary } from "@/features/home/utils/dayMealSummary";
import { appApiData } from "@/shared/api/apiClient";
import type { DateRequestDto } from "@/shared/api/types/api.dto";
import type { MealRecordResponseDto } from "@/shared/api/types/api.response.dto";

const END_POINT = {
  DAY_MEALS: "/home/getMealRecord",
};

export async function getDayMeals(date: DateRequestDto) {
  const response = await appApiData<MealRecordResponseDto>({
    endpoint: END_POINT.DAY_MEALS,
    method: "POST",
    body: date,
  });

  return dayMealSummary(response);
}
