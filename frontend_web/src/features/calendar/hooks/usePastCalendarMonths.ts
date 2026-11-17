import { startOfMonth, subMonths } from "date-fns";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { getLastSelectableDate } from "@/features/calendar/utils/calendar";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

// 각 달 영역에 붙여 두면, 처음 열 때 이번 달이 화면 아래에 맞춰진다
export const CALENDAR_MONTH_ATTRIBUTE = "data-calendar-month";

export function usePastCalendarMonths() {
  const [currentMonthKey] = useState(() => formatDateKey(startOfMonth(new Date())));
  const [months, setMonths] = useState(() => {
    const currentMonth = parseDateKey(currentMonthKey);
    const pastMonths = [2, 1, 0].map((offset) => formatDateKey(subMonths(currentMonth, offset)));
    // 고를 수 있는 미래 날짜(오늘 포함 7일)가 다음 달로 넘어가면 다음 달도 보여 준다
    const lastSelectableMonthKey = formatDateKey(startOfMonth(getLastSelectableDate()));

    return lastSelectableMonthKey === currentMonthKey
      ? pastMonths
      : [...pastMonths, lastSelectableMonthKey];
  });
  const scrollRef = useRef<HTMLElement>(null);
  const loadOlderRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const previousHeightRef = useRef<number | null>(null);

  const addOlderMonth = useCallback(() => {
    const scroll = scrollRef.current;
    if (!scroll || previousHeightRef.current !== null) return;

    // 기록 유무와 관계없이 달력을 한 달 추가한다. 조회는 연간 범위를 벗어날 때만 늘린다.
    previousHeightRef.current = scroll.scrollHeight;
    setMonths((current) => [
      formatDateKey(subMonths(parseDateKey(current[0]), 1)),
      ...current,
    ]);
  }, []);

  useLayoutEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;

    if (!initializedRef.current) {
      scroll.scrollTop = scroll.scrollHeight;
      // 다음 달까지 있으면 이번 달의 끝이 화면 아래에 오도록 맞춘다
      const currentMonthElement = scroll.querySelector(
        `[${CALENDAR_MONTH_ATTRIBUTE}="${currentMonthKey}"]`,
      );
      if (currentMonthElement && months[months.length - 1] !== currentMonthKey) {
        scroll.scrollTop +=
          currentMonthElement.getBoundingClientRect().bottom -
          scroll.getBoundingClientRect().bottom;
      }
      initializedRef.current = true;
      return;
    }

    if (previousHeightRef.current !== null) {
      // 위에 추가된 높이만큼 이동해 기존에 보고 있던 날짜의 위치를 유지한다.
      scroll.scrollTop += scroll.scrollHeight - previousHeightRef.current;
      previousHeightRef.current = null;
    }
  }, [currentMonthKey, months]);

  useEffect(() => {
    const root = scrollRef.current;
    const target = loadOlderRef.current;
    if (!root || !target || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) addOlderMonth();
      },
      { root, rootMargin: "160px 0px 0px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [addOlderMonth, months.length]);

  return { months, scrollRef, loadOlderRef, addOlderMonth };
}
