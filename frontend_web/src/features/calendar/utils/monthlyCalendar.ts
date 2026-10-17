import type { CalendarViewMode } from "@/features/calendar/types/calendar.types";
import type { MonthlyCalendarResponseDto } from "@/shared/api/types/api.response.dto";

export const MONTHLY_RECORD_MODES = [
  { value: "intake", label: "섭취 칼로리" },
  { value: "workout", label: "운동 소모 칼로리" },
  { value: "weight", label: "체중" },
  { value: "water", label: "물 섭취" },
] as const;

export function formatMonthlyCalendarRecord(
  record: MonthlyCalendarResponseDto | undefined,
  mode: CalendarViewMode,
): string | undefined {
  if (!record) return undefined;

  const value = {
    intake: "calories" in record ? record.calories : undefined,
    workout: "burned_calories" in record ? record.burned_calories : undefined,
    weight: "weight" in record ? record.weight : undefined,
    water: "water_intake" in record ? record.water_intake : undefined,
  }[mode];

  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;

  switch (mode) {
    case "intake":
      return `+${Math.round(value)}`;
    case "workout":
      return `-${Math.round(Math.abs(value))}`;
    case "weight":
      return `${value.toFixed(1)}kg`;
    case "water":
      return `${(value / 1000).toFixed(2)}L`;
  }
}
