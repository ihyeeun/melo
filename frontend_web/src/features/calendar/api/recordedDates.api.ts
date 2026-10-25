import type { CalendarViewMode } from "@/features/calendar/types/calendar.types";
import { appApiData } from "@/shared/api/apiClient";
import type { MonthlyCalendarRequestDto } from "@/shared/api/types/api.request.dto";
import type {
  MealRecordedDatesResponseDto,
  MonthlyCalendarResponseDto,
} from "@/shared/api/types/api.response.dto";

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

export async function getMonthlyCalendarMode<M extends CalendarViewMode>(
  body: MonthlyCalendarRequestDto<M>,
) {
  const response = await appApiData<MonthlyCalendarResponseDto<M>[]>({
    endpoint: "/home/monthlyCalendar",
    method: "POST",
    body,
  });

  return response;
}
