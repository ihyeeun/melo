import type { CalendarViewMode } from "@/features/calendar/types/calendar.types";
import type { MonthlyCalendarRequestDto } from "@/shared/api/types/api.request.dto";

export const queryKeys = {
  recordedDates: {
    all: ["calendar", "recorded-dates"] as const,
    range: (startDate: string, endDate: string) =>
      ["calendar", "recorded-dates", startDate, endDate] as const,
  },
} as const;

export const calendarKeys = {
  all: ["calendar"] as const,

  monthly: {
    all: () => [...calendarKeys.all, "monthly"] as const,
    mode: (mode: CalendarViewMode) => [...calendarKeys.monthly.all(), { mode }] as const,
    month: ({ mode, date }: MonthlyCalendarRequestDto) =>
      [...calendarKeys.monthly.mode(mode), { date }] as const,
  },
};
