import { appApiData } from "@/shared/api/apiClient";
import type { RegisterMealRequestDto } from "@/shared/api/types/api.dto";

const END_POINT = {
  MEAL_REGISTER: "/home/registerMeal",
};

export async function postTodayMealRecordRegister(body: RegisterMealRequestDto) {
  const response = await appApiData({
    endpoint: END_POINT.MEAL_REGISTER,
    method: "POST",
    body,
  });

  return response;
}
