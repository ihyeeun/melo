import { startOfWeek, subWeeks } from "date-fns";
import { type SetStateAction, useMemo, useState } from "react";

import {
  buildMonthCalendarDays,
  buildWeekCalendarDays,
  moveNext,
  movePrev,
} from "@/features/calendar/utils/calendar";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

import type { ViewMode } from "../types/calendar.types";

type UseCalendarParams = {
  initialDate?: Date;
  initialViewMode?: ViewMode;
  recordedDates?: string[];
  selectedDate?: Date;
};

type SelectDateOptions = {
  switchToWeek?: boolean;
};

export function useCalendar({
  initialDate = new Date(),
  initialViewMode = "week",
  recordedDates = [],
  selectedDate: controlledSelectedDate,
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
    if (!controlledSelectedDate) {
      setInternalSelectedDate(date);
    }

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
    weekDays,
    monthDays,
    toggleViewMode,
    selectDate,
    goPrev,
    goNext,
    goToday,
  };
}
