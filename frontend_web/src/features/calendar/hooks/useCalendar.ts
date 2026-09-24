import { addWeeks, startOfWeek } from "date-fns";
import { type SetStateAction, useState } from "react";

import { moveNext, movePrev } from "@/features/calendar/utils/calendar";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

import type { ViewMode } from "../types/calendar.types";

type UseCalendarParams = {
  initialDate?: Date;
  initialViewMode?: ViewMode;
  selectedDate?: Date;
  allowFutureWeekNavigation?: boolean;
};

export function useCalendar({
  initialDate = new Date(),
  initialViewMode = "week",
  selectedDate: controlledSelectedDate,
  allowFutureWeekNavigation = true,
}: UseCalendarParams = {}) {
  const weekStartsOn = 1 as const;
  const initialSelectedDate = controlledSelectedDate ?? initialDate;
  const controlledSelectedDateKey = controlledSelectedDate
    ? formatDateKey(controlledSelectedDate)
    : null;
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [internalSelectedDate, setInternalSelectedDate] = useState(initialSelectedDate);
  const [viewDateState, setViewDateState] = useState({
    date: initialSelectedDate,
    controlledSelectedDateKey,
  });
  const selectedDate = controlledSelectedDate ?? internalSelectedDate;
  const hasControlledDateChanged =
    controlledSelectedDateKey !== null &&
    controlledSelectedDateKey !== viewDateState.controlledSelectedDateKey;
  const viewDate = hasControlledDateChanged
    ? parseDateKey(controlledSelectedDateKey)
    : viewDateState.date;

  const setViewDate = (nextDate: SetStateAction<Date>) => {
    setViewDateState((previousState) => {
      const currentDate =
        controlledSelectedDateKey !== null &&
        controlledSelectedDateKey !== previousState.controlledSelectedDateKey
          ? parseDateKey(controlledSelectedDateKey)
          : previousState.date;

      return {
        date: typeof nextDate === "function" ? nextDate(currentDate) : nextDate,
        controlledSelectedDateKey,
      };
    });
  };

  const viewWeekStart = startOfWeek(viewDate, { weekStartsOn });
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn });
  const canGoNextWeek =
    allowFutureWeekNavigation || addWeeks(viewWeekStart, 1).getTime() <= currentWeekStart.getTime();

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "week" ? "month" : "week"));
    setViewDate(selectedDate);
  };

  const selectDate = (date: Date) => {
    if (!controlledSelectedDate) {
      setInternalSelectedDate(date);
    }

    setViewDate(date);
  };

  const clampFutureWeekNavigationDate = (candidateDate: Date, currentDate: Date) => {
    const candidateWeekStart = startOfWeek(candidateDate, { weekStartsOn });
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn });

    if (candidateWeekStart.getTime() > currentWeekStart.getTime()) {
      return currentDate;
    }

    return candidateDate;
  };

  const goPrev = () => {
    setViewDate((prev) => {
      return movePrev(prev, viewMode);
    });
  };

  const goNext = () => {
    setViewDate((prev) => {
      const candidateDate = moveNext(prev, viewMode);

      if (viewMode !== "week" || allowFutureWeekNavigation) return candidateDate;

      return clampFutureWeekNavigationDate(candidateDate, prev);
    });
  };

  const goToday = () => {
    const today = new Date();

    if (!controlledSelectedDate) {
      setInternalSelectedDate(today);
    }

    setViewDate(today);
    return today;
  };

  return {
    viewMode,
    selectedDate,
    viewDate,
    setViewMode,
    canGoNextWeek,
    toggleViewMode,
    selectDate,
    goPrev,
    goNext,
    goToday,
  };
}
