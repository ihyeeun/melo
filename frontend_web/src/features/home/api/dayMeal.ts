import { dayMealSummary } from "@/features/home/utils/dayMealSummary";
import { appApiData } from "@/shared/api/apiClient";
import type { DateRequestDto, MealRecordResponseDto } from "@/shared/api/types/api.dto";

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
