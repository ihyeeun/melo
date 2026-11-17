import { type SetStateAction, useState } from "react";

import { getPeriodStart, moveNext, movePrev } from "@/features/calendar/utils/calendar";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

import type { ViewMode } from "../types/calendar.types";

type UseCalendarParams = {
  initialDate?: Date;
  initialViewMode?: ViewMode;
  selectedDate?: Date;
  // 이 날짜가 들어 있는 주 · 달까지만 넘길 수 있다. 없으면 제한하지 않는다
  maxDate?: Date;
};

export function useCalendar({
  initialDate = new Date(),
  initialViewMode = "week",
  selectedDate: controlledSelectedDate,
  maxDate,
}: UseCalendarParams = {}) {
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

  const canMoveTo = (date: Date, mode: typeof viewMode) =>
    !maxDate || getPeriodStart(date, mode).getTime() <= maxDate.getTime();
  const canGoNext = canMoveTo(moveNext(viewDate, viewMode), viewMode);

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

  const goPrev = () => {
    setViewDate((prev) => {
      return movePrev(prev, viewMode);
    });
  };

  const goNext = () => {
    setViewDate((prev) => {
      const candidateDate = moveNext(prev, viewMode);

      return canMoveTo(candidateDate, viewMode) ? candidateDate : prev;
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
    canGoNext,
    toggleViewMode,
    selectDate,
    goPrev,
    goNext,
    goToday,
  };
}
