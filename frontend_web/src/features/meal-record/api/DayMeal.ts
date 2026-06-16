import { appApiData } from "@/shared/api/apiClient";
import type { DeleteMealRequestDto, RegisterMealRequestDto } from "@/shared/api/types/api.dto";

const END_POINT = {
  MEAL_REGISTER: "/home/registerMeal",
  MEAL_DELETE: "/home/deleteMeal",
};

export async function postTodayMealRecordRegister(body: RegisterMealRequestDto) {
  const response = await appApiData({
    endpoint: END_POINT.MEAL_REGISTER,
    method: "POST",
    body,
  });

  return response;
}

export async function deleteTodayMealRecord(body: DeleteMealRequestDto) {
  await appApiData({
    endpoint: END_POINT.MEAL_DELETE,
    method: "POST",
    body,
  });
}
