import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";

import type { CalendarDay, ViewMode } from "../types/calendar.types";

export function getWeekDates(baseDate: Date, weekStartsOn: 0 | 1 = 1) {
  const start = startOfWeek(baseDate, { weekStartsOn });

  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function getMonthDates(baseDate: Date, weekStartsOn: 0 | 1 = 1) {
  const monthStart = startOfMonth(baseDate);
  const monthEnd = endOfMonth(baseDate);

  const calendarStart = startOfWeek(monthStart, { weekStartsOn });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });

  const dates: Date[] = [];
  let current = calendarStart;

  while (current <= calendarEnd) {
    dates.push(current);
    current = addDays(current, 1);
  }

  return dates;
}

export function buildWeekCalendarDays({
  baseDate,
  selectedDate,
  weekStartsOn = 1,
}: {
  baseDate: Date;
  selectedDate?: Date;
  weekStartsOn?: 0 | 1;
}): CalendarDay[] {
  return getWeekDates(baseDate, weekStartsOn).map((date) => {
    return {
      date,
      isToday: isToday(date),
      isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
      isCurrentMonth: isSameMonth(date, baseDate),
    };
  });
}

export function buildMonthCalendarDays({
  baseDate,
  selectedDate,
  weekStartsOn = 1,
}: {
  baseDate: Date;
  selectedDate?: Date;
  weekStartsOn?: 0 | 1;
}): CalendarDay[] {
  return getMonthDates(baseDate, weekStartsOn).map((date) => {
    return {
      date,
      isToday: isToday(date),
      isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
      isCurrentMonth: isSameMonth(date, baseDate),
    };
  });
}

export function movePrev(date: Date, viewMode: ViewMode) {
  return viewMode === "week" ? subWeeks(date, 1) : subMonths(date, 1);
}

export function moveNext(date: Date, viewMode: ViewMode) {
  return viewMode === "week" ? addWeeks(date, 1) : addMonths(date, 1);
}
