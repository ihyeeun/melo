import { startOfWeek, subWeeks } from "date-fns";
import { useMemo, useState } from "react";

import {
  buildMonthCalendarDays,
  buildWeekCalendarDays,
  moveNext,
  movePrev,
} from "@/features/calendar/utils/calendar";

import type { ViewMode } from "../types/calendar.types";

type UseCalendarParams = {
  initialDate?: Date;
  initialViewMode?: ViewMode;
  recordedDates?: string[];
};

type SelectDateOptions = {
  switchToWeek?: boolean;
};

export function useCalendar({
  initialDate = new Date(),
  initialViewMode = "week",
  recordedDates = [],
}: UseCalendarParams = {}) {
  const weekStartsOn = 1 as const;
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [viewDate, setViewDate] = useState(initialDate);

  const weekDays = useMemo(() => {
    return buildWeekCalendarDays({
      baseDate: viewDate,
      selectedDate,
      recordedDates,
      weekStartsOn,
    });
  }, [viewDate, selectedDate, recordedDates, weekStartsOn]);

  const monthDays = useMemo(() => {
    return buildMonthCalendarDays({
      baseDate: viewDate,
      selectedDate,
      recordedDates,
      weekStartsOn,
    });
  }, [viewDate, selectedDate, recordedDates, weekStartsOn]);

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "week" ? "month" : "week"));
    setViewDate(selectedDate);
  };

  const selectDate = (date: Date, { switchToWeek = false }: SelectDateOptions = {}) => {
    setSelectedDate(date);
    setViewDate(date);

    if (switchToWeek) {
      setViewMode("week");
    }
  };

  const clampWeekNavigationDate = (candidateDate: Date, currentDate: Date) => {
    const candidateWeekStart = startOfWeek(candidateDate, { weekStartsOn });
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn });
    const previousWeekStart = subWeeks(currentWeekStart, 1);
    const candidateTime = candidateWeekStart.getTime();

    if (
      candidateTime < previousWeekStart.getTime() ||
      candidateTime > currentWeekStart.getTime()
    ) {
      return currentDate;
    }

    return candidateDate;
  };

  const goPrev = () => {
    setViewDate((prev) => {
      const candidateDate = movePrev(prev, viewMode);

      if (viewMode !== "week") return candidateDate;

      return clampWeekNavigationDate(candidateDate, prev);
    });
  };

  const goNext = () => {
    setViewDate((prev) => {
      const candidateDate = moveNext(prev, viewMode);

      if (viewMode !== "week") return candidateDate;

      return clampWeekNavigationDate(candidateDate, prev);
    });
  };

  const goToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setViewDate(today);
    return today;
  };

  return {
    viewMode,
    selectedDate,
    viewDate,
    weekDays,
    monthDays,
    toggleViewMode,
    selectDate,
    goPrev,
    goNext,
    goToday,
  };
}
