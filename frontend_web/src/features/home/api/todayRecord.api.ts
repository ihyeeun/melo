import { dayMealSummary } from "@/features/home/utils/dayMealSummary";
import { appApiData } from "@/shared/api/apiClient";
import type {
  MealRecordResponseDto,
  WeightStepsResponseDto,
} from "@/shared/api/types/api.response.dto";

export async function getTodayMealRecordMenus(date: string) {
  const response = await appApiData<MealRecordResponseDto>({
    endpoint: "/home/getMealRecord",
    method: "POST",
    body: { date: date },
  });

  return dayMealSummary(response);
}

export async function getTodayRecordBodyStats(date: string) {
  const response = await appApiData<WeightStepsResponseDto>({
    endpoint: "/home/weightSteps",
    method: "POST",
    body: { date: date },
  });

  return response;
}

export async function registerWeight({ date, weight }: { date: string; weight: number }) {
  await appApiData({
    endpoint: "/home/registerWeight",
    method: "POST",
    body: {
      date,
      weight,
    },
  });
}

export async function registerStep({ date, steps }: { date: string; steps: number }) {
  await appApiData({
    endpoint: "/home/registerSteps",
    method: "POST",
    body: {
      date,
      steps,
    },
  });
}
